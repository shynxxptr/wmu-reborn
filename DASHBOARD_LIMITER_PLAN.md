# 📋 PLAN: DASHBOARD WEALTH LIMITER & MAX BET MANAGEMENT

## 🎯 TUJUAN
Menambahkan fitur di dashboard untuk:
1. **Melihat siapa yang kena limiter** (wealth limiter aktif)
2. **Mencabut/reset limiter** per user
3. **Setting max bet per user** (custom max bet, bukan global 10M)
4. **Setting limiter per user** (override level_cleared atau first_breach_time)

---

## 📊 ANALISA STRUKTUR SAAT INI

### Database Tables
1. **`user_wealth_limits`** (Sudah ada)
   - `user_id` (TEXT PRIMARY KEY)
   - `level_cleared` (INTEGER DEFAULT 0)
   - `first_breach_time` (INTEGER DEFAULT NULL)

2. **Max Bet** (Belum ada table)
   - Saat ini hardcoded `10000000` (10M) di semua game handler
   - Perlu table baru untuk custom max bet per user

---

## 🗄️ PERUBAHAN DATABASE YANG DIPERLUKAN

### 1. Table Baru: `user_max_bet`
```sql
CREATE TABLE IF NOT EXISTS user_max_bet (
    user_id TEXT PRIMARY KEY,
    max_bet_amount INTEGER DEFAULT 10000000,
    is_custom INTEGER DEFAULT 0,  -- 0 = use global, 1 = use custom
    set_by TEXT,                  -- Admin user_id yang set
    set_at INTEGER                -- Timestamp
)
```

### 2. Modifikasi Table: `user_wealth_limits` (Optional)
Bisa tambahkan kolom untuk manual override:
```sql
ALTER TABLE user_wealth_limits ADD COLUMN manual_override INTEGER DEFAULT 0;
ALTER TABLE user_wealth_limits ADD COLUMN override_by TEXT;
ALTER TABLE user_wealth_limits ADD COLUMN override_at INTEGER;
```

---

## 🔧 FUNGSI DATABASE BARU

### Max Bet Functions
```javascript
// Get max bet untuk user (jika custom, return custom, else return global)
db.getUserMaxBet = (userId) => {
    const row = db.prepare('SELECT * FROM user_max_bet WHERE user_id = ?').get(userId);
    if (row && row.is_custom === 1) {
        return row.max_bet_amount;
    }
    return 10000000; // Global default
};

// Set custom max bet untuk user
db.setUserMaxBet = (userId, amount, setBy) => {
    try {
        db.prepare(`
            INSERT INTO user_max_bet (user_id, max_bet_amount, is_custom, set_by, set_at)
            VALUES (?, ?, 1, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET 
                max_bet_amount = ?,
                is_custom = 1,
                set_by = ?,
                set_at = ?
        `).run(userId, amount, setBy, Date.now(), amount, setBy, Date.now());
        return true;
    } catch (e) { return false; }
};

// Reset max bet ke global (hapus custom)
db.resetUserMaxBet = (userId) => {
    try {
        db.prepare('DELETE FROM user_max_bet WHERE user_id = ?').run(userId);
        return true;
    } catch (e) { return false; }
};

// Get all users with custom max bet
db.getUsersWithCustomMaxBet = () => {
    return db.prepare('SELECT * FROM user_max_bet WHERE is_custom = 1').all();
};
```

### Wealth Limiter Functions
```javascript
// Get all users yang kena limiter (aktif)
db.getUsersWithActiveLimiter = () => {
    // Users dengan first_breach_time != null dan belum cleared
    return db.prepare(`
        SELECT w.*, e.uang_jajan as balance
        FROM user_wealth_limits w
        JOIN user_economy e ON w.user_id = e.user_id
        WHERE w.first_breach_time IS NOT NULL
        AND e.uang_jajan >= (
            SELECT limit FROM (
                SELECT 100000000 as limit, 0 as idx UNION ALL
                SELECT 500000000, 1 UNION ALL
                SELECT 1000000000, 2 UNION ALL
                SELECT 10000000000, 3 UNION ALL
                SELECT 50000000000, 4 UNION ALL
                SELECT 100000000000, 5
            ) WHERE idx = w.level_cleared
        )
    `).all();
};

// Reset limiter untuk user (clear level dan timer)
db.resetUserLimiter = (userId, newLevel = null, resetBy = null) => {
    try {
        if (newLevel === null) {
            // Full reset: level = 0, timer = null
            db.prepare('UPDATE user_wealth_limits SET level_cleared = 0, first_breach_time = NULL WHERE user_id = ?').run(userId);
        } else {
            // Set ke level tertentu
            db.prepare('UPDATE user_wealth_limits SET level_cleared = ?, first_breach_time = NULL WHERE user_id = ?').run(newLevel, userId);
        }
        return true;
    } catch (e) { return false; }
};

// Force set limiter level untuk user
db.setUserLimiterLevel = (userId, level, setBy) => {
    try {
        db.prepare('UPDATE user_wealth_limits SET level_cleared = ?, first_breach_time = NULL WHERE user_id = ?').run(level, userId);
        return true;
    } catch (e) { return false; }
};
```

---

## 🎨 FITUR DASHBOARD

### 1. Route: `/limiter` (Wealth Limiter Management)
**Fitur:**
- List semua user yang kena limiter aktif
- Tampilkan:
  - Username & User ID
  - Current Balance
  - Level Cleared
  - Current Threshold
  - Time Remaining (jika timer aktif)
  - Status (Active/Mercy Zone/Cleared)
- Action buttons:
  - **Reset Limiter** (full reset ke level 0)
  - **Clear Timer** (reset timer, keep level)
  - **Set Level** (set ke level tertentu)
  - **View Details** (detail lengkap)

### 2. Route: `/maxbet` (Max Bet Management)
**Fitur:**
- List semua user dengan custom max bet
- Tampilkan:
  - Username & User ID
  - Custom Max Bet
  - Set By (admin)
  - Set At (timestamp)
- Action buttons:
  - **Edit Max Bet** (ubah custom max bet)
  - **Reset to Global** (hapus custom, kembali ke 10M)
- Form untuk:
  - **Set Custom Max Bet** (input user ID + amount)

### 3. Route: `/limiter/:userId` (User Detail)
**Fitur:**
- Detail lengkap wealth limiter user
- History (jika ada)
- Current status
- Actions: Reset, Set Level, Clear Timer

---

## 🔄 PERUBAHAN DI GAME HANDLERS

### Semua Game Handler Perlu Diupdate
Ganti hardcoded `10000000` dengan `db.getUserMaxBet(userId)`:

**Files yang perlu diubah:**
1. `handlers/blackjackHandler.js`
2. `handlers/crashHandler.js`
3. `handlers/minesweeperHandler.js`
4. `handlers/gamblingHandler.js` (coinflip, slots, math, bigslot)

**Contoh perubahan:**
```javascript
// SEBELUM:
if (bet > 10000000) return message.reply('❌ Maksimal taruhan adalah 10 Juta!');

// SESUDAH:
const maxBet = db.getUserMaxBet(userId);
if (bet > maxBet) return message.reply(`❌ Maksimal taruhan adalah Rp ${maxBet.toLocaleString('id-ID')}!`);
```

---

## 📝 API ENDPOINTS

### Wealth Limiter APIs
```javascript
// GET /api/limiter/list
// Get all users with active limiter

// POST /api/limiter/reset
// Body: { userId }
// Reset limiter untuk user (level 0, timer null)

// POST /api/limiter/set-level
// Body: { userId, level }
// Set limiter level untuk user

// POST /api/limiter/clear-timer
// Body: { userId }
// Clear timer, keep level

// GET /api/limiter/user/:userId
// Get detail limiter untuk user tertentu
```

### Max Bet APIs
```javascript
// GET /api/maxbet/list
// Get all users with custom max bet

// POST /api/maxbet/set
// Body: { userId, amount }
// Set custom max bet untuk user

// POST /api/maxbet/reset
// Body: { userId }
// Reset max bet ke global (hapus custom)

// GET /api/maxbet/user/:userId
// Get max bet untuk user tertentu
```

---

## 🎨 UI COMPONENTS

### 1. Limiter List Page (`/limiter`)
- Table dengan columns:
  - User (username + ID)
  - Balance
  - Level Cleared
  - Current Threshold
  - Time Remaining
  - Status Badge
  - Actions (dropdown menu)

### 2. Max Bet List Page (`/maxbet`)
- Table dengan columns:
  - User (username + ID)
  - Custom Max Bet
  - Set By
  - Set At
  - Actions (Edit, Reset)

### 3. User Detail Modal
- Show wealth limiter status
- Show max bet setting
- Quick actions

---

## 📋 CHECKLIST IMPLEMENTASI

### Phase 1: Database & Functions
- [ ] Create `user_max_bet` table
- [ ] Add database functions for max bet
- [ ] Add database functions for limiter management
- [ ] Test database functions

### Phase 2: Update Game Handlers
- [ ] Update `blackjackHandler.js` to use `db.getUserMaxBet()`
- [ ] Update `crashHandler.js` to use `db.getUserMaxBet()`
- [ ] Update `minesweeperHandler.js` to use `db.getUserMaxBet()`
- [ ] Update `gamblingHandler.js` (all games) to use `db.getUserMaxBet()`
- [ ] Test all games with custom max bet

### Phase 3: Dashboard Backend
- [ ] Add route `/limiter` (GET)
- [ ] Add route `/maxbet` (GET)
- [ ] Add API endpoints for limiter management
- [ ] Add API endpoints for max bet management
- [ ] Add audit logging for all actions

### Phase 4: Dashboard Frontend
- [ ] Create limiter list page UI
- [ ] Create max bet list page UI
- [ ] Add navigation links
- [ ] Add modals for actions
- [ ] Add form validation
- [ ] Add success/error notifications

### Phase 5: Testing
- [ ] Test limiter reset functionality
- [ ] Test max bet setting per user
- [ ] Test game handlers with custom max bet
- [ ] Test edge cases
- [ ] Test audit logging

---

## 🔒 SECURITY & VALIDATION

1. **Admin Only**: Semua routes harus protected dengan `checkAuth`
2. **Input Validation**: 
   - Max bet harus > 0 dan <= 100M (safety limit)
   - Level harus >= 0 dan <= 5 (jumlah levels)
3. **Audit Logging**: Semua actions harus di-log
4. **Error Handling**: Proper error messages untuk user

---

## 📊 DATA DISPLAY

### Limiter Status Calculation
```javascript
// Helper function untuk calculate limiter status
function getLimiterStatus(userId) {
    const wealth = db.getWealthStatus(userId);
    const balance = db.getBalance(userId);
    const levels = [
        { limit: 100000000, duration: 6 * 3600 * 1000 },
        { limit: 500000000, duration: 12 * 3600 * 1000 },
        { limit: 1000000000, duration: 24 * 3600 * 1000 },
        { limit: 10000000000, duration: 48 * 3600 * 1000 },
        { limit: 50000000000, duration: 72 * 3600 * 1000 },
        { limit: 100000000000, duration: 120 * 3600 * 1000 }
    ];
    
    const currentLevel = levels[wealth.level_cleared];
    if (!currentLevel) return { status: 'CLEARED', message: 'All levels cleared' };
    
    if (balance >= currentLevel.limit) {
        if (wealth.first_breach_time) {
            const elapsed = Date.now() - wealth.first_breach_time;
            const remaining = currentLevel.duration - elapsed;
            if (remaining <= 0) {
                return { status: 'SHOULD_CLEAR', message: 'Timer expired, should clear' };
            }
            if (balance < currentLevel.limit * 0.8) {
                return { status: 'MERCY', message: 'In mercy zone (below 80%)' };
            }
            return { 
                status: 'ACTIVE', 
                message: `Active penalty, ${Math.floor(remaining / 1000 / 60)} minutes remaining` 
            };
        }
        return { status: 'TRIGGERED', message: 'Just triggered, timer starting' };
    }
    
    return { status: 'NORMAL', message: 'Below threshold' };
}
```

---

## 🎯 PRIORITY ORDER

1. **High Priority**: 
   - Database functions untuk limiter & max bet
   - Dashboard route untuk melihat limiter
   - API untuk reset limiter

2. **Medium Priority**:
   - Update game handlers untuk custom max bet
   - Dashboard UI untuk limiter management
   - Max bet management

3. **Low Priority**:
   - User detail page
   - History tracking
   - Advanced filtering

---

## 📝 NOTES

- Max bet custom bisa digunakan untuk:
  - Limit user yang sering exploit
  - Reward user loyal (higher max bet)
  - Temporary restrictions
  
- Limiter reset bisa digunakan untuk:
  - Unban user yang kena limiter
  - Test purposes
  - Manual intervention

- Semua actions harus di-audit log untuk tracking

