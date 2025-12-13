# 🔧 DEBUG: Login Timeout Issue

## 🎯 **MASALAH**
Login stuck di "Memproses..." dan muncul timeout setelah 10 detik.

## 🔍 **KEMUNGKINAN PENYEBAB**

### **1. Request Tidak Sampai ke Server**
- Firewall memblokir port 2560
- Server tidak running
- Network issue

### **2. Rate Limiter Terlalu Ketat**
- Sudah diubah dari 5 menjadi 10 attempts per 15 menit
- Handler sudah ditambahkan untuk error message yang lebih jelas

### **3. Session Save Issue**
- Sudah diubah ke `resave: true` dan `saveUninitialized: true`
- Redirect langsung tanpa menunggu callback

### **4. Body Parser Issue**
- Sudah dikonfirmasi ada: `bodyParser.urlencoded({ extended: true })`

## ✅ **YANG SUDAH DIPERBAIKI**

1. ✅ **Logging lebih detail** - Setiap step login akan di-log
2. ✅ **Rate limiter handler** - Error message lebih jelas
3. ✅ **Session config** - `resave: true` untuk auto-save
4. ✅ **Direct redirect** - Tidak menunggu callback

## 🔍 **CARA DEBUG**

### **1. Cek Server Logs**

```bash
# Di AWS server
pm2 logs warung-mang-ujang | grep LOGIN
```

**Yang harus muncul:**
```
[LOGIN] POST request received
[LOGIN] IP: xxx.xxx.xxx.xxx
[LOGIN] Body: { password: '280103' }
[LOGIN] Processing login attempt
[LOGIN] Password provided: Yes
[LOGIN] Expected password: 280103
[LOGIN] Password match: true
[LOGIN] Success - Setting session and redirecting immediately
```

**Jika tidak muncul:**
- Request tidak sampai ke server
- Cek firewall/port

### **2. Test dengan Curl**

```bash
# Test dari local machine
curl -X POST http://47.129.58.40:2560/login \
  -d "password=280103" \
  -v \
  -L

# Test dari AWS server sendiri
curl -X POST http://localhost:2560/login \
  -d "password=280103" \
  -v \
  -L
```

### **3. Cek Port & Firewall**

```bash
# Di AWS server
# Cek apakah port terbuka
sudo netstat -tulpn | grep 2560

# Cek firewall
sudo ufw status
sudo ufw allow 2560/tcp

# Test port dari luar
# Dari local machine
telnet 47.129.58.40 2560
```

### **4. Cek Server Status**

```bash
# Di AWS server
pm2 status
pm2 logs warung-mang-ujang --lines 50
pm2 restart warung-mang-ujang
```

### **5. Cek Browser Network Tab**

1. Buka browser Developer Tools (F12)
2. Tab "Network"
3. Submit login form
4. Cek request ke `/login`:
   - Status code?
   - Response?
   - Time?

## 🚀 **QUICK FIX**

### **Jika Request Tidak Sampai:**

1. **Cek firewall:**
```bash
sudo ufw allow 2560/tcp
sudo ufw reload
```

2. **Cek server running:**
```bash
pm2 restart warung-mang-ujang
pm2 logs warung-mang-ujang
```

3. **Test dari server sendiri:**
```bash
curl -X POST http://localhost:2560/login -d "password=280103" -v
```

### **Jika Request Sampai Tapi Timeout:**

1. **Cek logs untuk error:**
```bash
pm2 logs warung-mang-ujang | grep -i error
```

2. **Cek session store:**
```bash
# Session disimpan di memory (default)
# Tidak ada file yang perlu dicek
```

3. **Restart server:**
```bash
pm2 restart warung-mang-ujang
```

## 📋 **CHECKLIST**

- [ ] Server running (`pm2 status`)
- [ ] Port 2560 terbuka (`netstat -tulpn | grep 2560`)
- [ ] Firewall allow port 2560 (`ufw allow 2560/tcp`)
- [ ] Request sampai ke server (cek logs)
- [ ] Password benar (`280103`)
- [ ] Tidak ada rate limit block
- [ ] Browser tidak block request

## ⚠️ **IMPORTANT**

Jika setelah semua fix masih timeout:
1. **Cek server logs** - Apakah request sampai?
2. **Test dengan curl** - Apakah server merespons?
3. **Cek firewall** - Apakah port terbuka?
4. **Cek network** - Apakah ada masalah koneksi?

---

**Next Step**: Cek server logs untuk melihat apakah request sampai ke server!



