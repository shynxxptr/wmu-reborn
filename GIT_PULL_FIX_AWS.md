# 🔧 FIX: Git Pull Error di AWS

## 🎯 **MASALAH**
```
error: Your local changes to the following files would be overwritten by merge:
    package-lock.json
Please commit your changes or stash them before you merge.
```

## ✅ **SOLUSI**

### **Option 1: Stash Changes (Recommended)**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# Stash local changes
git stash

# Pull updates
git pull --no-rebase

# Jika perlu, apply stashed changes kembali
# git stash pop
```

### **Option 2: Discard Local Changes (Jika tidak penting)**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# Discard changes di package-lock.json
git checkout -- package-lock.json

# Pull updates
git pull --no-rebase
```

### **Option 3: Commit Changes (Jika ingin keep changes)**

```bash
# Di AWS server
cd ~/warung-mang-ujang

# Commit changes
git add package-lock.json
git commit -m "Update package-lock.json"

# Pull updates (akan create merge commit)
git pull --no-rebase
```

## 🚀 **QUICK FIX (Recommended)**

```bash
# Di AWS server
cd ~/warung-mang-ujang
git stash
git pull --no-rebase
pm2 restart warung-mang-ujang
```

## ⚠️ **CATATAN**

- `package-lock.json` biasanya auto-generated, jadi aman untuk discard
- Stash adalah cara teraman jika tidak yakin
- Setelah pull, restart bot untuk apply changes


