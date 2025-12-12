# 🐛 DAFTAR BUG MINI GAME - WARUNG MANG UJANG

**Tanggal**: Setelah review semua sistem mini game (kecuali custom role)

---

## 🔴 BUG KRITIS

### 1. **unoHandler.js - Wild Card Color Selection Tidak User-Friendly** ⚠️
   - **Lokasi**: Line 329-333
   - **Masalah**: 
     - Wild card memilih warna secara **random** tanpa user input
     - User tidak bisa pilih warna yang diinginkan
     - Tidak ada UI untuk user memilih warna (select menu)
   - **Dampak**: 
     - User experience buruk (tidak bisa strategi)
     - Tidak sesuai dengan aturan UNO standar (user harus pilih warna)
   - **Status**: ⚠️ **NEEDS FIX** - Seharusnya ada select menu untuk user pilih warna
   - **Fix**: Implementasi `StringSelectMenuBuilder` untuk user pilih warna saat main wild card

### 2. **crashHandler.js - Interval Mungkin Tidak Dibersihkan di Semua Path** ⚠️
   - **Lokasi**: Line 113-170, 188-191
   - **Masalah**: 
     - Interval dibersihkan di beberapa tempat, tapi jika ada error di tengah-tengah, interval mungkin tidak dibersihkan
     - Jika `endGame` dipanggil dari luar (misalnya bot restart), interval bisa leak
   - **Dampak**: Memory leak, interval terus berjalan meskipun game sudah selesai
   - **Status**: ⚠️ **NEEDS REVIEW** - Perlu pastikan semua path membersihkan interval
   - **Fix**: Tambahkan cleanup di `endGame` dan pastikan interval selalu dibersihkan

### 3. **gamblingHandler.js - BigSlot Balance Check Race Condition** ⚠️
   - **Lokasi**: Line 662-667, 842-849
   - **Masalah**: 
     - Balance di-check di awal (line 662), tapi di dalam loop (line 843) balance bisa berubah
     - Jika user withdraw/deposit saat auto spin berjalan, balance check bisa tidak akurat
   - **Dampak**: User bisa spin meskipun balance tidak cukup, atau sebaliknya
   - **Status**: ⚠️ **NEEDS FIX** - Perlu re-check balance di setiap spin
   - **Fix**: Re-check balance di setiap iteration loop, bukan hanya di awal

---

## 🟡 BUG MENENGAH

### 4. **unoHandler.js - Wild Card Color Declaration Logic Tidak Konsisten** ⚠️
   - **Lokasi**: Line 272, 329-333
   - **Masalah**: 
     - `topCardColor` menggunakan `declaredColor` jika wild (line 272)
     - Tapi saat wild card dimainkan, warna dipilih random (line 331)
     - Tidak ada handler untuk `uno_choose_color` di `interactionCreate.js`
   - **Dampak**: Logic tidak konsisten, wild card mungkin tidak berfungsi dengan benar
   - **Status**: ⚠️ **NEEDS FIX** - Perlu implementasi color selection menu
   - **Fix**: Tambahkan handler untuk `uno_choose_color` di `interactionCreate.js` dan implementasi select menu

### 5. **minesweeperHandler.js - Multiplier Calculation Edge Case** ✅ (Already Protected)
   - **Lokasi**: Line 174-179
   - **Masalah**: 
     - Sudah ada protection untuk division by zero
     - Tapi jika `safeRemainingBefore <= 0`, multiplier di-cap dengan formula yang mungkin tidak ideal
   - **Dampak**: Multiplier bisa tidak akurat di edge case
   - **Status**: ✅ **PROTECTED** - Sudah ada handling, tapi bisa diperbaiki
   - **Fix**: Improve edge case handling untuk multiplier calculation

### 6. **gamblingHandler.js - Math Game Safe Calculate Edge Cases** ⚠️
   - **Lokasi**: Line 437-479
   - **Masalah**: 
     - `safeCalculate` tidak handle division by zero dengan baik
     - Tidak ada validation untuk invalid expressions
     - Jika expression kosong atau hanya operator, bisa error
   - **Dampak**: Game bisa crash jika expression tidak valid
   - **Status**: ⚠️ **NEEDS FIX** - Perlu tambah validation
   - **Fix**: Tambahkan validation untuk division by zero dan invalid expressions

### 7. **heistHandler.js - Session Check Race Condition** ✅ (Already Protected)
   - **Lokasi**: Line 110-123, 170-186
   - **Masalah**: 
     - Sudah ada re-check `activeHeists.has(channelId)` di beberapa tempat
     - Tapi di `minigame2_WireCut`, collector bisa masih aktif meskipun session sudah dihapus
   - **Dampak**: Race condition bisa terjadi jika session dihapus saat collector masih aktif
   - **Status**: ✅ **MOSTLY PROTECTED** - Sudah ada re-check, tapi bisa diperbaiki
   - **Fix**: Pastikan collector di-stop jika session dihapus

### 8. **tawuranHandler.js - Health Calculation** ✅ (Already Fixed)
   - **Lokasi**: Line 96
   - **Masalah**: 
     - Sudah ada `Math.max(0, ...)` untuk prevent negative health
   - **Dampak**: Tidak ada (sudah fixed)
   - **Status**: ✅ **FIXED**

### 9. **gameHandler.js - Balance Validation** ✅ (Already Fixed)
   - **Lokasi**: Line 283-341
   - **Masalah**: 
     - Sudah ada validasi balance sebelum transfer
     - Sudah handle case jika player tidak punya cukup uang
   - **Dampak**: Tidak ada (sudah fixed)
   - **Status**: ✅ **FIXED**

### 10. **blackjackHandler.js - Double Down Balance Check** ✅ (Already Fixed)
   - **Lokasi**: Line 116-122, 179-182
   - **Masalah**: 
     - Sudah ada check balance untuk double down
     - Check dilakukan setelah bet deduction
   - **Dampak**: Tidak ada (sudah fixed)
   - **Status**: ✅ **FIXED**

---

## 🟢 BUG MINOR / UI/UX

### 11. **gamblingHandler.js - Coinflip Emoji** ✅ (Already Fixed)
   - **Lokasi**: Line 228-229
   - **Masalah**: 
     - Sudah menggunakan emoji berbeda untuk head (⬆️) dan tail (⬇️)
   - **Dampak**: Tidak ada (sudah fixed)
   - **Status**: ✅ **FIXED**

### 12. **crashHandler.js - History Display** ✅ (Already Fixed)
   - **Lokasi**: Line 200, 227
   - **Masalah**: 
     - History sudah ditampilkan di cashout dan crash
   - **Dampak**: Tidak ada (sudah fixed)
   - **Status**: ✅ **FIXED**

### 13. **minesweeperHandler.js - Cashout Button Label** ✅ (Already Fixed)
   - **Lokasi**: Line 92, 208
   - **Masalah**: 
     - Label sudah di-format dengan `formatMoney` dan shortened
   - **Dampak**: Tidak ada (sudah fixed)
   - **Status**: ✅ **FIXED**

### 14. **gamblingHandler.js - BigSlot Max Win Cap Info** ✅ (Already Fixed)
   - **Lokasi**: Line 768
   - **Masalah**: 
     - Max win cap sudah ditampilkan di embed
   - **Dampak**: Tidak ada (sudah fixed)
   - **Status**: ✅ **FIXED**

---

## 📋 RINGKASAN

### 🔴 **BUG KRITIS YANG PERLU DIPERBAIKI**:
1. ✅ UNO Wild Card Color Selection (perlu implementasi select menu)
2. ✅ Crash Interval Cleanup (perlu pastikan semua path)
3. ✅ BigSlot Balance Check Race Condition (perlu re-check di loop)

### 🟡 **BUG MENENGAH YANG PERLU DIPERBAIKI**:
4. ✅ UNO Wild Card Color Declaration Logic (perlu konsistensi)
5. ⚠️ Minesweeper Multiplier Edge Case (sudah protected, bisa improve)
6. ✅ Math Game Safe Calculate Edge Cases (perlu validation)
7. ⚠️ Heist Session Check (sudah protected, bisa improve)

### 🟢 **BUG MINOR**:
- Semua sudah fixed atau minor improvements

---

## ✅ **STATUS KESELURUHAN**

**Total Bug Ditemukan**: 14
- 🔴 Critical: 3 (perlu fix)
- 🟡 Medium: 4 (2 perlu fix, 2 sudah protected)
- 🟢 Minor: 7 (semua sudah fixed)

**Prioritas Perbaikan**:
1. **HIGH**: UNO Wild Card Color Selection (user experience)
2. **HIGH**: BigSlot Balance Check Race Condition (data integrity)
3. **MEDIUM**: Crash Interval Cleanup (memory leak prevention)
4. **MEDIUM**: Math Game Safe Calculate Edge Cases (error handling)
5. **LOW**: UNO Wild Card Color Declaration Logic (consistency)

---

## 🔍 **CATATAN TAMBAHAN**

- Sebagian besar bug sudah diperbaiki dari review sebelumnya
- Bug yang tersisa kebanyakan adalah edge cases dan improvements
- Tidak ada bug security yang ditemukan
- Tidak ada bug yang menyebabkan data loss atau corruption

