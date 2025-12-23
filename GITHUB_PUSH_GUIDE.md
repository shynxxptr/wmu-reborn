# 🚀 GITHUB PUSH GUIDE - REPOSITORY BARU

## 📋 LANGKAH-LANGKAH PUSH KE REPOSITORY BARU

### **Step 1: Buat Repository Baru di GitHub**

1. Buka https://github.com/new
2. Isi informasi:
   - **Repository name:** `warung-mang-ujang` (atau nama lain yang diinginkan)
   - **Description:** `Discord Bot - Warung Mang Ujang Economy & Gambling Bot`
   - **Visibility:** Private atau Public (sesuai kebutuhan)
   - **JANGAN** centang "Initialize with README" (karena kita sudah punya code)
3. Klik **"Create repository"**

### **Step 2: Setup Git Remote Baru**

Setelah repository dibuat, GitHub akan memberikan URL. Copy URL tersebut, lalu jalankan command berikut:

```bash
# Hapus remote lama (jika ada)
git remote remove origin

# Tambahkan remote baru
git remote add origin https://github.com/USERNAME/REPOSITORY-NAME.git

# Atau jika pakai SSH:
# git remote add origin git@github.com:USERNAME/REPOSITORY-NAME.git

# Cek remote
git remote -v
```

### **Step 3: Commit Semua Perubahan (jika belum)**

```bash
# Cek status
git status

# Add semua file
git add .

# Commit
git commit -m "Initial commit - Warung Mang Ujang Bot v2.5"

# Atau jika sudah ada commit sebelumnya, skip langkah ini
```

### **Step 4: Push ke Repository Baru**

```bash
# Push ke branch main (atau master)
git branch -M main
git push -u origin main

# Jika ada error tentang branch, coba:
# git push -u origin main --force
# (HATI-HATI: --force akan overwrite remote, pastikan repository baru kosong)
```

---

## 🔧 ALTERNATIVE: Script Otomatis

Saya sudah membuat script `setup_new_repo.bat` untuk Windows yang akan membantu setup repository baru.

---

## ⚠️ PENTING

### **Sebelum Push:**
- ✅ Pastikan tidak ada file sensitif (`.env`, `config.json` dengan token) yang di-commit
- ✅ Pastikan `.gitignore` sudah ada dan benar
- ✅ Pastikan semua file penting sudah di-commit

### **File yang HARUS di .gitignore:**
```
.env
config.json
database.db
database.db-journal
node_modules/
*.log
.DS_Store
```

---

## 📝 SETUP REMOTE BARU (Manual)

Jika ingin setup manual, ikuti langkah berikut:

1. **Buat repository di GitHub** (Step 1 di atas)

2. **Hapus remote lama:**
   ```bash
   git remote remove origin
   ```

3. **Tambahkan remote baru:**
   ```bash
   git remote add origin https://github.com/USERNAME/REPOSITORY-NAME.git
   ```

4. **Push:**
   ```bash
   git push -u origin main
   ```

---

## ✅ VERIFIKASI

Setelah push berhasil:
- ✅ Cek di GitHub: https://github.com/USERNAME/REPOSITORY-NAME
- ✅ Pastikan semua file sudah ter-upload
- ✅ Pastikan `.env` dan `config.json` TIDAK ter-upload

---

## 🎉 SELESAI!

Repository baru sudah siap dan code sudah ter-push!



