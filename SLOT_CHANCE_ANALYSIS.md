# 🎰 ANALISIS CHANCE GAME SLOT

## 📊 RINGKASAN CHANCE SEMUA GAME SLOT

### 1. **!slots** (Slot Machine 3 Reel)

**Konfigurasi:**
- 6 items: `['☕', '🍝', '🥣', '🍹', '🍞', '🍡']`
- Win conditions:
  - 3 sama = **x5** (Jackpot)
  - 2 sama = **x2** (Small Win)

**Chance Calculation:**
- **3 sama (Jackpot)**: `(1/6)^3 = 1/216 ≈ 0.46%`
- **2 sama (Small Win)**: 
  - Kombinasi: 3 posisi bisa 2 sama
  - Chance: `3 × (1/6)^2 × (5/6) ≈ 6.94%`
- **Total Win Chance**: ~7.4%
- **RTP (Return to Player)**: 
  - Jackpot: 0.46% × 5 = 2.3%
  - Small Win: 6.94% × 2 = 13.88%
  - **Total RTP: ~16.18%** ⚠️ **TERLALU RENDAH!**

**Masalah:**
- RTP hanya ~16%, artinya house edge 84% (sangat tinggi!)
- Tapi ada reroll logic jika lucky (luck > 0), yang bisa meningkatkan chance

**Rekomendasi:**
- Naikkan multiplier atau tambah chance win
- Atau tambah item untuk lebih banyak kombinasi

---

### 2. **!bigslot / !bs** (Gates of Mang Ujang 6x5 Grid)

**Konfigurasi:**
- Grid: 6 kolom × 5 baris = 30 symbols
- Symbols:
  - Low: `['🍌', '🍇', '🍉', '🍊', '🍎']` (5 items)
  - High: `['🍜', '🍗', '🍔', '🍰']` (4 items)
  - Scatter: `🍭`
  - Multiplier: `💣`

**Streak System:**

#### **HOT STREAK (15% chance)**
- `scatterChance = 0.05` (5% per symbol)
- `multiChance = 0.07` (7% per symbol)
- `highChance = 0.58` (58% per symbol)
- **Low chance**: 30% (100% - 70% = 30%)

#### **COLD STREAK (20% chance)**
- `scatterChance = 0.008` (0.8% per symbol)
- `multiChance = 0.015` (1.5% per symbol)
- `highChance = 0.30` (30% per symbol)
- **Low chance**: 68.2% (100% - 31.8% = 68.2%)

#### **NORMAL (65% chance)**
- `scatterChance = 0.025` (2.5% per symbol)
- `multiChance = 0.04` (4% per symbol)
- `highChance = 0.47` (47% per symbol)
- **Low chance**: 46.5% (100% - 53.5% = 46.5%)

#### **FREE SPINS MODE**
- `scatterChance = 0.03` (3% per symbol)
- `multiChance = 0.08` (8% per symbol)
- `highChance = 0.55` (55% per symbol)
- **Low chance**: 34% (100% - 66% = 34%)

**Payout Table:**
```
Low Symbols:
- 8-9 symbols: 0.5x
- 10-11 symbols: 1x
- 12+ symbols: 1.5x

High Symbols:
- 8-9 symbols: 1x
- 10-11 symbols: 1.5x
- 12+ symbols: 2.5x
```

**Analisis Chance:**
- **HOT STREAK**: High chance 58% → sangat mudah dapat high symbols
- **NORMAL**: High chance 47% → masih cukup tinggi
- **COLD STREAK**: High chance 30% → lebih rendah, tapi masih bisa menang

**Masalah:**
- **High chance terlalu tinggi** (47-58% di normal/hot streak)
- Dengan 30 symbols, chance dapat 8+ high symbols sangat tinggi
- Scatter chance 2.5-5% per symbol = banyak scatter muncul
- Multiplier chance 4-7% per symbol = banyak multiplier

**Rekomendasi:**
- Turunkan `highChance` di normal mode (dari 47% ke ~35-40%)
- Turunkan `scatterChance` di normal mode (dari 2.5% ke ~1.5-2%)
- Turunkan `multiChance` di normal mode (dari 4% ke ~2-3%)
- Atau naikkan requirement untuk payout (dari 8 symbols ke 10+ symbols)

---

## 🎯 KESIMPULAN

### **Masalah yang Ditemukan:**

1. **!slots**: RTP terlalu rendah (~16%), tapi ada reroll logic
2. **!bigslot**: 
   - High chance terlalu tinggi (47-58%)
   - Scatter chance terlalu tinggi (2.5-5%)
   - Multiplier chance terlalu tinggi (4-7%)
   - **Ini yang membuat game "gacor"!**

### **Rekomendasi Perbaikan:**

#### **Untuk !bigslot:**
1. **Turunkan highChance di NORMAL mode**: 47% → **35%**
2. **Turunkan scatterChance di NORMAL mode**: 2.5% → **1.5%**
3. **Turunkan multiChance di NORMAL mode**: 4% → **2.5%**
4. **Naikkan requirement payout**: 8 symbols → **10 symbols minimum**

#### **Untuk !slots:**
1. **Naikkan multiplier**: x2 → **x3**, x5 → **x8**
2. Atau **tambah item** untuk lebih banyak kombinasi

---

## 📝 CATATAN

- **Wealth Limiter** sudah diterapkan via `getEffectiveLuck()`
- **Max Bet** sudah ada (10 Juta)
- **Streak System** sudah ada (Hot/Cold/Normal)
- Tapi chance di **NORMAL mode masih terlalu tinggi**

---

## ⚙️ LOKASI FILE

- File: `handlers/gamblingHandler.js`
- Line untuk !slots: ~270-370
- Line untuk !bigslot: ~600-1020


