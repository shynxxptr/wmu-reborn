# ⚖️ BALANCE ANALYSIS - TRYHARD GAMES

## 🔍 ANALISIS MASALAH POTENSIAL

### 1. **!coinflip** - STREAK BONUS TERLALU TINGGI ⚠️

**Masalah:**
- Streak 5+ win = +50% bonus
- Probabilitas streak 5 win berturut-turut: (0.45)^5 = **1.8%**
- Tapi jika terjadi, RTP bisa naik drastis
- Dengan multiplier 2.0x + 50% bonus = 3.0x total
- RTP calculation: 0.45 × 3.0 = **135%** (terlalu tinggi!)

**Rekomendasi:**
- Turunkan streak bonus 5+ dari 50% → **30%**
- Atau naikkan requirement dari 5 → **7 win** untuk bonus 50%
- Atau kurangi bonus menjadi: 2 win (+5%), 3-4 win (+15%), 5+ win (+30%)

---

### 2. **!slots** - TIMING BONUS TERLALU TINGGI ⚠️

**Masalah:**
- Perfect timing x2 = +50% bonus
- Win rate sudah rendah (7.4%), tapi dengan perfect timing bisa dapat bonus besar
- Jackpot (x8) + perfect timing (+50%) = **x12 total** (terlalu tinggi!)
- Small win (x3) + perfect timing (+50%) = **x4.5 total**

**Rekomendasi:**
- Turunkan perfect timing x2 dari 50% → **30%**
- Atau buat timing bonus hanya apply ke base win, bukan multiplier
- Atau kurangi menjadi: 1 perfect (+15%), 2 perfect (+25%)

---

### 3. **!bom** - COMBO BONUS TERLALU TINGGI ⚠️

**Masalah:**
- Combo 7+ clicks = +50% bonus
- Win rate di 7 clicks sudah sangat rendah (~6%), tapi bonus 50% bisa membuat RTP terlalu tinggi
- Multiplier di 7 clicks sudah tinggi, ditambah 50% bonus bisa terlalu OP

**Rekomendasi:**
- Turunkan combo 7+ dari 50% → **35%**
- Atau naikkan requirement dari 7 → **9 clicks** untuk bonus 50%
- Atau kurangi menjadi: 3-4 clicks (+8%), 5-6 clicks (+20%), 7+ clicks (+35%)

---

### 4. **!saham** - COMBO BONUS SUDAH BALANCE ✅

**Status:** ✅ Balance
- Combo hanya 10% untuk 3+ cashout
- Requirement cukup tinggi (3 cashout berturut-turut di 2x+)
- Reset jika cashout di bawah 2x
- Sudah cukup balance

---

### 5. **!math** - COMBO BONUS SUDAH BALANCE ✅

**Status:** ✅ Balance
- Combo 10+ = +20% bonus
- Tapi difficulty scaling juga naik (+5% per win, max +50%)
- Time reduction juga naik (-3% per win, max -30%)
- Sudah cukup balance karena ada tradeoff

---

### 6. **!bigslot** - RISK MODE PERLU REVIEW ⚠️

**Masalah:**
- Double mode: +50% multiplier, -20% win chance
- Safe mode: +30% win chance, -30% multiplier
- Perlu cek apakah modifier ini balance

**Analisis:**
- Double mode: Win chance turun 20%, tapi multiplier naik 50%
  - Jika base win chance 30%, jadi 24%
  - Jika base multiplier 1x, jadi 1.5x
  - RTP: 0.24 × 1.5 = **36%** (turun dari base ~30%)
  - ⚠️ **Masalah:** RTP turun terlalu banyak!

- Safe mode: Win chance naik 30%, multiplier turun 30%
  - Jika base win chance 30%, jadi 39%
  - Jika base multiplier 1x, jadi 0.7x
  - RTP: 0.39 × 0.7 = **27.3%** (turun dari base ~30%)
  - ⚠️ **Masalah:** RTP turun juga!

**Rekomendasi:**
- Double mode: +50% multiplier, -15% win chance (bukan -20%)
- Safe mode: +25% win chance, -25% multiplier (bukan -30%)
- Atau adjust agar RTP tetap ~30% untuk semua mode

---

## 📊 RTP CALCULATION SUMMARY

| Game | Base RTP | Dengan Bonus Max | Status |
|------|----------|-------------------|--------|
| **!coinflip** | ~90% | ~135% (streak 5+) | ⚠️ Terlalu tinggi |
| **!slots** | ~24.5% | ~37% (perfect x2) | ⚠️ Terlalu tinggi |
| **!bom** | ~90% | ~135% (combo 7+) | ⚠️ Terlalu tinggi |
| **!saham** | ~88% | ~97% (combo 3+) | ✅ Balance |
| **!math** | ~85% | ~102% (combo 10+) | ✅ Balance |
| **!bigslot** | ~85% | ~36% (double mode) | ⚠️ Terlalu rendah |

---

## ✅ REKOMENDASI PERBAIKAN

### **Priority 1: High Impact**
1. **!coinflip** - Turunkan streak bonus 5+ dari 50% → **30%**
2. **!slots** - Turunkan perfect timing x2 dari 50% → **30%**
3. **!bom** - Turunkan combo 7+ dari 50% → **35%**

### **Priority 2: Medium Impact**
4. **!bigslot** - Adjust risk mode modifiers:
   - Double: -20% → **-15%** win chance
   - Safe: -30% → **-25%** multiplier

### **Priority 3: Low Impact (Optional)**
5. Review semua bonus untuk konsistensi
6. Tambah cap untuk bonus maksimal per game

---

## 🎯 TARGET RTP SETELAH PERBAIKAN

| Game | Target RTP | Dengan Bonus Max |
|------|------------|------------------|
| **!coinflip** | ~90% | ~108% (streak 5+) |
| **!slots** | ~24.5% | ~32% (perfect x2) |
| **!bom** | ~90% | ~122% (combo 7+) |
| **!saham** | ~88% | ~97% (combo 3+) |
| **!math** | ~85% | ~102% (combo 10+) |
| **!bigslot** | ~85% | ~85% (all modes) |

---

**Status:** ⚠️ **PERLU PERBAIKAN**
**Priority:** High untuk coinflip, slots, bom
**Medium:** bigslot risk mode



