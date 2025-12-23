# 🛡️ DAFTAR COMMAND ADMIN

## 📋 SLASH COMMANDS (Discord Slash Commands)

### 👤 **User Management**
- `/add-admin <user>` - Tambah admin baru ke bot
- `/remove-admin <user>` - Hapus admin dari bot
- `/list-admins` - Lihat daftar semua admin bot

### 🔧 **Game & Economy**
- `/set-luck <user> <value>` - Set penalti luck untuk user (untuk wealth limiter)
- `/config-penalty` - Atur batas auto-penalty untuk wealth limiter
- `/admin-panel` - Panel admin untuk kelola Role & Stok tiket

### 📦 **Inventory & Sales**
- `/give-ticket <user> <jenis> <jumlah>` - Kirim tiket ke user
  - Jenis: `1d`, `3d`, `7d`, `10d`, `30d`, `tiket_gradasi`, `kartu_ubah`, `ticket_box`
- `/check-all <user>` - Cek seluruh inventaris user (semua tiket yang dimiliki)
- `/create-flashsale` - Buat flash sale event
- `/revoke-ticket <user> <jenis> <jumlah>` - Cabut tiket dari user

### 🎁 **Giveaway & Bansos**
- `/giveaway` - Buat giveaway event
- `/bansos` - Berikan bansos (bantuan sosial) ke user

### ⚙️ **System & Setup**
- `/admin-help` - Menampilkan daftar command admin
- `/setup-shop` - Pasang panel toko (Kantin Sekolah)
- `/setup-panel` - Pasang panel role manager
- `/test-welcome` - Simulasi welcome message

---

## 💬 PREFIX COMMANDS (`!`)

### 📢 **Announcement**
- `!announce` - Kirim announcement embed lengkap dengan tombol interaktif
- `!announcesimple` - Kirim announcement sederhana tanpa tombol

### 💰 **Compensation System**
- `!compensate @user <package>` - Set compensation package untuk user
  - Packages: `starter`, `base`, `premium`
- `!compensatebulk <package>` - Set compensation untuk semua user yang belum claim

### 🧪 **Testing**
- `!testall` - Test semua fitur bot (admin only)

### 📊 **Help**
- `!adminhelp` atau `!admin` - Menampilkan daftar lengkap command admin

---

## 🔐 **PERMISSION REQUIREMENTS**

### **Bot Admin** (via `/add-admin`)
- Semua slash commands di atas
- Semua prefix commands di atas
- Akses dashboard admin di: `http://your-server:port/admin`

### **Discord Administrator** (Discord Permission)
- Beberapa command memerlukan permission `Administrator` di Discord server
- Command seperti `!say`, dll

---

## 📝 **CATATAN PENTING**

1. **Bot Admin vs Discord Admin:**
   - Bot Admin: Ditambahkan via `/add-admin` (disimpan di database)
   - Discord Admin: Punya permission `Administrator` di Discord server
   - Beberapa command memerlukan keduanya

2. **Dashboard Admin:**
   - Akses: `http://your-server:port/admin`
   - Login dengan password yang dikonfigurasi di `.env` atau `config.json`
   - Fitur: Live report, stok management, dll

3. **Security:**
   - Jangan share password dashboard
   - Hanya tambahkan admin yang dipercaya
   - Rotate password secara berkala

---

## 🎯 **QUICK REFERENCE**

### **Command Paling Sering Digunakan:**
1. `/admin-panel` - Kelola role & stok
2. `/give-ticket` - Berikan tiket ke user
3. `/check-all` - Cek inventaris user
4. `!announce` - Kirim pengumuman
5. `/add-admin` - Tambah admin baru

---

## ✅ **SELESAI!**

Semua command admin sudah terdaftar. Gunakan `/admin-help` atau `!adminhelp` di Discord untuk melihat daftar lengkap dengan format yang lebih rapi.



