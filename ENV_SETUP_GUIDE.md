# 📝 ENV SETUP GUIDE - Warung Mang Ujang : Reborn

## 🎯 CONTOH FILE .env

Berikut adalah contoh lengkap file `.env` untuk bot:

---

## 📄 CONTOH .env FILE

```env
# ========================================
# Warung Mang Ujang : Reborn Bot
# Environment Variables Configuration
# ========================================

# ========================================
# BOT CONFIGURATION (WAJIB)
# ========================================
# Discord Bot Token - Dapatkan dari https://discord.com/developers/applications
BOT_TOKEN=your_discord_bot_token_here

# Discord Client ID - Sama seperti di Developer Portal
CLIENT_ID=your_discord_client_id_here

# ========================================
# DASHBOARD CONFIGURATION
# ========================================
# Password untuk login dashboard admin
ADMIN_PASSWORD=your_secure_password_here

# Secret untuk session (generate random string)
# Generate dengan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=generate_random_secret_string_here

# Port untuk dashboard web (default: 2560)
PORT=2560

# ========================================
# DISCORD CHANNEL IDs (OPSIONAL)
# ========================================
# Channel ID untuk logs bot
LOG_CHANNEL_ID=1234567890123456789

# Channel ID untuk request/permintaan
REQUEST_CHANNEL_ID=1234567890123456789

# Channel ID untuk stock/saham
STOCK_CHANNEL_ID=1234567890123456789

# ========================================
# ENVIRONMENT SETTINGS
# ========================================
# Environment mode: production atau development
NODE_ENV=production

# Log level: info, debug, error
LOG_LEVEL=info

# ========================================
# DATABASE BACKUP (OPSIONAL)
# ========================================
# Enable auto backup (true/false)
AUTO_BACKUP_ENABLED=false

# Interval backup dalam jam (default: 24)
BACKUP_INTERVAL_HOURS=24

# S3 Bucket untuk backup (jika menggunakan AWS S3)
S3_BACKUP_BUCKET=

# ========================================
# SSL/HTTPS CONFIGURATION (OPSIONAL)
# ========================================
# Enable SSL/HTTPS (true/false)
SSL_ENABLED=false

# Path ke SSL certificate file (jika SSL_ENABLED=true)
SSL_CERT=/path/to/cert.pem

# Path ke SSL private key file (jika SSL_ENABLED=true)
SSL_KEY=/path/to/key.pem
```

---

## 🚀 QUICK SETUP

### **1. Buat file .env:**
```bash
# Di Windows (PowerShell)
Copy-Item ENV_EXAMPLE.txt .env

# Di Linux/Mac
cp ENV_EXAMPLE.txt .env
```

### **2. Edit file .env:**
```bash
# Windows
notepad .env

# Linux/Mac
nano .env
```

### **3. Isi dengan nilai yang benar:**
- `BOT_TOKEN` - Token bot Discord (WAJIB)
- `CLIENT_ID` - Client ID bot (WAJIB)
- `ADMIN_PASSWORD` - Password untuk dashboard
- `SESSION_SECRET` - Generate random string

### **4. Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📋 VARIABEL YANG DIPERLUKAN

### **WAJIB:**
- ✅ `BOT_TOKEN` - Discord Bot Token
- ✅ `CLIENT_ID` - Discord Client ID

### **RECOMMENDED:**
- ✅ `ADMIN_PASSWORD` - Password dashboard
- ✅ `SESSION_SECRET` - Session secret
- ✅ `PORT` - Port dashboard (default: 2560)
- ✅ `NODE_ENV` - Environment (production/development)

### **OPSIONAL:**
- `LOG_CHANNEL_ID` - Channel untuk logs
- `REQUEST_CHANNEL_ID` - Channel untuk requests
- `STOCK_CHANNEL_ID` - Channel untuk stock
- `AUTO_BACKUP_ENABLED` - Enable auto backup
- `BACKUP_INTERVAL_HOURS` - Interval backup
- `S3_BACKUP_BUCKET` - S3 bucket untuk backup
- `SSL_ENABLED` - Enable SSL/HTTPS
- `SSL_CERT` - SSL certificate path
- `SSL_KEY` - SSL private key path

---

## 💡 CONTOH MINIMAL (Hanya yang Wajib)

Jika hanya ingin setup minimal, cukup isi ini:

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
ADMIN_PASSWORD=your_password
SESSION_SECRET=random_secret_string
PORT=2560
NODE_ENV=production
```

---

## ✅ VERIFIKASI

Setelah setup, test apakah .env terbaca:

```bash
# Test read .env
node -e "require('dotenv').config(); console.log('Token:', process.env.BOT_TOKEN ? 'EXISTS' : 'MISSING');"
```

---

## 🔐 SECURITY NOTES

- ✅ File `.env` sudah di `.gitignore` (tidak akan ter-commit)
- ✅ Jangan share file `.env` dengan real token
- ✅ Rotate token jika exposed
- ✅ Generate `SESSION_SECRET` yang random dan kuat

---

## 🎉 SELESAI!

Bot siap dijalankan dengan konfigurasi `.env`!

