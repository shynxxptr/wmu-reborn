# 🎰 ANALISIS RATE KEMENANGAN SEMUA GAME SLOT

## 📊 RINGKASAN SEMUA GAME SLOT

### 1. **!slots** (Slot Machine 3 Reel)

**Konfigurasi:**
- 6 items: `['☕', '🍝', '🥣', '🍹', '🍞', '🍡']`
- Win conditions:
  - 3 sama = **x8** (Jackpot)
  - 2 sama = **x3** (Small Win)

**Rate Kemenangan:**
- **3 sama (Jackpot)**: `(1/6)^3 = 1/216 ≈ 0.46%`
- **2 sama (Small Win)**: 
  - Kombinasi: 3 posisi bisa 2 sama
  - Chance: `3 × (1/6)^2 × (5/6) ≈ 6.94%`
- **Total Win Chance**: ~7.4%

**RTP (Return to Player):**
- Jackpot: 0.46% × 8 = 3.68%
- Small Win: 6.94% × 3 = 20.82%
- **Total RTP: ~24.5%**
- **House Edge: ~75.5%** ⚠️

**Catatan:**
- Ada reroll logic jika lucky (luck > 0)
- Reroll chance: `luck / 150` (reduced effect)
- Jika tidak menang dan lucky, dapat 1 kali reroll

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
- `scatterChance = 0.04` (4% per symbol)
- `multiChance = 0.06` (6% per symbol)
- `highChance = 0.50` (50% per symbol)
- **Low chance**: 40% (100% - 60% = 40%)

#### **COLD STREAK (20% chance)**
- `scatterChance = 0.008` (0.8% per symbol)
- `multiChance = 0.015` (1.5% per symbol)
- `highChance = 0.30` (30% per symbol)
- **Low chance**: 68.5% (100% - 31.5% = 68.5%)

#### **NORMAL (65% chance)**
- `scatterChance = 0.015` (1.5% per symbol)
- `multiChance = 0.025` (2.5% per symbol)
- `highChance = 0.35` (35% per symbol)
- **Low chance**: 61% (100% - 39% = 61%)

#### **FREE SPINS MODE**
- `scatterChance = 0.02` (2% per symbol)
- `multiChance = 0.05` (5% per symbol)
- `highChance = 0.40` (40% per symbol)
- **Low chance**: 53% (100% - 47% = 53%)

**Payout Table:**
```
Low Symbols:
- 10-11 symbols: 0.5x
- 12-13 symbols: 1x
- 14+ symbols: 1.5x

High Symbols:
- 10-11 symbols: 1x
- 12-13 symbols: 1.5x
- 14+ symbols: 2.5x
```

**Rate Kemenangan:**
- **Minimum 10 symbols** untuk menang (dari 30 total)
- Dengan 30 symbols, chance dapat 10+ symbols tergantung streak mode
- **Scatter trigger**: 4+ scatter = +10 Free Spins
- **Multiplier**: Bisa dapat multiplier 2x, 5x, 10x, 25x, 50x
- **Max Win Cap**: 5000x bet

**Estimasi Win Rate:**
- Normal mode: ~30-40% per spin (dengan payout kecil sering)
- Hot streak: ~50-60% per spin
- Cold streak: ~20-30% per spin
- Free spins: ~40-50% per spin

---

### 3. **!saham** (Crash Game)

**Konfigurasi:**
- Instant crash: **12%** chance (1.00x) - **DINAIKKAN** untuk prevent spam
- Crash di 1.0x-2.0x: **33%** chance (setelah instant crash)
- **Total 45%** crash di range 1.0x-2.0x
- House edge: **12%** (0.88 multiplier) - **DINAIKKAN**
- Power: **0.25** (membuat multiplier rendah SANGAT lebih sering)
- Max multiplier: **100x**

**Rate Kemenangan:**
- **12% instant crash** = langsung kalah di 1.00x
- **33% crash di 1.0x-2.0x** = banyak crash di range rendah
- **55%** sisanya untuk multiplier lebih tinggi, tapi masih condong ke bawah

**Estimasi Distribusi (BARU):**
- **~45%** crash di 1.0x-2.0x (12% instant + 33% low range)
- **~30-35%** crash di 2x - 5x
- **~15-20%** crash di 5x - 10x
- **~5-10%** crash di 10x+

**RTP:**
- House edge 12% = **RTP ~88%**
- Win rate menurun drastis karena banyak crash di 1-2x
- **Lebih challenging untuk prevent spam**

**Catatan:**
- Player harus manual cashout sebelum crash
- Skill-based (timing cashout)
- Tidak ada luck system
- **DITURUNKAN win rate untuk prevent spam saham**

---

### 4. **!bom** (Minesweeper)

**Konfigurasi:**
- Grid: 4×4 = **16 spots**
- Bombs: **4 bombs** (25% bomb rate)
- House edge: **10%** (0.90 multiplier)
- Multiplier formula: `currentMult × (totalRemaining / safeRemaining) × 0.90`

**Rate Kemenangan:**
- **Bomb rate**: 4/16 = **25%** per click
- **Safe rate**: 12/16 = **75%** per click
- Tapi player bisa cashout kapan saja

**Multiplier Calculation:**
- Click 1: 16/12 × 0.90 = **1.20x**
- Click 2: 15/11 × 0.90 = **1.23x** (accumulated)
- Click 3: 14/10 × 0.90 = **1.26x** (accumulated)
- Click 4: 13/9 × 0.90 = **1.30x** (accumulated)
- ... dan seterusnya

**Estimasi Win Rate:**
- **1 click**: 75% safe = **75% win rate** (tapi multiplier kecil)
- **2 clicks**: 75% × 73.3% = **~55% win rate**
- **3 clicks**: 75% × 73.3% × 71.4% = **~39% win rate**
- **4 clicks**: 75% × 73.3% × 71.4% × 69.2% = **~27% win rate**
- **5 clicks**: ~**19% win rate**
- **6 clicks**: ~**13% win rate**
- **7 clicks**: ~**9% win rate**
- **8 clicks**: ~**6% win rate**
- **9 clicks**: ~**4% win rate**
- **10 clicks**: ~**3% win rate**
- **11 clicks**: ~**2% win rate**
- **12 clicks**: ~**1% win rate** (all safe spots)

**RTP:**
- House edge 10% = **RTP ~90%**
- Tapi win rate menurun drastis dengan lebih banyak clicks

**Catatan:**
- Player bisa cashout kapan saja
- Skill-based (kapan harus cashout)
- Tidak ada luck system

---

## 📈 PERBANDINGAN RTP & WIN RATE

| Game | Win Rate | RTP | House Edge | Catatan |
|------|----------|-----|------------|---------|
| **!slots** | ~7.4% | ~24.5% | ~75.5% | ⚠️ RTP sangat rendah, tapi multiplier tinggi |
| **!bigslot** | ~30-40% | ~85-90% | ~10-15% | ✅ Balanced, tergantung streak |
| **!saham** | Skill-based (lebih rendah) | ~88% | ~12% | ✅ Skill-based, banyak crash 1-2x (anti-spam) |
| **!bom** | 75% (1 click) → 1% (12 clicks) | ~90% | ~10% | ✅ Skill-based, kapan cashout |

---

## ⚠️ MASALAH YANG DITEMUKAN

### 1. **!slots** - RTP Terlalu Rendah
- **RTP hanya 24.5%** = house edge 75.5%
- Sangat tidak menguntungkan untuk player
- **Rekomendasi**: Naikkan multiplier atau tambah chance win

### 2. **!bigslot** - Sudah Cukup Balanced
- Normal mode sudah di-tune dengan baik
- Streak system memberikan variasi
- Free spins memberikan excitement

### 3. **!saham** - Sudah Balanced
- House edge 10% sudah wajar
- Skill-based game, player bisa timing cashout
- Distribusi condong ke multiplier rendah (challenging)

### 4. **!bom** - Sudah Balanced
- House edge 10% sudah wajar
- Skill-based game, player bisa cashout kapan saja
- Win rate menurun dengan lebih banyak clicks (risk/reward)

---

## ✅ REKOMENDASI PERBAIKAN

### **Untuk !slots:**
1. **Naikkan multiplier**:
   - 3 sama: x8 → **x12** (Jackpot)
   - 2 sama: x3 → **x4** (Small Win)
   - Atau tambah item untuk lebih banyak kombinasi

2. **Atau naikkan chance win**:
   - Tambah reroll chance untuk lucky players
   - Atau kurangi jumlah item (dari 6 ke 5) untuk lebih mudah menang

### **Untuk !bigslot:**
- ✅ **Sudah cukup balanced**, tidak perlu perubahan besar
- Mungkin adjust sedikit jika terlalu mudah/sulit

### **Untuk !saham:**
- ✅ **DITURUNKAN win rate** untuk prevent spam
- Instant crash: 7% → **12%**
- Tambah 33% crash di 1.0x-2.0x range
- Total 45% crash di 1.0x-2.0x
- House edge: 10% → **12%**
- Power: 0.4 → **0.25** (lebih condong ke multiplier rendah)

### **Untuk !bom:**
- ✅ **Sudah balanced**, tidak perlu perubahan

---

## 📝 CATATAN TAMBAHAN

- **Wealth Limiter** sudah diterapkan untuk !slots dan !bigslot via `getEffectiveLuck()`
- **Max Bet** sudah ada (10 Juta) untuk semua game
- **Cooldown** sudah ada untuk mencegah spam
- **!saham** dan **!bom** tidak menggunakan luck system (skill-based)

---

**Dibuat:** $(date)
**Lokasi Code:**
- `!slots`: `handlers/gamblingHandler.js` line ~270-377
- `!bigslot`: `handlers/gamblingHandler.js` line ~601-1022
- `!saham`: `handlers/crashHandler.js`
- `!bom`: `handlers/minesweeperHandler.js`

