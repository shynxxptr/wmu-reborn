# 🔧 UPDATE CONFIG.JSON di AWS

## 🎯 **MASALAH**
AWS masih pakai `config.json` (belum pakai `.env`), jadi perlu update `config.json` untuk include PORT.

## ✅ **SOLUSI**

### **Di AWS Server, Update config.json:**

```bash
cd ~/warung-mang-ujang

# Edit config.json
nano config.json
```

**Tambahkan 2 baris ini di config.json:**

```json
{
    "token": "YOUR_TOKEN",
    "clientId": "YOUR_CLIENT_ID",
    "logChannelId": "YOUR_LOG_CHANNEL_ID",
    "requestChannelId": "YOUR_REQUEST_CHANNEL_ID",
    "stockChannelId": "YOUR_STOCK_CHANNEL_ID",
    "adminPassword": "YOUR_PASSWORD",
    "port": 2560,
    "sessionSecret": "generate_random_secret_here"
}
```

**Generate random sessionSecret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy hasilnya ke `sessionSecret` di config.json.

### **Atau Update via Command:**

```bash
# Backup config.json dulu
cp config.json config.json.backup

# Update dengan sed (jika di Linux)
sed -i 's/"adminPassword": ".*"/"adminPassword": "warungmangujang2025",\n    "port": 2560,\n    "sessionSecret": "YOUR_RANDOM_SECRET"/' config.json

# ATAU edit manual dengan nano
nano config.json
```

### **Setelah Update:**

```bash
# Restart bot
pm2 restart warung-mang-ujang

# Verify
pm2 logs warung-mang-ujang | grep "WEB ADMIN"
```

Harus muncul:
```
🌐 [WEB ADMIN] Online di http://localhost:2560
```

---

## 📋 **CONFIG.JSON TEMPLATE**

**Format lengkap:**

```json
{
    "token": "YOUR_BOT_TOKEN",
    "clientId": "YOUR_CLIENT_ID",
    "logChannelId": "YOUR_LOG_CHANNEL_ID",
    "requestChannelId": "YOUR_REQUEST_CHANNEL_ID",
    "stockChannelId": "YOUR_STOCK_CHANNEL_ID",
    "adminPassword": "YOUR_ADMIN_PASSWORD",
    "port": 2560,
    "sessionSecret": "RANDOM_32_BYTE_HEX_STRING"
}
```

---

## 🔐 **GENERATE SESSION SECRET**

```bash
# Di AWS server
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy hasilnya ke `sessionSecret` di config.json.

---

## ✅ **CHECKLIST**

- [ ] Backup config.json: `cp config.json config.json.backup`
- [ ] Edit config.json: `nano config.json`
- [ ] Tambahkan `"port": 2560`
- [ ] Generate dan tambahkan `"sessionSecret"`
- [ ] Save file (Ctrl+X, Y, Enter)
- [ ] Restart bot: `pm2 restart warung-mang-ujang`
- [ ] Verify port: `pm2 logs | grep "WEB ADMIN"`

---

## 🚀 **QUICK COMMAND**

```bash
# Generate secret
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update config.json (backup dulu!)
cp config.json config.json.backup

# Edit manual dengan nano
nano config.json
# Tambahkan:
#   "port": 2560,
#   "sessionSecret": "<paste SECRET di sini>"

# Restart
pm2 restart warung-mang-ujang
```

---

## ⚠️ **IMPORTANT**

1. **Jangan commit config.json** dengan real values ke GitHub
2. **Backup dulu** sebelum edit
3. **Generate sessionSecret** yang unik (jangan pakai contoh)
4. **Restart bot** setelah update

---

## 📝 **NOTES**

Code sudah di-update untuk read PORT dari:
1. `process.env.PORT` (priority 1)
2. `config.port` atau `config.PORT` (priority 2)
3. Default `2560` (fallback)

Jadi sekarang bisa pakai config.json untuk set PORT!

