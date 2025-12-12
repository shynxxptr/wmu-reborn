# 📊 CEK MAX BET & WEALTH LIMITER DI SEMUA GAME

## ✅ STATUS MAX BET (10 JUTA)

| Game | Max Bet | Status | Lokasi Check |
|------|---------|--------|--------------|
| **Blackjack** (`!bj`) | ✅ 10M | ✅ Ada | Line 73-81 |
| **Crash** (`!saham`) | ✅ 10M | ✅ Ada | Line 26-34 |
| **Minesweeper** (`!bom`) | ✅ 10M | ✅ Ada | Line 45-53 |
| **Coinflip** (`!cf`) | ✅ 10M | ✅ Ada | Line 178-189 |
| **Slots** (`!slot`) | ✅ 10M | ✅ Ada | Line 279-290 |
| **Math Game** (`!math`) | ✅ 10M | ✅ Ada | Line 387-398 |
| **BigSlot** (`!bigslot`) | ✅ 10M | ✅ Ada | Line 626-634 |
| **Duel/Palak** (`!palak`) | ❌ Tidak Ada | ⚠️ PvP Transfer | Tidak ada limit (transfer antar user) |

**Kesimpulan Max Bet**: ✅ **SEMUA GAME SUDAH KONSISTEN** (kecuali Duel yang memang transfer PvP)

---

## ⚠️ STATUS WEALTH LIMITER (RUNGKAD SYSTEM)

| Game | Wealth Limiter | Status | Catatan |
|------|----------------|--------|---------|
| **Coinflip** (`!cf`) | ✅ Ada | ✅ Implemented | Menggunakan `getEffectiveLuck()` |
| **Slots** (`!slot`) | ✅ Ada | ✅ Implemented | Menggunakan `getEffectiveLuck()` |
| **Math Game** (`!math`) | ✅ Ada | ✅ Implemented | Menggunakan `getEffectiveLuck()` |
| **BigSlot** (`!bigslot`) | ✅ Ada | ✅ Implemented | Menggunakan `getEffectiveLuck()` |
| **Blackjack** (`!bj`) | ❌ Tidak Ada | ⚠️ **BELUM ADA** | Tidak menggunakan luck system |
| **Crash** (`!saham`) | ❌ Tidak Ada | ⚠️ **BELUM ADA** | Tidak menggunakan luck system |
| **Minesweeper** (`!bom`) | ❌ Tidak Ada | ⚠️ **BELUM ADA** | Tidak menggunakan luck system |
| **Duel/Palak** (`!palak`) | ❌ Tidak Ada | ℹ️ Tidak Perlu | PvP transfer, bukan gambling |

**Kesimpulan Wealth Limiter**: ⚠️ **HANYA 4 GAME YANG PUNYA** (coinflip, slots, math, bigslot)

---

## 🔍 DETAIL WEALTH LIMITER

Wealth Limiter diterapkan melalui fungsi `getEffectiveLuck()` di `gamblingHandler.js`:

```javascript
// Threshold Configuration
const levels = [
    { limit: 100000000, duration: 6 * 3600 * 1000 },   // 100 Juta - 6 Jam
    { limit: 500000000, duration: 12 * 3600 * 1000 },  // 500 Juta - 12 Jam
    { limit: 1000000000, duration: 24 * 3600 * 1000 }, // 1 Milyar - 24 Jam
    { limit: 10000000000, duration: 48 * 3600 * 1000 },// 10 Milyar - 2 Hari
    { limit: 50000000000, duration: 72 * 3600 * 1000 },// 50 Milyar - 3 Hari
    { limit: 100000000000, duration: 120 * 3600 * 1000 }// 100 Milyar - 5 Hari
];
```

**Cara Kerja**:
- Jika user balance >= threshold → Luck dikurangi 90 (RUNGKAD MODE)
- Timer dimulai, user harus bertahan selama `duration`
- Setelah timer selesai → Level cleared, bisa naik ke threshold berikutnya
- Mercy Rule: Jika balance turun < 80% threshold → Penalty dihentikan sementara

---

## ❓ REKOMENDASI

### Opsi 1: Tambahkan Wealth Limiter ke Game yang Belum Punya
**Game yang perlu ditambahkan**:
- Blackjack: Bisa mempengaruhi win chance atau dealer behavior
- Crash: Bisa mempengaruhi crash point calculation
- Minesweeper: Bisa mempengaruhi bomb placement atau multiplier

**Cara Implementasi**:
1. Buat fungsi `getEffectiveLuck()` di masing-masing handler (atau extract ke utils)
2. Terapkan penalty ke win chance / game mechanics
3. Untuk Blackjack: Kurangi win chance
4. Untuk Crash: Turunkan crash point (lebih cepat crash)
5. Untuk Minesweeper: Kurangi multiplier atau tambah bomb chance

### Opsi 2: Biarkan Seperti Sekarang
- Game yang sudah punya wealth limiter: coinflip, slots, math, bigslot
- Game yang belum: blackjack, crash, minesweeper (mungkin tidak perlu karena mekanik berbeda)

---

## 📝 CATATAN

1. **Max Bet**: Semua game sudah konsisten dengan limit 10M ✅
2. **Wealth Limiter**: Hanya 4 game yang punya, 3 game belum punya ⚠️
3. **Duel/Palak**: Tidak perlu max bet atau wealth limiter karena ini transfer PvP, bukan gambling

**Pertanyaan**: Apakah perlu menambahkan wealth limiter ke Blackjack, Crash, dan Minesweeper?

