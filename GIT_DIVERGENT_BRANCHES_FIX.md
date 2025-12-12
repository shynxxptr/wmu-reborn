# 🔧 FIX: Git Divergent Branches di AWS

## 🎯 **MASALAH**
Git pull gagal karena local branch dan remote branch punya commit yang berbeda (divergent branches).

## ✅ **SOLUSI**

### **Option 1: Merge (RECOMMENDED untuk Production)** ✅

**Aman untuk production, tidak akan kehilangan data:**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# Cek status dulu
git status

# Lihat commit yang berbeda
git log --oneline --graph --all -10

# Backup database dulu (PENTING!)
node -e "require('./utils/backup.js').backupDatabase()"
# ATAU
cp custom_roles.db custom_roles.db.backup

# Pull dengan merge strategy
git pull --no-rebase

# Jika ada conflict, resolve dulu, lalu:
git add .
git commit -m "Merge remote changes"
```

### **Option 2: Rebase (⚠️ TIDAK DISARANKAN untuk Production)**

**⚠️ WARNING: Rebase berbahaya untuk production!**
- Bisa overwrite local changes
- Rewrite history (sulit rollback)
- Risk data loss tinggi

**Hanya pakai jika:**
- Local changes benar-benar tidak penting
- Yakin tidak ada database/config changes
- Development branch, bukan production

```bash
# Backup dulu!
cp custom_roles.db custom_roles.db.backup

# Stash local changes (jika ada)
git stash

# Pull dengan rebase (RISKY!)
git pull --rebase

# Apply stashed changes (jika ada)
git stash pop
```

**⚠️ REKOMENDASI: Jangan pakai rebase di production!**

### **Option 3: Force Pull (HAPUS local changes, pakai remote)**

**⚠️ WARNING: Ini akan HAPUS semua local changes!**

```bash
# BACKUP DATABASE DULU!
cp custom_roles.db custom_roles.db.backup

# Reset ke remote
git fetch origin
git reset --hard origin/master

# Restore database jika perlu
# cp custom_roles.db.backup custom_roles.db
```

---

## ⚠️ **PENTING: JANGAN PAKAI REBASE di Production!**

**Rebase TIDAK AMAN untuk production karena:**
- Bisa overwrite local changes (termasuk database modifications)
- Rewrite history (sulit rollback)
- Risk data loss tinggi

**PAKAI MERGE untuk production** (lebih aman, preserve semua data)

---

## 🛡️ **REKOMENDASI UNTUK PRODUCTION**

### **Step-by-Step Aman (PAKAI MERGE):**

1. **Backup Database DULU**:
```bash
cd ~/warung-mang-ujang
node -e "require('./utils/backup.js').backupDatabase()"
# ATAU manual
cp custom_roles.db custom_roles.db.backup-$(date +%Y%m%d_%H%M%S)
```

2. **Cek Apa yang Berbeda**:
```bash
git fetch origin
git log HEAD..origin/master --oneline  # Remote commits
git log origin/master..HEAD --oneline  # Local commits
```

3. **Jika Local Changes Tidak Penting** (misalnya hanya config.json):
```bash
# Stash atau discard local changes
git stash
# ATAU
git checkout -- config.json .env

# Pull dengan merge
git pull --no-rebase
```

4. **Jika Local Changes Penting** (misalnya ada perubahan di code):
```bash
# Pull dengan merge (akan create merge commit)
git pull --no-rebase

# Jika ada conflict, resolve:
# - Edit files yang conflict
# - git add .
# - git commit -m "Merge remote changes"
```

5. **Set Default Strategy** (untuk next time):
```bash
# Set default ke merge (aman untuk production)
git config pull.rebase false
```

6. **Restart Bot**:
```bash
pm2 restart warung-mang-ujang
pm2 logs
```

---

## 🔍 **DIAGNOSIS**

Cek dulu apa yang berbeda:

```bash
# Cek status
git status

# Lihat commit history
git log --oneline --graph --all -10

# Lihat files yang berbeda
git diff HEAD origin/master --name-only

# Lihat perubahan di file tertentu
git diff HEAD origin/master -- path/to/file
```

---

## ⚠️ **IMPORTANT NOTES**

1. **SELALU BACKUP DATABASE DULU** sebelum pull!
2. **Jangan force push** di production
3. **Cek perubahan** sebelum merge
4. **Test setelah merge** sebelum restart bot

---

## 🚀 **QUICK FIX (Jika Yakin)**

Jika yakin local changes tidak penting dan mau pakai remote version:

```bash
# Backup database
cp custom_roles.db custom_roles.db.backup

# Set default strategy
git config pull.rebase false

# Pull dengan merge
git pull --no-rebase

# Restart
pm2 restart warung-mang-ujang
```

---

## 📋 **CHECKLIST**

- [ ] Backup database (`custom_roles.db`)
- [ ] Cek git status
- [ ] Cek apa yang berbeda (local vs remote)
- [ ] Pilih strategy (merge/rebase/force)
- [ ] Pull dengan strategy yang dipilih
- [ ] Resolve conflicts (jika ada)
- [ ] Test bot
- [ ] Restart dengan PM2
- [ ] Monitor logs

---

## 🆘 **EMERGENCY ROLLBACK**

Jika setelah pull ada masalah:

```bash
# Stop bot
pm2 stop warung-mang-ujang

# Rollback git
git reset --hard HEAD~1
# ATAU ke commit sebelumnya
git reset --hard <commit-hash>

# Restore database jika perlu
cp custom_roles.db.backup custom_roles.db

# Start bot
pm2 start warung-mang-ujang
```

