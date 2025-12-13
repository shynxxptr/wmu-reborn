# 🔧 FIX: ERR_SSL_PROTOCOL_ERROR

## 🎯 **MASALAH**
Error `ERR_SSL_PROTOCOL_ERROR` muncul karena browser mencoba mengakses dengan **HTTPS**, padahal server hanya support **HTTP**.

## ✅ **SOLUSI**

### **1. Pastikan Mengakses dengan HTTP (Bukan HTTPS)**

**URL yang BENAR:**
```
http://47.129.58.40:2560/login
```

**URL yang SALAH:**
```
https://47.129.58.40:2560/login  ❌
```

### **2. Clear Browser Cache & Cookies**

1. Tekan `Ctrl+Shift+Delete` (Windows) atau `Cmd+Shift+Delete` (Mac)
2. Pilih "Cookies and other site data"
3. Clear semua cookies untuk domain `47.129.58.40`
4. Reload halaman

### **3. Gunakan Incognito/Private Mode**

- Tekan `Ctrl+Shift+N` (Chrome) atau `Ctrl+Shift+P` (Firefox)
- Akses: `http://47.129.58.40:2560/login`

### **4. Disable Auto-HTTPS di Browser**

**Chrome:**
1. Buka `chrome://flags/`
2. Cari "HTTPS-Only Mode"
3. Set ke "Disabled"
4. Restart browser

**Firefox:**
1. Buka `about:config`
2. Cari `dom.security.https_only_mode`
3. Set ke `false`

### **5. Force HTTP di Address Bar**

Jika browser auto-redirect ke HTTPS:
- Ketik manual: `http://47.129.58.40:2560/login`
- Jangan klik link yang sudah tersimpan (bisa jadi HTTPS)

### **6. Cek Server Logs**

```bash
# Di AWS server
pm2 logs warung-mang-ujang | grep LOGIN
```

Pastikan tidak ada error di server.

---

## 🔍 **TROUBLESHOOTING**

### **Test dengan Curl:**

```bash
# Test HTTP (harus berhasil)
curl -v http://47.129.58.40:2560/login

# Test HTTPS (akan gagal, ini normal)
curl -v https://47.129.58.40:2560/login
```

### **Cek Port di Firewall:**

```bash
# Pastikan port 2560 terbuka
sudo ufw status
sudo ufw allow 2560/tcp
```

### **Cek Server Running:**

```bash
# Pastikan server running
pm2 status
pm2 logs warung-mang-ujang --lines 20
```

---

## ✅ **CHECKLIST**

- [ ] Mengakses dengan `http://` (bukan `https://`)
- [ ] Port 2560 sudah benar
- [ ] Browser cache sudah di-clear
- [ ] Server sudah running
- [ ] Firewall port 2560 sudah terbuka
- [ ] Tidak ada auto-redirect ke HTTPS

---

## 🚀 **QUICK FIX**

1. **Buka browser baru (incognito)**
2. **Ketik manual:** `http://47.129.58.40:2560/login`
3. **Jangan gunakan HTTPS!**
4. **Login dengan password:** `280103`

---

## ⚠️ **IMPORTANT**

Server **TIDAK support HTTPS**. Jika butuh HTTPS:
1. Setup reverse proxy (Nginx) dengan SSL certificate
2. Atau gunakan Cloudflare SSL
3. Atau setup Let's Encrypt certificate

Untuk sekarang, **gunakan HTTP saja**.



