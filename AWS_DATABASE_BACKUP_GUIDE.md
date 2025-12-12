# 💾 AWS DATABASE BACKUP GUIDE

## 🎯 **TUJUAN**
Mencegah database ter-reset saat restart atau update di AWS dengan sistem backup otomatis.

---

## 📁 **FILES YANG PERLU DI-BACKUP**

### 1. **Database File** (PENTING!)
- `custom_roles.db` - **File utama yang HARUS di-backup**
- Berisi semua data: user economy, roles, stats, dll

### 2. **Configuration Files** (Optional tapi recommended)
- `.env` - Environment variables (jangan commit ke git!)
- `config.json` - Fallback config (jika masih pakai)

### 3. **Logs** (Optional)
- `logs/` - Application logs
- `backups/` - Local backup files

---

## 🔧 **STRATEGI BACKUP**

### **Option 1: Local Backup + S3 (RECOMMENDED)** ✅

**Keuntungan**:
- Backup lokal untuk quick restore
- Backup S3 untuk disaster recovery
- Automatic cleanup old backups

**Setup**:

1. **Install AWS CLI** (jika belum):
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws configure
```

2. **Setup Environment Variables**:
```bash
# Di .env file
S3_BACKUP_BUCKET=your-backup-bucket-name
AUTO_BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
```

3. **Create S3 Bucket**:
```bash
aws s3 mb s3://warung-mang-ujang-backups
```

4. **Setup Cron Job** (Daily backup):
```bash
# Edit crontab
crontab -e

# Add this line (backup setiap hari jam 2 pagi)
0 2 * * * /path/to/your/project/scripts/backup-db.sh >> /path/to/your/project/logs/backup.log 2>&1
```

### **Option 2: Local Backup Only** (Simple)

**Setup**:
1. Import backup utility di `index.js`:
```javascript
// index.js - Tambahkan di akhir file
const { backupDatabase } = require('./utils/backup.js');

// Auto-backup setiap 24 jam
setInterval(() => {
    backupDatabase();
}, 24 * 60 * 60 * 1000);
```

2. Set environment variable:
```bash
AUTO_BACKUP_ENABLED=true
```

---

## 🚀 **IMPLEMENTASI**

### **Step 1: Update index.js**

Tambahkan di akhir `index.js`:
```javascript
// --- DATABASE BACKUP ---
if (process.env.AUTO_BACKUP_ENABLED === 'true') {
    const { backupDatabase, uploadToS3 } = require('./utils/backup.js');
    
    // Initial backup on startup
    console.log('💾 [BACKUP] Running initial backup...');
    const backupFile = backupDatabase();
    
    // Upload to S3 if configured
    if (backupFile && process.env.S3_BACKUP_BUCKET) {
        uploadToS3(backupFile).catch(err => {
            console.error('❌ [BACKUP] S3 upload failed:', err);
        });
    }
    
    // Schedule daily backup
    const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24') * 60 * 60 * 1000;
    setInterval(() => {
        console.log('💾 [BACKUP] Running scheduled backup...');
        const backupFile = backupDatabase();
        if (backupFile && process.env.S3_BACKUP_BUCKET) {
            uploadToS3(backupFile).catch(err => {
                console.error('❌ [BACKUP] S3 upload failed:', err);
            });
        }
    }, backupInterval);
    
    console.log(`✅ [BACKUP] Auto-backup enabled (every ${process.env.BACKUP_INTERVAL_HOURS || '24'} hours)`);
}
```

### **Step 2: Setup Cron Job (Alternative)**

Jika prefer cron job daripada interval:

```bash
# Make script executable
chmod +x scripts/backup-db.sh

# Add to crontab
crontab -e

# Add this line (backup setiap 6 jam)
0 */6 * * * /home/ubuntu/warung-mang-ujang/scripts/backup-db.sh
```

### **Step 3: Setup S3 Bucket (Optional)**

```bash
# Create bucket
aws s3 mb s3://warung-mang-ujang-backups --region us-east-1

# Setup lifecycle policy (delete backups older than 90 days)
cat > lifecycle.json << EOF
{
    "Rules": [
        {
            "Id": "DeleteOldBackups",
            "Status": "Enabled",
            "Prefix": "backups/",
            "Expiration": {
                "Days": 90
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket warung-mang-ujang-backups \
    --lifecycle-configuration file://lifecycle.json
```

---

## 🔄 **RESTORE DATABASE**

### **From Local Backup**:
```javascript
const { restoreDatabase, listBackups } = require('./utils/backup.js');

// List all backups
const backups = listBackups();
console.log('Available backups:', backups);

// Restore from latest
const latest = backups[0];
if (latest) {
    restoreDatabase(latest.path);
}
```

### **From S3**:
```bash
# List backups in S3
aws s3 ls s3://warung-mang-ujang-backups/backups/

# Download backup
aws s3 cp s3://warung-mang-ujang-backups/backups/custom_roles_2024-01-15_10-30-00.db ./custom_roles_restored.db

# Restore (stop bot first!)
pm2 stop warung-mang-ujang
cp custom_roles_restored.db custom_roles.db
pm2 start warung-mang-ujang
```

---

## 📋 **BACKUP CHECKLIST**

### **Before Deploy**:
- [ ] `utils/backup.js` sudah dibuat ✅
- [ ] `scripts/backup-db.sh` sudah dibuat ✅
- [ ] Environment variables set (`AUTO_BACKUP_ENABLED`, `S3_BACKUP_BUCKET`)
- [ ] S3 bucket created (jika pakai S3)
- [ ] AWS CLI configured (jika pakai S3)
- [ ] Cron job setup (jika pakai cron)

### **After Deploy**:
- [ ] Test backup manual: `node -e "require('./utils/backup.js').backupDatabase()"`
- [ ] Verify backup file created di `backups/` folder
- [ ] Test S3 upload (jika pakai S3)
- [ ] Monitor backup logs
- [ ] Test restore process

---

## 🛡️ **PROTECTION STRATEGY**

### **1. Prevent Database Reset on Restart**

**Problem**: Database bisa ter-reset jika file ter-overwrite

**Solution**:
- ✅ Database file (`custom_roles.db`) **TIDAK** di `.gitignore` (sudah ada ✅)
- ✅ Backup otomatis sebelum update
- ✅ Database file di persistent storage (bukan di `/tmp`)

### **2. Multiple Backup Locations**

**Strategy**:
1. **Local backup** - Quick restore (last 30 backups)
2. **S3 backup** - Disaster recovery (90 days retention)
3. **Manual backup** - Before major updates

### **3. Backup Schedule**

**Recommended**:
- **Every 6 hours** - Untuk production aktif
- **Every 24 hours** - Untuk production normal
- **Before updates** - Manual backup

---

## 🔍 **MONITORING**

### **Check Backup Status**:
```bash
# List local backups
ls -lh backups/

# Check backup script logs
tail -f logs/backup.log

# Check S3 backups
aws s3 ls s3://warung-mang-ujang-backups/backups/ --human-readable
```

### **Verify Backup Integrity**:
```bash
# Check file size (should be similar)
ls -lh custom_roles.db
ls -lh backups/custom_roles_*.db | tail -1
```

---

## ⚠️ **IMPORTANT NOTES**

1. **Database Location**: Pastikan `custom_roles.db` di persistent storage, bukan di `/tmp` atau ephemeral storage
2. **Backup Before Update**: Selalu backup manual sebelum pull update
3. **Test Restore**: Test restore process sebelum production
4. **Monitor Disk Space**: Backup files bisa besar, monitor disk usage
5. **S3 Costs**: S3 storage murah, tapi monitor costs jika banyak backups

---

## 🚨 **EMERGENCY RESTORE**

Jika database corrupt atau ter-reset:

```bash
# 1. Stop bot
pm2 stop warung-mang-ujang

# 2. Find latest backup
ls -t backups/custom_roles_*.db | head -1

# 3. Restore
cp backups/custom_roles_YYYY-MM-DD_HH-MM-SS.db custom_roles.db

# 4. Start bot
pm2 start warung-mang-ujang

# 5. Verify
pm2 logs warung-mang-ujang
```

---

## 📊 **BACKUP RETENTION**

- **Local**: Last 30 backups (auto-cleanup)
- **S3**: 90 days (lifecycle policy)
- **Manual**: Keep important backups forever

---

## ✅ **FINAL CHECKLIST**

Sebelum production:
- [x] Backup utility created
- [x] Backup script created
- [ ] Environment variables configured
- [ ] S3 bucket created (if using S3)
- [ ] Cron job setup (if using cron)
- [ ] Test backup & restore
- [ ] Monitor first backup run

**Status**: ✅ **READY** (setelah setup environment variables dan test)

