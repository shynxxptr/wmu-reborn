# 🔒 Panduan Setup SSL Certificate untuk HTTPS

## 🎯 **OPSI SETUP SSL**

Ada 3 cara untuk setup SSL certificate:

### **1. Let's Encrypt (GRATIS - RECOMMENDED)** ⭐
- Certificate gratis, auto-renewal
- Cocok untuk production
- Perlu domain name

### **2. Self-Signed Certificate (DEVELOPMENT)**
- Untuk testing lokal
- Browser akan warning (tapi bisa di-ignore)
- Tidak cocok untuk production

### **3. Reverse Proxy dengan Nginx (PRODUCTION)**
- Nginx handle SSL, forward ke Node.js
- Lebih aman dan performant
- Recommended untuk production

---

## 🚀 **OPTION 1: Let's Encrypt (Certbot)**

### **Prerequisites:**
- Domain name sudah pointing ke server IP
- Port 80 dan 443 terbuka di firewall
- Server bisa diakses dari internet

### **Step 1: Install Certbot**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### **Step 2: Generate Certificate**

```bash
# Ganti dengan domain Anda
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Atau jika pakai Nginx:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### **Step 3: Certificate Location**

Certificate akan disimpan di:
```
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### **Step 4: Update config.json**

```json
{
    "port": 443,
    "ssl": {
        "enabled": true,
        "cert": "/etc/letsencrypt/live/yourdomain.com/fullchain.pem",
        "key": "/etc/letsencrypt/live/yourdomain.com/privkey.pem"
    }
}
```

### **Step 5: Set Permissions**

```bash
# Node.js perlu read access ke certificate
sudo chmod 644 /etc/letsencrypt/live/yourdomain.com/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Atau add user ke ssl-cert group
sudo usermod -a -G ssl-cert $USER
```

### **Step 6: Auto-Renewal**

Let's Encrypt certificate expire setiap 90 hari. Setup auto-renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Setup cron job (auto-renewal)
sudo crontab -e
# Tambahkan:
0 0 * * * certbot renew --quiet && pm2 restart warung-mang-ujang
```

---

## 🧪 **OPTION 2: Self-Signed Certificate (Development)**

### **Step 1: Generate Self-Signed Certificate**

```bash
# Buat directory untuk certificate
mkdir -p ssl

# Generate certificate (valid 365 hari)
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -days 365 \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=Warung Mang Ujang/CN=localhost"
```

### **Step 2: Update config.json**

```json
{
    "port": 443,
    "ssl": {
        "enabled": true,
        "cert": "./ssl/cert.pem",
        "key": "./ssl/key.pem"
    }
}
```

### **Step 3: Access dengan HTTPS**

```
https://localhost:443/admin
```

**Note:** Browser akan warning "Not Secure" - ini normal untuk self-signed. Klik "Advanced" → "Proceed to localhost".

---

## 🌐 **OPTION 3: Reverse Proxy dengan Nginx (RECOMMENDED untuk Production)**

### **Step 1: Install Nginx**

```bash
sudo apt update
sudo apt install nginx
```

### **Step 2: Setup SSL dengan Certbot**

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### **Step 3: Configure Nginx**

Edit `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate (auto-configured by certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy to Node.js (running on port 80 atau 3000)
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Step 4: Test & Reload Nginx**

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### **Step 5: Update Node.js Config**

Node.js tetap running di port 80 (atau port lain), Nginx handle SSL di port 443.

```json
{
    "port": 80
}
```

**Keuntungan:**
- Nginx handle SSL termination
- Node.js tidak perlu handle SSL
- Lebih performant
- Auto-renewal certificate via certbot

---

## ⚙️ **KONFIGURASI DI CODE**

### **Update config.json:**

```json
{
    "token": "YOUR_TOKEN",
    "clientId": "YOUR_CLIENT_ID",
    "port": 443,
    "ssl": {
        "enabled": true,
        "cert": "/etc/letsencrypt/live/yourdomain.com/fullchain.pem",
        "key": "/etc/letsencrypt/live/yourdomain.com/privkey.pem"
    },
    "adminPassword": "YOUR_PASSWORD",
    "sessionSecret": "YOUR_SECRET"
}
```

### **Environment Variables (Alternative):**

```bash
export PORT=443
export SSL_ENABLED=true
export SSL_CERT=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
export SSL_KEY=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

---

## 🔥 **FIREWALL CONFIGURATION**

### **Open Port 443 (HTTPS):**

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 443/tcp
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Check status
sudo ufw status
# atau
sudo firewall-cmd --list-all
```

---

## ✅ **VERIFY SSL SETUP**

### **1. Test dengan curl:**

```bash
# Test HTTPS
curl -v https://yourdomain.com/admin

# Test dengan certificate validation
curl -v https://yourdomain.com/admin --cacert /etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

### **2. Test di Browser:**

```
https://yourdomain.com/admin
```

Harus muncul gembok hijau (secure connection).

### **3. Check Certificate Info:**

```bash
openssl s_client -connect yourdomain.com:443 -showcerts
```

---

## 🔄 **AUTO-RENEWAL SETUP (Let's Encrypt)**

### **Method 1: Cron Job**

```bash
sudo crontab -e

# Tambahkan (renew setiap hari jam 00:00)
0 0 * * * certbot renew --quiet && systemctl reload nginx
```

### **Method 2: Systemd Timer (Better)**

```bash
# Check existing timer
systemctl list-timers | grep certbot

# Certbot sudah include systemd timer, enable:
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 🐛 **TROUBLESHOOTING**

### **Error: EACCES (Permission Denied)**

```bash
# Port 443 butuh root/admin access
# Solusi: Run dengan sudo atau gunakan reverse proxy

# Atau set capabilities (Linux)
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

### **Error: Certificate Not Found**

```bash
# Check certificate exists
ls -la /etc/letsencrypt/live/yourdomain.com/

# Check permissions
sudo chmod 644 /etc/letsencrypt/live/yourdomain.com/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### **Error: Domain Not Resolving**

```bash
# Check DNS
nslookup yourdomain.com

# Check domain pointing ke server IP
dig yourdomain.com +short
```

### **Browser Warning: "Not Secure"**

- **Self-signed:** Normal, klik "Advanced" → "Proceed"
- **Let's Encrypt:** Check certificate valid dan domain match
- **Mixed Content:** Pastikan semua resource pakai HTTPS

---

## 📋 **CHECKLIST**

- [ ] Domain sudah pointing ke server IP
- [ ] Port 80 dan 443 terbuka di firewall
- [ ] Certificate sudah di-generate (Let's Encrypt atau self-signed)
- [ ] config.json sudah di-update dengan SSL config
- [ ] Permissions certificate sudah benar
- [ ] Server sudah restart
- [ ] HTTPS bisa diakses di browser
- [ ] Auto-renewal sudah di-setup (untuk Let's Encrypt)

---

## 🚀 **QUICK START (Let's Encrypt)**

```bash
# 1. Install certbot
sudo apt install certbot

# 2. Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# 3. Update config.json
# Tambahkan:
#   "port": 443,
#   "ssl": { "enabled": true, "cert": "...", "key": "..." }

# 4. Restart
pm2 restart warung-mang-ujang

# 5. Test
curl https://yourdomain.com/admin
```

---

## ⚠️ **IMPORTANT NOTES**

1. **Port 443 butuh root/admin access** - Gunakan reverse proxy (Nginx) untuk production
2. **Let's Encrypt certificate expire setiap 90 hari** - Setup auto-renewal
3. **Self-signed hanya untuk development** - Jangan pakai di production
4. **Domain name wajib untuk Let's Encrypt** - IP address tidak bisa
5. **Backup certificate** - Jangan sampai hilang private key

---

## 📚 **REFERENCES**

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Node.js HTTPS Module](https://nodejs.org/api/https.html)

