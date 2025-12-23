# 📍 CHANNEL CONFIGURATION GUIDE

## 🎯 KONFIGURASI CHANNEL & KATEGORI

Bot ini memerlukan beberapa channel dan kategori untuk berfungsi dengan baik.

---

## 📋 CHANNEL YANG DIPERLUKAN

### **1. KATEGORI TIKET (WAJIB)**
- **Fungsi:** Tempat channel tiket transaksi dibuat
- **Lokasi:** `handlers/shopHandler.js` line 49
- **Saat ini:** Hardcoded `'1444702371111374888'`
- **Cara Setup:**
  1. Buat kategori channel baru di Discord (misal: "Transaksi" atau "Tickets")
  2. Copy Category ID
  3. Update di `.env` atau `config.json`

### **2. MARKET/SHOP CHANNEL (OPSIONAL)**
- **Fungsi:** Tempat panel shop dipasang
- **Command:** `/setup-shop`
- **Lokasi:** Bisa di channel manapun
- **Cara Setup:**
  1. Pilih channel untuk shop
  2. Jalankan `/setup-shop` di channel tersebut
  3. Panel shop akan muncul

### **3. CUSTOM ROLE MARKET (OPSIONAL)**
- **Fungsi:** Tempat user beli custom role pakai Coin
- **Commands:** `!shoprole`, `!belirole`
- **Lokasi:** Bisa di channel manapun
- **Cara Setup:**
  - Tidak perlu setup khusus, bisa digunakan di channel manapun

---

## ⚙️ KONFIGURASI

### **OPSI 1: Via .env (RECOMMENDED)**

Tambahkan ke file `.env`:

```env
# Channel & Category IDs
TICKET_CATEGORY_ID=your_ticket_category_id_here
SHOP_CHANNEL_ID=your_shop_channel_id_here
ROLE_MARKET_CHANNEL_ID=your_role_market_channel_id_here
```

### **OPSI 2: Via config.json**

Tambahkan ke file `config.json`:

```json
{
    "ticketCategoryId": "your_ticket_category_id_here",
    "shopChannelId": "your_shop_channel_id_here",
    "roleMarketChannelId": "your_role_market_channel_id_here"
}
```

---

## 🔧 CARA MENDAPATKAN ID

### **1. Category ID (untuk Tiket):**
1. Enable Developer Mode di Discord (Settings > Advanced > Developer Mode)
2. Right-click pada kategori channel
3. Klik "Copy ID"
4. Paste ID tersebut ke config

### **2. Channel ID:**
1. Enable Developer Mode
2. Right-click pada channel
3. Klik "Copy ID"
4. Paste ID tersebut ke config

---

## 📝 UPDATE CODE

Saya akan update handler untuk menggunakan config daripada hardcode.

---

## ✅ CHECKLIST SETUP

- [ ] Buat kategori channel untuk tiket
- [ ] Copy Category ID
- [ ] Update `.env` atau `config.json` dengan `TICKET_CATEGORY_ID`
- [ ] Pilih channel untuk shop (opsional)
- [ ] Jalankan `/setup-shop` di channel shop
- [ ] Test pembuatan tiket

---

## 🎉 SELESAI!

Setelah setup, tiket akan dibuat di kategori yang sudah dikonfigurasi!



