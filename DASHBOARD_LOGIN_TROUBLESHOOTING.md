# 🔧 DASHBOARD LOGIN TROUBLESHOOTING

## 🎯 **MASALAH**
Tidak bisa login ke dashboard.

## ✅ **SOLUSI**

### **1. Cek Password di config.json**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# Cek password di config.json
cat config.json | grep adminPassword
```

**Password harus**: `"280103"` (tanpa quotes di JSON)

### **2. Cek Session Cookie Issue**

**Masalah**: Cookie `secure: true` butuh HTTPS, tapi mungkin tidak pakai HTTPS.

**Fix**: Code sudah di-update untuk set `secure: false` (akan work dengan HTTP).

### **3. Cek Rate Limiting**

Jika terlalu banyak attempt, akan di-block 15 menit.

**Reset rate limit**:
```bash
# Restart bot (akan reset rate limit)
pm2 restart warung-mang-ujang
```

### **4. Clear Browser Cookies**

- Clear cookies untuk domain dashboard
- Atau gunakan incognito/private mode
- Atau clear semua cookies browser

### **5. Test Login dengan Curl**

```bash
# Di AWS server
curl -X POST http://localhost:2560/login \
  -d "password=280103" \
  -c cookies.txt \
  -L

# Check response
cat cookies.txt
```

---

## 🔍 **DEBUGGING**

### **Cek Logs untuk Error:**

```bash
# PM2 logs
pm2 logs warung-mang-ujang | grep -i "login\|error\|session"

# Check if password loaded correctly
pm2 logs warung-mang-ujang | grep -i "CONFIG\|password"
```

### **Test Password Match:**

```bash
# Di AWS server
cd ~/warung-mang-ujang
node -e "const c = require('./config.json'); console.log('Password:', c.adminPassword); console.log('Match test:', '280103' === c.adminPassword);"
```

### **Check Session:**

```bash
# Test session creation
curl -X POST http://localhost:2560/login \
  -d "password=280103" \
  -v 2>&1 | grep -i "set-cookie\|session"
```

---

## 🛠️ **COMMON FIXES**

### **Fix 1: Password Tidak Match**

```bash
# Pastikan password di config.json benar
nano config.json
# Pastikan: "adminPassword": "280103" (tanpa spasi, tanpa quotes di value)
```

### **Fix 2: Cookie Secure Issue**

Code sudah di-update untuk set `secure: false`. Restart bot:

```bash
pm2 restart warung-mang-ujang
```

### **Fix 3: Rate Limit Blocked**

Tunggu 15 menit atau restart bot:

```bash
pm2 restart warung-mang-ujang
```

### **Fix 4: Session Not Saving**

Clear browser cookies dan coba lagi.

---

## 📋 **CHECKLIST**

- [ ] Password di config.json benar: `"280103"`
- [ ] Bot sudah di-restart setelah update config
- [ ] Browser cookies sudah di-clear
- [ ] Tidak ada rate limit block
- [ ] Port dashboard benar (2560)
- [ ] Session cookie bisa disimpan

---

## 🚀 **QUICK FIX**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# 1. Verify password
cat config.json | grep adminPassword

# 2. Restart bot
pm2 restart warung-mang-ujang

# 3. Test login
curl -X POST http://localhost:2560/login -d "password=280103" -v
```

---

## ⚠️ **IMPORTANT**

1. **Password case-sensitive**: `280103` harus exact match
2. **No spaces**: Pastikan tidak ada spasi di awal/akhir password
3. **Clear cookies**: Jika masih tidak bisa, clear browser cookies
4. **Rate limit**: Max 5 attempts per 15 minutes

---

## 🔐 **PASSWORD YANG BENAR**

Dari config.json:
- **Password**: `280103`
- **Tidak ada spasi**
- **Case-sensitive**

Coba login dengan password: **280103**

