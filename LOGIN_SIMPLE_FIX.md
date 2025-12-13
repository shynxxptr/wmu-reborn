# 🔧 FIX SEDERHANA: Login Masalah

## 🎯 **MASALAH**
Login masih gagal terus, pusing.

## ✅ **SOLUSI SEDERHANA**

### **1. Pastikan Server Running**

```bash
# Di AWS server
pm2 status
pm2 logs warung-mang-ujang --lines 10
```

### **2. Test dengan Curl (Verifikasi Server Bekerja)**

```bash
# Test dari AWS server sendiri
curl -v http://localhost:2560/login

# Test POST login
curl -X POST http://localhost:2560/login \
  -d "password=280103" \
  -c cookies.txt \
  -L -v
```

**Jika curl berhasil tapi browser tidak:**
- Masalahnya di browser (HSTS cache)
- Gunakan incognito mode

### **3. Clear Browser HSTS (WAJIB!)**

**Chrome:**
1. Buka: `chrome://net-internals/#hsts`
2. Delete: `47.129.58.40`
3. Close browser
4. Buka lagi

**Atau gunakan incognito:**
- `Ctrl+Shift+N`
- Ketik: `http://47.129.58.40:2560/login`

### **4. Pastikan URL Benar**

**Ketik manual di address bar:**
```
http://47.129.58.40:2560/login
```

**JANGAN:**
- Klik bookmark/link
- Gunakan `https://`
- Lupa port `:2560`

### **5. Cek Browser Console (F12)**

1. Buka Developer Tools (F12)
2. Tab "Console" - cek error
3. Tab "Network" - cek request ke `/login`
   - Status code?
   - Response?
   - Redirect?

### **6. Test Step by Step**

**Step 1: Test Server**
```bash
curl http://localhost:2560/login
```
Harus return HTML login page.

**Step 2: Test Login**
```bash
curl -X POST http://localhost:2560/login -d "password=280103" -L
```
Harus redirect ke `/admin`.

**Step 3: Test dari Browser**
- Incognito mode
- Ketik manual: `http://47.129.58.40:2560/login`
- Submit form

## 🚀 **QUICK FIX**

```bash
# 1. Di AWS - Restart
pm2 restart warung-mang-ujang

# 2. Test server
curl http://localhost:2560/login

# 3. Di Browser - Incognito
# 4. Ketik: http://47.129.58.40:2560/login
```

## ⚠️ **JIKA MASIH GAGAL**

**Cek server logs:**
```bash
pm2 logs warung-mang-ujang | grep -i "login\|error"
```

**Cek apakah request sampai:**
- Lihat logs saat submit form
- Apakah ada `[LOGIN] POST request received`?

**Jika tidak ada log:**
- Request tidak sampai ke server
- Cek firewall/port

**Jika ada log tapi error:**
- Cek error message di logs
- Fix sesuai error

---

**TL;DR:**
1. Restart bot
2. Clear HSTS cache
3. Incognito mode
4. Ketik manual `http://47.129.58.40:2560/login`


