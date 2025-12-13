# 📈 ANALISIS CHANCE GAME SAHAM (CRASH)

## 📊 KONFIGURASI SAAT INI

### **Crash Point Calculation:**
```javascript
// Instant crash: 3% chance (1.00x)
if (r < 0.03) {
    crashPoint = 1.00;
} else {
    houseEdge = 0.96; // 4% house edge
    maxMultiplier = 100;
    power = 0.7; // Distribution curve
    // Formula: 1 + (max - 1) * (1 - (1 - adjustedRandom)^power)
}
```

### **Masalah yang Ditemukan:**

1. **Power 0.7 terlalu tinggi**
   - Power tinggi = multiplier rendah lebih jarang
   - Power rendah = multiplier rendah lebih sering
   - Dengan power 0.7, distribusi condong ke multiplier tinggi (2x-10x lebih sering)
   - **Ini membuat game terlalu mudah menang!**

2. **Instant crash hanya 3%**
   - Terlalu rendah, seharusnya 5-7% untuk lebih seimbang

3. **House edge 4% mungkin terlalu kecil**
   - Untuk game yang mudah menang, house edge perlu lebih tinggi

### **Analisis Distribusi:**

Dengan power 0.7:
- Multiplier 1.01-1.5x: ~15-20% chance
- Multiplier 1.5-2x: ~20-25% chance  
- Multiplier 2-5x: ~30-35% chance
- Multiplier 5-10x: ~15-20% chance
- Multiplier 10x+: ~10-15% chance

**Masalah**: Multiplier rendah (1.01-2x) terlalu jarang, multiplier menengah (2-5x) terlalu sering!

---

## 🎯 REKOMENDASI PERBAIKAN

### **1. Turunkan Power (0.7 → 0.4-0.5)**
- Power lebih rendah = multiplier rendah lebih sering
- Akan membuat distribusi lebih seimbang
- Multiplier tinggi tetap mungkin, tapi lebih jarang

### **2. Naikkan Instant Crash (3% → 6-7%)**
- Lebih banyak instant crash = lebih seimbang
- User harus lebih hati-hati

### **3. Naikkan House Edge (4% → 6-8%)**
- Atau ubah formula untuk membuat crash lebih cepat
- House edge lebih tinggi = lebih banyak crash di multiplier rendah

### **4. Tambah Minimum Crash Point**
- Setelah instant crash, minimum crash point bisa 1.01x → 1.05x
- Ini membuat multiplier sangat rendah lebih jarang

---

## 📝 PERUBAHAN YANG AKAN DITERAPKAN

1. **Power**: 0.7 → **0.45** (lebih condong ke crash cepat)
2. **Instant crash**: 3% → **6%** (lebih banyak instant crash)
3. **House edge**: 0.96 → **0.92** (8% house edge, lebih tinggi)
4. **Minimum crash point**: 1.01x → **1.05x** (setelah instant crash)

**Hasil yang Diharapkan:**
- Multiplier 1.05-2x: ~40-50% chance (lebih sering)
- Multiplier 2-5x: ~30-35% chance (sedikit turun)
- Multiplier 5-10x: ~10-15% chance (lebih jarang)
- Multiplier 10x+: ~5-10% chance (lebih jarang)

---

## ⚙️ LOKASI FILE

- File: `handlers/crashHandler.js`
- Line: ~55-85 (crash point calculation)

