# 🎫 TICKET & MARKET SETUP GUIDE

## 📍 LOKASI PEMBUKAAN TIKET & MARKET CUSTOM ROLE

---

## 🎫 SISTEM TIKET (Pembukaan Tiket)

### **Cara Kerja:**
1. User membeli tiket dari shop panel (`/setup-shop`)
2. Bot otomatis membuat channel private di kategori yang dikonfigurasi
3. Channel dibuat dengan nama `beli-{username}`
4. User dan admin bisa chat di channel tersebut

### **Lokasi Kategori Tiket:**
- **File:** `handlers/shopHandler.js`
- **Saat ini:** Hardcoded `'1444702371111374888'` (akan diubah ke config)
- **Konfigurasi:** Via `.env` atau `config.json`

### **Setup Kategori Tiket:**

1. **Buat kategori channel di Discord:**
   - Buat kategori baru (misal: "Transaksi" atau "Tickets")
   - Pastikan bot punya permission `Manage Channels`

2. **Dapatkan Category ID:**
   - Enable Developer Mode (Settings > Advanced > Developer Mode)
   - Right-click kategori > "Copy ID"

3. **Update konfigurasi:**
   
   **Via .env:**
   ```env
   TICKET_CATEGORY_ID=your_category_id_here
   ```
   
   **Via config.json:**
   ```json
   {
       "ticketCategoryId": "your_category_id_here"
   }
   ```

4. **Restart bot**

---

## 🏪 MARKET CUSTOM ROLE

### **Ada 2 Sistem Market:**

#### **1. Shop Panel (General Sales)**
- **Command:** `/setup-shop`
- **Lokasi:** Bisa dipasang di channel manapun
- **Fungsi:** Panel shop untuk beli tiket custom role
- **Cara Setup:**
  1. Pilih channel untuk shop
  2. Jalankan `/setup-shop` di channel tersebut
  3. Panel shop akan muncul dengan dropdown menu

#### **2. Coin Shop (Custom Role Market)**
- **Commands:** `!shoprole`, `!belirole <hari>`
- **Lokasi:** Bisa digunakan di channel manapun
- **Fungsi:** Beli tiket custom role pakai Coin Ujang
- **Cara Setup:**
  - Tidak perlu setup khusus
  - Bisa digunakan di channel manapun
  - User cukup ketik `!shoprole` untuk lihat harga
  - User ketik `!belirole 7` untuk beli tiket 7 hari

---

## 📋 RINGKASAN SISTEM

### **Tiket System:**
- ✅ **Kategori:** Dikonfigurasi via `TICKET_CATEGORY_ID`
- ✅ **Channel:** Dibuat otomatis saat user beli
- ✅ **Nama:** `beli-{username}`
- ✅ **Permission:** Private (hanya user & bot)

### **Market Custom Role:**
- ✅ **Shop Panel:** `/setup-shop` (bisa di channel manapun)
- ✅ **Coin Shop:** `!shoprole` & `!belirole` (bisa di channel manapun)
- ✅ **Tidak perlu channel khusus**

---

## ⚙️ KONFIGURASI LENGKAP

### **File .env:**
```env
# Kategori untuk channel tiket transaksi
TICKET_CATEGORY_ID=your_ticket_category_id_here

# Channel untuk shop (OPSIONAL)
SHOP_CHANNEL_ID=your_shop_channel_id_here

# Channel untuk role market (OPSIONAL)
ROLE_MARKET_CHANNEL_ID=your_role_market_channel_id_here
```

### **File config.json:**
```json
{
    "ticketCategoryId": "your_ticket_category_id_here",
    "shopChannelId": "your_shop_channel_id_here",
    "roleMarketChannelId": "your_role_market_channel_id_here"
}
```

---

## 🎯 QUICK SETUP

### **1. Setup Kategori Tiket:**
```bash
# 1. Buat kategori di Discord
# 2. Copy Category ID
# 3. Update .env:
TICKET_CATEGORY_ID=your_category_id

# 4. Restart bot
```

### **2. Setup Shop Panel:**
```bash
# 1. Pilih channel untuk shop
# 2. Jalankan di channel tersebut:
/setup-shop

# 3. Panel shop akan muncul
```

### **3. Setup Role Market:**
```bash
# Tidak perlu setup, langsung bisa digunakan:
!shoprole  # Lihat harga
!belirole 7  # Beli tiket 7 hari
```

---

## ✅ CHECKLIST

- [ ] Buat kategori channel untuk tiket
- [ ] Copy Category ID
- [ ] Update `TICKET_CATEGORY_ID` di `.env` atau `config.json`
- [ ] Pilih channel untuk shop (opsional)
- [ ] Jalankan `/setup-shop` di channel shop
- [ ] Test pembuatan tiket
- [ ] Test `!shoprole` dan `!belirole`

---

## 🎉 SELESAI!

Sistem tiket dan market sudah dikonfigurasi!



