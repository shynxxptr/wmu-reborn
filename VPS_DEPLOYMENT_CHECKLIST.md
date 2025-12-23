# 🚀 VPS DEPLOYMENT CHECKLIST

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. **Code Quality** ✅
- ✅ No linter errors
- ✅ All bugs fixed
- ✅ Error handling complete
- ✅ Visual enhancements applied
- ✅ All features tested

### 2. **Environment Variables** ✅
- ✅ `.env` support implemented
- ✅ Fallback ke `config.json` untuk backward compatibility
- ✅ All sensitive data menggunakan env vars

### 3. **Dependencies** ✅
- ✅ All dependencies listed in `package.json`
- ✅ PM2 untuk process management
- ✅ Better-sqlite3 untuk database
- ✅ Discord.js v14
- ✅ Express untuk dashboard

### 4. **Database** ✅
- ✅ SQLite database (auto-created)
- ✅ Migration logic untuk new columns
- ✅ Error handling untuk database operations

### 5. **Security** ✅
- ✅ Error handling untuk uncaught exceptions
- ✅ Rate limiting untuk API
- ✅ Session management
- ✅ Input validation

---

## 📋 VPS SETUP STEPS

### **Step 1: Prepare VPS**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install build tools (untuk better-sqlite3)
sudo apt install -y build-essential python3
```

### **Step 2: Clone/Upload Project**
```bash
# Clone dari GitHub (atau upload via SCP/SFTP)
git clone <your-repo-url>
cd warung-mang-ujang

# Install dependencies
npm install
```

### **Step 3: Setup Environment Variables**
```bash
# Buat file .env
nano .env
```

**Isi `.env`:**
```env
# Bot Configuration
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here

# Dashboard Configuration
ADMIN_PASSWORD=your_secure_password_here
SESSION_SECRET=generate_random_secret_here
PORT=2560

# Discord Channel IDs (optional)
LOG_CHANNEL_ID=your_log_channel_id
REQUEST_CHANNEL_ID=your_request_channel_id
STOCK_CHANNEL_ID=your_stock_channel_id

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Step 4: Setup PM2**
```bash
# Buat ecosystem.config.js (jika belum ada)
# Atau gunakan PM2 langsung:

pm2 start index.js --name "warung-bot" --env production
pm2 save
pm2 startup
```

### **Step 5: Setup Firewall**
```bash
# Allow port untuk dashboard (jika perlu akses dari luar)
sudo ufw allow 2560/tcp

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### **Step 6: Setup Nginx (Optional - untuk HTTPS)**
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
    }
}
```

### **Step 7: Test Bot**
```bash
# Check logs
pm2 logs warung-bot

# Check status
pm2 status

# Restart jika perlu
pm2 restart warung-bot
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### **Checklist:**
- ✅ Bot online di Discord
- ✅ Commands berfungsi
- ✅ Database created
- ✅ Dashboard accessible
- ✅ No errors di logs
- ✅ Scheduler running
- ✅ All features working

### **Test Commands:**
```bash
# Di Discord, test:
!cekdompet
!help
!cf 1000
!slots 1000
```

---

## 🛠️ MAINTENANCE COMMANDS

### **PM2 Commands:**
```bash
# View logs
pm2 logs warung-bot

# Restart
pm2 restart warung-bot

# Stop
pm2 stop warung-bot

# Delete
pm2 delete warung-bot

# Monitor
pm2 monit
```

### **Database Backup:**
```bash
# Backup database
cp database.db database.db.backup

# Restore database
cp database.db.backup database.db
```

---

## ⚠️ IMPORTANT NOTES

1. **Database Location:**
   - Database file: `database.db` (di root project)
   - Auto-created saat pertama kali run
   - Backup secara berkala!

2. **Port Configuration:**
   - Default dashboard port: `2560`
   - Bisa diubah via `PORT` env var
   - Pastikan firewall allow port ini

3. **Auto-Restart:**
   - PM2 akan auto-restart jika crash
   - Setup `pm2 startup` untuk auto-start saat server reboot

4. **Logs:**
   - PM2 logs: `pm2 logs`
   - Application logs: Check console output
   - Error logs: Check PM2 error logs

---

## ✅ READY FOR DEPLOYMENT!

**Status:** ✅ **PRODUCTION READY**
**Last Updated:** Sekarang



