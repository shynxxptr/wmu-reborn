# 🎮 PLAN: BALANCE SEMUA GAME JUDI - CHALLENGING TAPI FUN

## 🎯 TARGET BALANCE

- **Win Rate**: 40-45% (challenging, tidak terlalu mudah)
- **RTP**: 85-90% (house edge 10-15%)
- **Variasi**: Ada kemenangan kecil sering, kemenangan besar jarang
- **Excitement**: Tetap fun dengan variasi dan tension

---

## 📊 GAME-BY-GAME CHANGES

### 1. **🪙 COINFLIP** (`!cf`)
**Current**: 50% base chance + luck modifier (bisa sampai 65%+)
**Problem**: Terlalu mudah menang dengan luck boost

**Changes**:
- Base chance: 50% → **45%** (5% house edge)
- Luck modifier: Kurangi effect (dari +luck/100 ke +luck/150)
- **Target Win Rate**: ~42-48% (dengan luck)

---

### 2. **🎰 SLOTS** (`!slots`)
**Current**: x8 jackpot, x3 small win (sudah diubah)
**Problem**: Win chance masih rendah (~7.4%), tapi multiplier sudah tinggi

**Changes**:
- Win chance: Tetap sama (sudah cukup challenging)
- Reroll logic: Kurangi effect luck (dari luck/100 ke luck/150)
- **Target Win Rate**: ~7-8% (tapi dengan multiplier tinggi)

---

### 3. **🎰 BIGSLOT** (`!bs`)
**Current**: Sudah diubah chance (highChance 35%, scatter 1.5%, multi 2.5%)
**Problem**: Masih bisa terlalu mudah dengan free spins

**Changes**:
- Normal mode: Tetap (sudah cukup challenging)
- Free spins: Kurangi boost (highChance 45% → 40%)
- Payout requirement: Tetap (10 symbols minimum)
- **Target Win Rate**: ~30-40% per spin (tapi payout kecil sering)

---

### 4. **📈 CRASH** (`!saham`)
**Current**: Sudah diubah (6% instant crash, power 0.45, house edge 8%)
**Problem**: Mungkin sudah cukup, tapi bisa lebih challenging

**Changes**:
- Instant crash: 6% → **7%** (lebih banyak instant crash)
- Power: 0.45 → **0.4** (lebih condong ke crash cepat)
- House edge: 8% → **10%** (0.92 → 0.90)
- **Target**: 50-60% crash di bawah 2x, 30-40% di 2-5x, 10% di 5x+

---

### 5. **🧮 MATH GAME** (`!math`)
**Current**: Multiplier 1.2x-3x, time limit 5-15s
**Problem**: Multiplier terlalu tinggi untuk difficulty

**Changes**:
- Easy: 1.2x → **1.15x** (15% profit)
- Medium: 1.5x → **1.4x** (40% profit)
- Hard: 2.0x → **1.8x** (80% profit)
- Extreme: 3.0x → **2.5x** (150% profit)
- Time limit: Tetap (sudah challenging)
- **Target Win Rate**: ~60-70% (skill-based, tapi multiplier lebih rendah)

---

### 6. **💣 MINESWEEPER** (`!bom`)
**Current**: House edge 5% (0.95), 4 bombs dari 16 spots
**Problem**: House edge terlalu kecil

**Changes**:
- House edge: 5% → **10%** (0.95 → 0.90)
- Bomb count: Tetap 4 (25% bomb rate sudah challenging)
- **Target Win Rate**: ~40-50% (dengan multiplier yang lebih rendah)

---

### 7. **🃏 BLACKJACK** (`!bj`)
**Current**: Standard blackjack rules, 3:2 blackjack payout
**Problem**: Tidak ada house edge built-in (dealer bisa lebih agresif)

**Changes**:
- Dealer stand: 17 → **16** (dealer lebih agresif, lebih mudah bust)
- Blackjack payout: 3:2 → **6:5** (2.4x → 2.2x, lebih rendah)
- **Target Win Rate**: ~42-48% (standard blackjack dengan slight house edge)

---

## 📝 SUMMARY PERUBAHAN

| Game | Current Issue | Change | Target Win Rate |
|------|---------------|--------|-----------------|
| Coinflip | Terlalu mudah dengan luck | Base 45%, kurangi luck effect | 42-48% |
| Slots | Sudah OK | Kurangi luck reroll effect | 7-8% |
| BigSlot | Free spins terlalu mudah | Kurangi free spin boost | 30-40% per spin |
| Crash | Sudah OK, bisa lebih | +1% instant, power 0.4, edge 10% | 50-60% <2x |
| Math | Multiplier terlalu tinggi | Turunkan semua multiplier | 60-70% (skill) |
| Minesweeper | House edge terlalu kecil | 5% → 10% | 40-50% |
| Blackjack | Tidak ada house edge | Dealer stand 16, 6:5 blackjack | 42-48% |

---

## ✅ IMPLEMENTASI

Semua perubahan akan diterapkan untuk membuat game lebih challenging tapi tetap fun!

