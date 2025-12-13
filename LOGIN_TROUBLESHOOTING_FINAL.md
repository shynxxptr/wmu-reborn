# 🔧 TROUBLESHOOTING FINAL: Login Masalah

## 🎯 **LANGKAH DEMI LANGKAH**

### **STEP 1: Verifikasi Server Bekerja**

```bash
# Di AWS server
curl http://localhost:2560/test
```

**Harus return:**
```json
{"status":"OK","message":"Server is working!","protocol":"http",...}
```

**Jika error:**
- Server tidak running
- Port tidak terbuka
- Ada syntax error

### **STEP 2: Test Login dengan Curl**

```bash
# Di AWS server
curl -X POST http://localhost:2560/login \
  -d "password=280103" \
  -c cookies.txt \
  -L -v
```

**Harus:**
- Return 302 redirect
- Redirect ke `/admin`
- Set cookie `admin.sid`

**Jika error:**
- Cek logs: `pm2 logs warung-mang-ujang | grep LOGIN`
- Cek password di config.json

### **STEP 3: Clear Browser HSTS (WAJIB!)**

**Chrome:**
```
1. Buka: chrome://net-internals/#hsts
2. Delete: 47.129.58.40
3. Close browser COMPLETELY
4. Buka lagi
```

**Atau gunakan incognito:**
- `Ctrl+Shift+N`
- Ketik: `http://47.129.58.40:2560/test`
- Harus return JSON

### **STEP 4: Test di Browser**

1. **Incognito mode** (`Ctrl+Shift+N`)
2. **Ketik manual:** `http://47.129.58.40:2560/test`
   - Harus return JSON `{"status":"OK"...}`
3. **Ketik manual:** `http://47.129.58.40:2560/login`
   - Harus muncul form login
4. **Submit form** dengan password: `280103`
   - Harus redirect ke `/admin`

## 🔍 **JIKA MASIH GAGAL**

### **Cek Server Logs:**

```bash
pm2 logs warung-mang-ujang | grep -i "login\|error\|test"
```

**Yang harus muncul saat login:**
```
[LOGIN] POST request received
[LOGIN] IP: xxx.xxx.xxx.xxx
[LOGIN] Body: { password: '280103' }
[LOGIN] Processing login attempt
[LOGIN] Password provided: Yes
[LOGIN] Password match: true
[LOGIN] Success - Setting session and redirecting immediately
[LOGIN] Redirecting to: http://47.129.58.40:2560/admin
```

### **Jika Tidak Ada Log:**

**Request tidak sampai ke server:**
- Cek firewall: `sudo ufw status`
- Cek port: `sudo netstat -tulpn | grep 2560`
- Cek server: `pm2 status`

### **Jika Ada Log Tapi Error:**

**Cek error message di logs:**
- Password salah? → Cek config.json
- Session error? → Cek session config
- Rate limit? → Tunggu 15 menit atau restart

### **Jika Log OK Tapi Browser Error:**

**Masalah di browser:**
- HSTS cache masih ada → Clear lagi
- Browser extension memaksa HTTPS → Disable extension
- ISP/proxy redirect → Gunakan VPN

## 🚀 **SOLUSI TERAKHIR**

Jika semua sudah dicoba tapi masih gagal:

### **Option 1: Gunakan Browser Lain**

- Chrome → Firefox
- Atau sebaliknya

### **Option 2: Gunakan VPN**

- ISP mungkin redirect ke HTTPS
- Gunakan VPN untuk bypass

### **Option 3: Setup HTTPS (Jika Memungkinkan)**

- Setup reverse proxy (Nginx) dengan SSL
- Atau gunakan Cloudflare SSL

### **Option 4: Akses dari Server Sendiri**

```bash
# Di AWS server
curl http://localhost:2560/login
# Copy HTML output
# Buka di browser lokal
```

## 📋 **CHECKLIST FINAL**

- [ ] Server running (`pm2 status`)
- [ ] Test endpoint bekerja (`/test` return JSON)
- [ ] Curl login berhasil (redirect ke `/admin`)
- [ ] HSTS cache sudah di-clear
- [ ] Incognito mode digunakan
- [ ] URL manual dengan `http://`
- [ ] Password benar (`280103`)
- [ ] Port 2560 terbuka
- [ ] Firewall allow port 2560
- [ ] Tidak ada browser extension yang block

## ⚠️ **IMPORTANT**

**Jika curl berhasil tapi browser tidak:**
- 100% masalah di browser (HSTS cache)
- Gunakan incognito mode
- Atau clear HSTS cache

**Jika curl juga gagal:**
- Masalah di server
- Cek logs untuk error
- Fix sesuai error

---

**Test endpoint `/test` untuk verifikasi server bekerja!**



