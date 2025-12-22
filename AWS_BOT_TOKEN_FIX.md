# 🔧 FIX: BOT_TOKEN Not Found Error

## 🎯 **MASALAH**
Error: `[FATAL] BOT_TOKEN not found in environment or config.json!`

## ✅ **SOLUSI**

### **Di AWS Server:**

```bash
cd ~/warung-mang-ujang

# 1. Cek apakah config.json ada
ls -la config.json

# 2. Cek isi config.json
cat config.json

# 3. Pastikan ada "token" di config.json
nano config.json
```

### **Format config.json yang Benar:**

```json
{
    "token": "YOUR_BOT_TOKEN_HERE",
    "clientId": "YOUR_CLIENT_ID_HERE",
    "logChannelId": "YOUR_LOG_CHANNEL_ID_HERE",
    "requestChannelId": "YOUR_REQUEST_CHANNEL_ID_HERE",
    "stockChannelId": "YOUR_STOCK_CHANNEL_ID_HERE",
    "adminPassword": "YOUR_PASSWORD_HERE",
    "port": 2560,
    "sessionSecret": "YOUR_RANDOM_SECRET_HERE"
}
```

### **Jika config.json Tidak Ada atau Token Kosong:**

```bash
# Backup dulu (jika ada)
cp config.json config.json.backup 2>/dev/null || true

# Buat/edit config.json
nano config.json
```

**Isi dengan token yang benar:**
```json
{
    "token": "YOUR_BOT_TOKEN_HERE",
    "clientId": "YOUR_CLIENT_ID_HERE",
    "logChannelId": "YOUR_LOG_CHANNEL_ID_HERE",
    "requestChannelId": "YOUR_REQUEST_CHANNEL_ID_HERE",
    "stockChannelId": "YOUR_STOCK_CHANNEL_ID_HERE",
    "adminPassword": "YOUR_PASSWORD_HERE",
    "port": 2560,
    "sessionSecret": "YOUR_RANDOM_SECRET_HERE"
}
```

### **Setelah Update:**

```bash
# Restart bot
pm2 restart warung-mang-ujang

# Monitor logs
pm2 logs warung-mang-ujang --lines 20
```

---

## 🔍 **TROUBLESHOOTING**

### **1. Cek Apakah config.json Ada:**
```bash
ls -la ~/warung-mang-ujang/config.json
```

### **2. Cek Isi config.json:**
```bash
cat ~/warung-mang-ujang/config.json
```

### **3. Cek Apakah Token Ada:**
```bash
node -e "try { console.log(require('./config.json').token ? 'Token found' : 'Token empty'); } catch(e) { console.log('Config not found'); }"
```

### **4. Test Read Config:**
```bash
cd ~/warung-mang-ujang
node -e "const c = require('./config.json'); console.log('Token:', c.token ? 'EXISTS' : 'MISSING');"
```

---

## ⚠️ **IMPORTANT**

1. **Jangan commit config.json** dengan real token ke GitHub
2. **Pastikan token valid** (belum expired/revoked)
3. **Cek file permissions** (harus readable)
4. **Restart bot** setelah update config

---

## 🚀 **QUICK FIX**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# Cek config
cat config.json | grep token

# Jika token kosong atau tidak ada, edit:
nano config.json
# Pastikan ada: "token": "YOUR_TOKEN_HERE"

# Restart
pm2 restart warung-mang-ujang
pm2 logs
```

---

## 📋 **CHECKLIST**

- [ ] config.json exists
- [ ] config.json has "token" field
- [ ] Token value is not empty
- [ ] Token is valid (not expired)
- [ ] File permissions OK (readable)
- [ ] Bot restarted after config update

---

## 🔐 **SECURITY NOTE**

**JANGAN**:
- ❌ Commit config.json dengan real token
- ❌ Share config.json di public
- ❌ Hardcode token di code

**LAKUKAN**:
- ✅ Keep config.json di .gitignore
- ✅ Use environment variables untuk production
- ✅ Rotate token jika exposed

