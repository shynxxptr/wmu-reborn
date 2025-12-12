# 🚨 PRE-AWS DEPLOY CHECKLIST - KRUSIAL!

**Status**: ⚠️ **PERLU PERBAIKAN SEBELUM DEPLOY**

---

## 🔴 **KRITIS - HARUS DIPERBAIKI SEBELUM DEPLOY**

### 1. **SECURITY - Environment Variables** 🔴🔴🔴
**Masalah**: Token, password, dan secret hardcoded di `config.json`

**Risiko**: 
- Token bot bisa di-expose di GitHub
- Admin password bisa di-expose
- Session secret tidak secure

**Fix Required**:
```javascript
// Ganti dari:
const { token } = require('./config.json');

// Menjadi:
const token = process.env.BOT_TOKEN || require('./config.json').token;
```

**Files yang perlu diubah**:
- `index.js` - BOT_TOKEN
- `dashboard/server.js` - ADMIN_PASSWORD, SESSION_SECRET, PORT
- `deploy-commands.js` - BOT_TOKEN, CLIENT_ID

**Action**: 
1. Buat `.env.example` file
2. Update semua files untuk read dari `process.env`
3. Pastikan `.env` di `.gitignore` (sudah ada ✅)

---

### 2. **SECURITY - Session Secret** 🔴🔴
**Masalah**: Session secret hardcoded `'alice_secret_key'`

**Risiko**: Session bisa di-hijack

**Fix Required**:
```javascript
// dashboard/server.js line 16
secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
```

---

### 3. **SECURITY - Dashboard Port** 🔴
**Masalah**: Port hardcoded `2560`

**Fix Required**:
```javascript
// dashboard/server.js line 11
const PORT = process.env.PORT || 2560;
```

---

### 4. **ERROR HANDLING - Uncaught Exceptions** 🔴🔴
**Masalah**: No global error handler

**Risiko**: Bot bisa crash tanpa restart

**Fix Required**:
```javascript
// index.js - Tambahkan di akhir file
process.on('uncaughtException', (error) => {
    console.error('❌ [FATAL] Uncaught Exception:', error);
    // Log to file or monitoring service
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [FATAL] Unhandled Rejection:', reason);
    // Log to file or monitoring service
});
```

---

### 5. **HEALTH CHECK ENDPOINT** 🔴
**Masalah**: No health check untuk monitoring

**Fix Required**:
```javascript
// dashboard/server.js - Tambahkan sebelum app.listen
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        timestamp: Date.now(),
        database: db ? 'connected' : 'disconnected'
    });
});
```

---

### 6. **RATE LIMITING - Dashboard** 🔴
**Masalah**: No rate limiting untuk API endpoints

**Risiko**: Brute force attack, DDoS

**Fix Required**:
```bash
npm install express-rate-limit
```

```javascript
// dashboard/server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);

// Stricter for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5 // 5 attempts per 15 minutes
});

app.use('/login', loginLimiter);
```

---

## 🟡 **PENTING - HIGHLY RECOMMENDED**

### 7. **SECURITY HEADERS** 🟡
**Fix Required**:
```bash
npm install helmet
```

```javascript
// dashboard/server.js
const helmet = require('helmet');
app.use(helmet());
```

---

### 8. **LOGGING SYSTEM** 🟡
**Masalah**: Console.log everywhere, no structured logging

**Fix Required**:
```bash
npm install winston
```

```javascript
// utils/logger.js (create new)
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

module.exports = logger;
```

---

### 9. **DATABASE BACKUP** 🟡
**Masalah**: No automatic backup strategy

**Fix Required**:
```javascript
// utils/backup.js (create new)
const fs = require('fs');
const path = require('path');
const db = require('../database.js');

function backupDatabase() {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `database-${timestamp}.db`);
    
    // Copy database file
    const dbFile = path.join(__dirname, '../bot.db');
    fs.copyFileSync(dbFile, backupFile);
    
    console.log(`✅ [BACKUP] Database backed up to ${backupFile}`);
    return backupFile;
}

// Run daily backup
setInterval(() => {
    backupDatabase();
}, 24 * 60 * 60 * 1000); // 24 hours

module.exports = { backupDatabase };
```

---

### 10. **PROCESS MANAGER** 🟡
**Masalah**: No process manager untuk auto-restart

**Fix Required**:
```bash
npm install pm2 --save-dev
```

**Create `ecosystem.config.js`**:
```javascript
module.exports = {
    apps: [{
        name: 'warung-mang-ujang',
        script: 'index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            BOT_TOKEN: process.env.BOT_TOKEN,
            ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
            SESSION_SECRET: process.env.SESSION_SECRET,
            PORT: process.env.PORT || 2560
        },
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }]
};
```

**Start command**:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🟢 **NICE TO HAVE**

### 11. **CORS Configuration** 🟢
Jika perlu akses dari domain lain

### 12. **Database Connection Pooling** 🟢
Better-sqlite3 tidak perlu, tapi bisa optimize

### 13. **Monitoring & Alerts** 🟢
Integrate dengan monitoring service (Sentry, etc.)

---

## 📋 **QUICK FIX CHECKLIST**

### Before Deploy:
- [ ] **Create `.env` file** dengan semua secrets
- [ ] **Update `index.js`** untuk read BOT_TOKEN dari env
- [ ] **Update `dashboard/server.js`** untuk read ADMIN_PASSWORD, SESSION_SECRET, PORT dari env
- [ ] **Add global error handlers** di `index.js`
- [ ] **Add health check endpoint** di dashboard
- [ ] **Add rate limiting** untuk dashboard APIs
- [ ] **Add security headers** (helmet)
- [ ] **Test semua fitur** dengan environment variables
- [ ] **Update `.gitignore`** pastikan `.env` ada
- [ ] **Create `.env.example`** untuk dokumentasi

### Optional (Recommended):
- [ ] **Setup logging system** (winston)
- [ ] **Setup database backup** (automatic)
- [ ] **Setup PM2** untuk process management
- [ ] **Test di staging environment** dulu

---

## 🚀 **DEPLOYMENT STEPS**

1. **Setup Environment Variables di AWS**:
   ```bash
   export BOT_TOKEN="your_token_here"
   export ADMIN_PASSWORD="your_password_here"
   export SESSION_SECRET="random_secret_here"
   export PORT=2560
   export NODE_ENV=production
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   npm install express-rate-limit helmet --save
   ```

3. **Start dengan PM2**:
   ```bash
   pm2 start ecosystem.config.js
   ```

4. **Monitor**:
   ```bash
   pm2 logs
   pm2 status
   ```

---

## ⚠️ **WARNING**

**JANGAN PUSH KE GITHUB:**
- ❌ `config.json` dengan real token
- ❌ `.env` file
- ❌ Database files (`.db`)
- ❌ Log files

**PASTIKAN:**
- ✅ `.gitignore` sudah benar
- ✅ `config.example.json` ada (tanpa real values)
- ✅ `.env.example` ada (tanpa real values)

---

## 📝 **FILES YANG PERLU DIBUAT/UPDATE**

### New Files:
1. `.env.example` - Template untuk environment variables
2. `ecosystem.config.js` - PM2 configuration
3. `utils/logger.js` - Winston logger (optional)
4. `utils/backup.js` - Database backup (optional)

### Files to Update:
1. `index.js` - Add error handlers, read from env
2. `dashboard/server.js` - Read from env, add rate limiting, helmet, health check
3. `deploy-commands.js` - Read from env
4. `.gitignore` - Verify semua sensitive files ada

---

## ✅ **PRIORITY ORDER**

1. **MUST DO** (Before Deploy):
   - Environment variables untuk secrets
   - Global error handlers
   - Health check endpoint
   - Rate limiting

2. **SHOULD DO** (Before Production):
   - Security headers (helmet)
   - Logging system
   - Database backup
   - PM2 setup

3. **NICE TO HAVE**:
   - Monitoring integration
   - Advanced logging
   - Performance optimization

---

## 🎯 **FINAL CHECK**

Sebelum pull ke AWS, pastikan:
- [x] No hardcoded secrets
- [x] Error handling in place
- [x] Security measures (rate limiting, headers)
- [x] Health check available
- [x] Process manager ready (PM2)
- [x] Backup strategy in place
- [x] Logging configured
- [x] All tests passed

**Status**: ⚠️ **PERLU PERBAIKAN SEBELUM DEPLOY**

