# 🔧 SOLUSI LENGKAP: Force HTTP (Fix HTTPS Redirect)

## 🎯 **MASALAH**
Browser masih memaksa HTTPS meskipun server hanya support HTTP, menyebabkan `ERR_SSL_PROTOCOL_ERROR`.

## ✅ **SOLUSI LENGKAP**

### **1. Clear HSTS Cache di Browser (WAJIB!)**

**Chrome:**
```
1. Buka: chrome://net-internals/#hsts
2. Scroll ke "Delete domain security policies"
3. Masukkan: 47.129.58.40
4. Klik "Delete"
5. Juga masukkan: localhost (jika pernah pakai)
6. Klik "Delete"
7. Close dan buka browser lagi
```

**Firefox:**
```
1. Buka: about:config
2. Cari: security.tls.insecure_fallback_hosts
3. Klik "String" → Add
4. Masukkan: 47.129.58.40
5. Reload browser
```

**Edge:**
```
1. Buka: edge://net-internals/#hsts
2. Sama seperti Chrome
```

### **2. Gunakan Incognito/Private Mode**

- **Chrome**: `Ctrl+Shift+N`
- **Firefox**: `Ctrl+Shift+P`
- **Edge**: `Ctrl+Shift+N`

Ketik manual: `http://47.129.58.40:2560/login`

### **3. Pastikan URL Benar**

**URL YANG BENAR:**
```
http://47.129.58.40:2560/login
```

**URL YANG SALAH:**
```
https://47.129.58.40:2560/login  ❌
47.129.58.40:2560/login  ❌ (browser akan auto-add https://)
```

### **4. Restart Bot dengan Update Terbaru**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# Stash local changes
git stash

# Pull updates
git pull --no-rebase

# Restart bot
pm2 restart warung-mang-ujang

# Cek logs
pm2 logs warung-mang-ujang --lines 20
```

### **5. Test dengan Curl (Verifikasi Server)**

```bash
# Test dari AWS server sendiri
curl -v http://localhost:2560/login

# Test dari local machine
curl -v http://47.129.58.40:2560/login
```

### **6. Cek Browser Console (F12)**

1. Buka Developer Tools (F12)
2. Tab "Console"
3. Cek apakah ada error JavaScript
4. Tab "Network"
5. Cek request ke `/login` - apakah pakai HTTP atau HTTPS?

### **7. Alternative: Gunakan IP Langsung**

Jika masih tidak bisa, coba akses dengan IP langsung:
```
http://47.129.58.40:2560/login
```

Jangan gunakan domain jika ada.

## 🔍 **TROUBLESHOOTING**

### **Jika Masih Error SSL:**

1. **Cek apakah benar-benar pakai HTTP:**
   - Lihat di address bar browser
   - Harus ada `http://` di awal
   - Jangan `https://`

2. **Clear semua browser data:**
   - Settings → Privacy → Clear browsing data
   - Pilih "All time"
   - Clear cookies, cache, HSTS

3. **Coba browser lain:**
   - Chrome → Firefox
   - Atau sebaliknya

4. **Cek server logs:**
   ```bash
   pm2 logs warung-mang-ujang | grep LOGIN
   ```

### **Jika Request Tidak Sampai:**

1. **Cek firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 2560/tcp
   ```

2. **Cek port terbuka:**
   ```bash
   sudo netstat -tulpn | grep 2560
   ```

3. **Test dari server sendiri:**
   ```bash
   curl http://localhost:2560/login
   ```

## ⚠️ **IMPORTANT**

**HSTS Cache adalah masalah utama!**

Browser menyimpan HSTS policy di cache, jadi meskipun server sudah di-fix, browser masih memaksa HTTPS.

**Solusi:**
1. **Clear HSTS cache** (WAJIB!)
2. **Gunakan incognito mode** (bypass HSTS)
3. **Ketik manual `http://`** (jangan klik link)

## 🚀 **QUICK FIX**

```bash
# 1. Di AWS - Restart bot
pm2 restart warung-mang-ujang

# 2. Di Browser - Clear HSTS
# Chrome: chrome://net-internals/#hsts
# Delete: 47.129.58.40

# 3. Buka incognito mode
# 4. Ketik manual: http://47.129.58.40:2560/login
```

---

**Jika masih tidak bisa setelah semua langkah di atas, kemungkinan ada masalah dengan:**
- Network/firewall
- Browser extension yang memaksa HTTPS
- ISP/proxy yang redirect ke HTTPS

