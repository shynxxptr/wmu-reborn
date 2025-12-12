# 🚀 AWS DEPLOY INSTRUCTIONS

## ✅ **PERUBAHAN YANG SUDAH DILAKUKAN**

### 1. **Environment Variables Support** ✅
- `index.js` - Sekarang read BOT_TOKEN dari `process.env.BOT_TOKEN` (fallback ke config.json)
- `dashboard/server.js` - Read ADMIN_PASSWORD, SESSION_SECRET, PORT dari env
- `.env.example` - Template file sudah dibuat

### 2. **Security Improvements** ✅
- Session secret sekarang random atau dari env
- Rate limiting untuk API endpoints (100 req/15min)
- Rate limiting untuk login (5 attempts/15min)
- Security headers dengan Helmet
- Secure cookies (httpOnly, secure in production)

### 3. **Error Handling** ✅
- Global error handlers untuk uncaught exceptions
- Global error handlers untuk unhandled rejections

### 4. **Health Check** ✅
- `/health` endpoint untuk monitoring

### 5. **PM2 Configuration** ✅
- `ecosystem.config.js` sudah dibuat

---

## 📋 **SEBELUM DEPLOY KE AWS**

### Step 1: Install Dependencies Baru
```bash
npm install dotenv express-rate-limit helmet
npm install --save-dev pm2
```

### Step 2: Buat File `.env` di Server
```bash
# Di AWS server, buat file .env
nano .env
```

**Isi `.env`**:
```env
# Bot Configuration
BOT_TOKEN=your_actual_bot_token_here
CLIENT_ID=your_client_id_here

# Dashboard Configuration
ADMIN_PASSWORD=your_secure_password_here
SESSION_SECRET=generate_random_secret_here
PORT=2560

# Discord Channel IDs
LOG_CHANNEL_ID=your_log_channel_id
REQUEST_CHANNEL_ID=your_request_channel_id
STOCK_CHANNEL_ID=your_stock_channel_id

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

**Generate SESSION_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Update ecosystem.config.js
Edit `ecosystem.config.js` dan tambahkan env variables:
```javascript
env: {
    NODE_ENV: 'production',
    BOT_TOKEN: process.env.BOT_TOKEN,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
    PORT: process.env.PORT || 2560
}
```

**ATAU** lebih baik, set environment variables di system level:
```bash
export BOT_TOKEN="your_token"
export ADMIN_PASSWORD="your_password"
export SESSION_SECRET="your_secret"
export PORT=2560
export NODE_ENV=production
```

### Step 4: Test Locally Dulu
```bash
# Set environment variables
export BOT_TOKEN="your_token"
export ADMIN_PASSWORD="test_password"

# Test run
node index.js
```

### Step 5: Deploy dengan PM2
```bash
# Install PM2 globally (jika belum)
npm install -g pm2

# Start dengan PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 untuk auto-start on reboot
pm2 startup
# (Follow instructions yang muncul)

# Monitor
pm2 logs
pm2 status
```

---

## 🔒 **SECURITY CHECKLIST**

Sebelum deploy, pastikan:
- [ ] `.env` file **TIDAK** di-commit ke GitHub
- [ ] `.gitignore` sudah include `.env` ✅
- [ ] `config.json` dengan real token **TIDAK** di-commit
- [ ] `SESSION_SECRET` menggunakan random value
- [ ] `ADMIN_PASSWORD` kuat (min 12 karakter)
- [ ] Dashboard hanya accessible via HTTPS (setup reverse proxy)
- [ ] Firewall configured (only allow necessary ports)

---

## 🌐 **REVERSE PROXY SETUP (Nginx)**

Jika perlu akses dashboard dari internet:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:2560;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📊 **MONITORING**

### Health Check
```bash
curl http://localhost:2560/health
```

### PM2 Monitoring
```bash
pm2 monit
```

### Logs
```bash
# PM2 logs
pm2 logs warung-mang-ujang

# Application logs (jika ada)
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 🔄 **UPDATE PROCESS**

Saat ada update baru:

```bash
# Pull latest code
git pull

# Install new dependencies (jika ada)
npm install

# Restart PM2
pm2 restart warung-mang-ujang

# Check status
pm2 status
pm2 logs
```

---

## ⚠️ **TROUBLESHOOTING**

### Bot tidak connect
1. Check BOT_TOKEN di `.env`
2. Check logs: `pm2 logs warung-mang-ujang`
3. Check network connectivity

### Dashboard tidak bisa diakses
1. Check PORT di `.env`
2. Check firewall: `sudo ufw status`
3. Check PM2: `pm2 status`
4. Check health: `curl http://localhost:2560/health`

### Rate limit error
- Normal jika terlalu banyak request
- Tunggu 15 menit atau adjust di `dashboard/server.js`

---

## 📝 **NOTES**

1. **dotenv package**: Optional, bisa juga set env variables langsung di system
2. **PM2**: Recommended untuk production, auto-restart on crash
3. **HTTPS**: Setup SSL certificate untuk production (Let's Encrypt)
4. **Backup**: Setup automatic database backup (cron job)
5. **Monitoring**: Consider using monitoring service (Sentry, etc.)

---

## ✅ **FINAL CHECKLIST**

Sebelum go-live:
- [ ] Environment variables set di server
- [ ] Dependencies installed (`npm install`)
- [ ] PM2 configured dan running
- [ ] Health check working (`/health`)
- [ ] Bot connected to Discord
- [ ] Dashboard accessible
- [ ] Security measures in place
- [ ] Backup strategy ready
- [ ] Monitoring setup

**Status**: ✅ **READY FOR DEPLOY** (setelah setup environment variables)

