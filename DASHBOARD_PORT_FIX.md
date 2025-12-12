# 🔧 FIX: Dashboard Port Setting

## 🎯 **MASALAH**
Dashboard masih running di port 8080, padahal seharusnya 2560.

## ✅ **SOLUSI**

### **Option 1: Set Environment Variable (RECOMMENDED)**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# Set PORT di .env file
echo "PORT=2560" >> .env

# ATAU edit .env file
nano .env
# Tambahkan: PORT=2560

# Restart bot
pm2 restart warung-mang-ujang
pm2 logs
```

### **Option 2: Set di System Environment**

```bash
# Set untuk current session
export PORT=2560

# Set permanent (tambah ke ~/.bashrc)
echo 'export PORT=2560' >> ~/.bashrc
source ~/.bashrc

# Restart bot
pm2 restart warung-mang-ujang
```

### **Option 3: Set di PM2 Ecosystem**

Edit `ecosystem.config.js`:

```javascript
env: {
    NODE_ENV: 'production',
    PORT: 2560,  // Tambahkan ini
    BOT_TOKEN: process.env.BOT_TOKEN,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET
}
```

Lalu restart:
```bash
pm2 delete warung-mang-ujang
pm2 start ecosystem.config.js
pm2 save
```

---

## 🔍 **VERIFY**

Setelah restart, cek logs:

```bash
pm2 logs warung-mang-ujang | grep "WEB ADMIN"
```

Harus muncul:
```
🌐 [WEB ADMIN] Online di http://localhost:2560
```

---

## 🌐 **ACCESS DASHBOARD**

Setelah port benar:

1. **Local (di server)**:
   ```bash
   curl http://localhost:2560/health
   ```

2. **Remote (dari komputer lain)**:
   - Setup port forwarding atau reverse proxy
   - Atau akses via SSH tunnel:
   ```bash
   ssh -L 2560:localhost:2560 ubuntu@your-aws-ip
   ```
   Lalu buka browser: `http://localhost:2560`

---

## ⚠️ **FIREWALL**

Pastikan port 2560 terbuka:

```bash
# Check firewall
sudo ufw status

# Allow port 2560 (jika perlu)
sudo ufw allow 2560/tcp
sudo ufw reload
```

---

## 📋 **QUICK FIX**

```bash
# 1. Set PORT
echo "PORT=2560" >> ~/warung-mang-ujang/.env

# 2. Restart
pm2 restart warung-mang-ujang

# 3. Verify
pm2 logs warung-mang-ujang --lines 20
```

