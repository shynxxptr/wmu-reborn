# ⚙️ CONFIGURATION GUIDE - Warung Mang Ujang : Reborn

## 📋 CARA KONFIGURASI BOT

Bot ini mendukung **2 cara konfigurasi**:

1. **`.env` file** (✅ **RECOMMENDED** untuk production)
2. **`config.json`** (Fallback untuk backward compatibility)

---

## 🎯 OPSI 1: Menggunakan .env (RECOMMENDED)

### **Langkah-langkah:**

1. **Copy file example:**
   ```bash
   # Windows
   Copy-Item ENV_EXAMPLE.txt .env
   
   # Linux/Mac
   cp ENV_EXAMPLE.txt .env
   ```

2. **Edit file `.env`:**
   ```bash
   # Windows
   notepad .env
   
   # Linux/Mac
   nano .env
   ```

3. **Isi dengan nilai yang benar:**
   ```env
   # WAJIB
   BOT_TOKEN=your_actual_bot_token
   CLIENT_ID=your_client_id
   
   # RECOMMENDED
   ADMIN_PASSWORD=your_secure_password
   SESSION_SECRET=random_secret_string
   PORT=2560
   NODE_ENV=production
   
   # OPSIONAL
   LOG_CHANNEL_ID=your_log_channel_id
   REQUEST_CHANNEL_ID=your_request_channel_id
   STOCK_CHANNEL_ID=your_stock_channel_id
   AUTO_BACKUP_ENABLED=false
   BACKUP_INTERVAL_HOURS=24
   ```

4. **Generate SESSION_SECRET (jika belum):**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Save dan restart bot**

### **Keuntungan .env:**
- ✅ Lebih aman (tidak ter-commit ke git)
- ✅ Best practice untuk production
- ✅ Mudah di-manage di VPS/server
- ✅ Support environment variables

---

## 🎯 OPSI 2: Menggunakan config.json (Fallback)

### **Langkah-langkah:**

1. **Copy file example:**
   ```bash
   cp config.json.example config.json
   ```

2. **Edit file `config.json`:**
   ```bash
   nano config.json
   # atau
   notepad config.json
   ```

3. **Isi dengan nilai yang benar:**
   ```json
   {
       "token": "your_actual_bot_token",
       "clientId": "your_client_id",
       "adminPassword": "your_secure_password",
       "sessionSecret": "random_secret_string",
       "port": 2560
   }
   ```

4. **Save dan restart bot**

### **Catatan:**
- ⚠️ File `config.json` sudah di `.gitignore` (tidak akan ter-commit)
- ⚠️ Jangan commit file ini dengan real token!

---

## 🔄 PRIORITAS KONFIGURASI

Bot akan membaca konfigurasi dengan urutan berikut:

1. **`.env` file** (prioritas pertama)
2. **`config.json`** (fallback jika .env tidak ada)

**Contoh:**
- Jika `.env` ada dan `BOT_TOKEN` di-set → Pakai dari `.env`
- Jika `.env` tidak ada tapi `config.json` ada → Pakai dari `config.json`
- Jika keduanya tidak ada → Bot akan error dan exit

---

## 📝 VARIABEL YANG DIPERLUKAN

### **Wajib:**
- `BOT_TOKEN` - Discord Bot Token
- `CLIENT_ID` - Discord Client ID (untuk dashboard)

### **Opsional:**
- `ADMIN_PASSWORD` - Password untuk dashboard admin
- `SESSION_SECRET` - Secret untuk session (generate random)
- `PORT` - Port untuk dashboard (default: 2560)
- `LOG_CHANNEL_ID` - Channel ID untuk logs
- `REQUEST_CHANNEL_ID` - Channel ID untuk requests
- `STOCK_CHANNEL_ID` - Channel ID untuk stock
- `NODE_ENV` - Environment (production/development)
- `AUTO_BACKUP_ENABLED` - Enable auto backup (true/false)
- `BACKUP_INTERVAL_HOURS` - Interval backup (default: 24)
- `S3_BACKUP_BUCKET` - S3 bucket untuk backup

---

## 🔐 SECURITY NOTES

### **JANGAN:**
- ❌ Commit `.env` atau `config.json` dengan real token
- ❌ Share file konfigurasi di public
- ❌ Hardcode token di code

### **LAKUKAN:**
- ✅ Keep `.env` dan `config.json` di `.gitignore`
- ✅ Use `.env` untuk production (lebih aman)
- ✅ Rotate token jika exposed
- ✅ Generate random `SESSION_SECRET`

---

## 🚀 QUICK SETUP

### **Untuk Development:**
```bash
# Copy example
cp .env.example .env

# Edit .env
nano .env

# Fill in BOT_TOKEN and other values
# Save and run
node index.js
```

### **Untuk Production (VPS):**
```bash
# Copy example
cp .env.example .env

# Edit .env
nano .env

# Fill in all required values
# Save and run with PM2
pm2 start index.js --name "warung-bot"
```

---

## ✅ VERIFIKASI

Setelah setup, cek apakah konfigurasi benar:

```bash
# Test read config
node -e "require('dotenv').config(); console.log('Token:', process.env.BOT_TOKEN ? 'EXISTS' : 'MISSING');"
```

---

## 🎉 SELESAI!

Bot siap dijalankan dengan konfigurasi yang benar!

