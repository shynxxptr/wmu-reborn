const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'custom_roles.db');
const db = new Database(dbPath);

// --- TABEL INTI ALICE ---

// 1. Inventaris User
db.exec(`
    CREATE TABLE IF NOT EXISTS inventaris (
        user_id TEXT NOT NULL,
        jenis_tiket TEXT NOT NULL,
        jumlah INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, jenis_tiket)
    )
`);

// 2. Role Aktif
db.exec(`
    CREATE TABLE IF NOT EXISTS role_aktif (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        warning_sent INTEGER DEFAULT 0
    )
`);

// 3. Stok & Harga
db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_stock (
        jenis_tiket TEXT PRIMARY KEY,
        max_stock INTEGER DEFAULT 100,
        sold INTEGER DEFAULT 0,
        price_text TEXT DEFAULT 'Hubungi Admin',
        price_value INTEGER DEFAULT 0,
        last_price_value INTEGER DEFAULT 0,
        restock_date TEXT DEFAULT '-'
    )
`);

// 4. Share Role
db.exec(`
    CREATE TABLE IF NOT EXISTS role_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        friend_id TEXT NOT NULL
    )
`);

// --- TAMBAHAN FITUR BARU ---

// 5. Flash Sale (Ticket Box)
db.exec(`
    CREATE TABLE IF NOT EXISTS flash_sales (
        message_id TEXT PRIMARY KEY,
        item_name TEXT,
        price TEXT,
        max_slots INTEGER,
        claimed INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
    )
`);
db.exec(`
    CREATE TABLE IF NOT EXISTS flash_buyers (
        message_id TEXT,
        user_id TEXT,
        channel_id TEXT,
        PRIMARY KEY (message_id, user_id)
    )
`);

// 6. Giveaway (Support Reroll)
db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
        message_id TEXT PRIMARY KEY,
        channel_id TEXT,
        prize_ticket TEXT,
        created_at INTEGER
    )
`);
db.exec(`
    CREATE TABLE IF NOT EXISTS giveaway_participants (
        message_id TEXT,
        user_id TEXT,
        PRIMARY KEY (message_id, user_id)
    )
`);

// 8. Wealth Limiter (Sistem Rungkad Bertingkat)
db.exec(`
    CREATE TABLE IF NOT EXISTS user_wealth_limits (
        user_id TEXT PRIMARY KEY,
        level_cleared INTEGER DEFAULT 0,
        first_breach_time INTEGER DEFAULT NULL
    )
`);

// --- WEALTH LIMITER HELPERS ---
db.getWealthStatus = (userId) => {
    let row = db.prepare('SELECT * FROM user_wealth_limits WHERE user_id = ?').get(userId);
    if (!row) {
        db.prepare('INSERT INTO user_wealth_limits (user_id) VALUES (?)').run(userId);
        row = { user_id: userId, level_cleared: 0, first_breach_time: null };
    }
    return row;
};

db.updateWealthStatus = (userId, levelCleared, firstBreachTime) => {
    db.prepare('UPDATE user_wealth_limits SET level_cleared = ?, first_breach_time = ? WHERE user_id = ?')
        .run(levelCleared, firstBreachTime, userId);
};

// 9. User Max Bet (Custom Max Bet Per User)
db.exec(`
    CREATE TABLE IF NOT EXISTS user_max_bet (
        user_id TEXT PRIMARY KEY,
        max_bet_amount INTEGER DEFAULT 10000000,
        is_custom INTEGER DEFAULT 0,
        set_by TEXT,
        set_at INTEGER
    )
`);

// --- MAX BET HELPERS ---
db.getUserMaxBet = (userId) => {
    try {
        const row = db.prepare('SELECT * FROM user_max_bet WHERE user_id = ?').get(userId);
        if (row && row.is_custom === 1) {
            return row.max_bet_amount;
        }
        return 10000000; // Global default
    } catch (e) { return 10000000; }
};

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
    } catch (e) { 
        console.error('Error setting user max bet:', e);
        return false; 
    }
};

db.resetUserMaxBet = (userId) => {
    try {
        db.prepare('DELETE FROM user_max_bet WHERE user_id = ?').run(userId);
        return true;
    } catch (e) { 
        console.error('Error resetting user max bet:', e);
        return false; 
    }
};

db.getUsersWithCustomMaxBet = () => {
    try {
        return db.prepare('SELECT * FROM user_max_bet WHERE is_custom = 1 ORDER BY set_at DESC').all();
    } catch (e) { 
        console.error('Error getting users with custom max bet:', e);
        return []; 
    }
};

// --- WEALTH LIMITER MANAGEMENT HELPERS ---
db.getUsersWithActiveLimiter = () => {
    try {
        // Get all users with wealth limits and their balances
        const allLimits = db.prepare(`
            SELECT w.*, e.uang_jajan as balance
            FROM user_wealth_limits w
            LEFT JOIN user_economy e ON w.user_id = e.user_id
            WHERE w.first_breach_time IS NOT NULL
        `).all();
        
        // Filter to only active limiters (balance >= threshold for their level)
        const levels = [
            { limit: 100000000, duration: 6 * 3600 * 1000 },      // 100 Juta - 6 Jam
            { limit: 500000000, duration: 12 * 3600 * 1000 },    // 500 Juta - 12 Jam
            { limit: 1000000000, duration: 24 * 3600 * 1000 },    // 1 Milyar - 24 Jam
            { limit: 10000000000, duration: 48 * 3600 * 1000 },   // 10 Milyar - 2 Hari
            { limit: 50000000000, duration: 72 * 3600 * 1000 },  // 50 Milyar - 3 Hari
            { limit: 100000000000, duration: 120 * 3600 * 1000 }, // 100 Milyar - 5 Hari
            { limit: 500000000000, duration: 168 * 3600 * 1000 }, // 500 Milyar - 7 Hari
            { limit: 1000000000000, duration: 240 * 3600 * 1000 }, // 1 Triliun - 10 Hari
            { limit: 5000000000000, duration: 336 * 3600 * 1000 }, // 5 Triliun - 14 Hari
            { limit: 10000000000000, duration: 480 * 3600 * 1000 }  // 10 Triliun - 20 Hari
        ];
        
        const active = [];
        for (const w of allLimits) {
            const balance = w.balance || 0;
            const levelIdx = w.level_cleared;
            
            if (levelIdx < levels.length) {
                const threshold = levels[levelIdx].limit;
                if (balance >= threshold * 0.8) { // Include mercy zone
                    active.push({
                        ...w,
                        threshold,
                        duration: levels[levelIdx].duration
                    });
                }
            }
        }
        
        return active;
    } catch (e) {
        console.error('Error getting users with active limiter:', e);
        return [];
    }
};

db.resetUserLimiter = (userId, newLevel = null) => {
    try {
        if (newLevel === null) {
            // Full reset: level = 0, timer = null
            db.prepare('UPDATE user_wealth_limits SET level_cleared = 0, first_breach_time = NULL WHERE user_id = ?').run(userId);
        } else {
            // Set ke level tertentu
            db.prepare('UPDATE user_wealth_limits SET level_cleared = ?, first_breach_time = NULL WHERE user_id = ?').run(newLevel, userId);
        }
        return true;
    } catch (e) {
        console.error('Error resetting user limiter:', e);
        return false;
    }
};

db.setUserLimiterLevel = (userId, level) => {
    try {
        // Ensure user exists in table
        db.getWealthStatus(userId);
        db.prepare('UPDATE user_wealth_limits SET level_cleared = ?, first_breach_time = NULL WHERE user_id = ?').run(level, userId);
        return true;
    } catch (e) {
        console.error('Error setting user limiter level:', e);
        return false;
    }
};

db.clearUserLimiterTimer = (userId) => {
    try {
        db.prepare('UPDATE user_wealth_limits SET first_breach_time = NULL WHERE user_id = ?').run(userId);
        return true;
    } catch (e) {
        console.error('Error clearing user limiter timer:', e);
        return false;
    }
};

// 7. Audit Logs (Moderation)
db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_tag TEXT,
        target_id TEXT,
        details TEXT,
        timestamp INTEGER NOT NULL
    )
`);

db.addAuditLog = (actionType, userId, userTag, targetId, details) => {
    try {
        db.prepare(`
            INSERT INTO audit_logs (action_type, user_id, user_tag, target_id, details, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(actionType, userId, userTag || null, targetId || null, details || null, Date.now());
        return true;
    } catch (e) {
        console.error('Error adding audit log:', e);
        return false;
    }
};

db.getAuditLogs = (limit = 100, actionType = null) => {
    try {
        if (actionType) {
            return db.prepare(`
                SELECT * FROM audit_logs 
                WHERE action_type = ?
                ORDER BY timestamp DESC 
                LIMIT ?
            `).all(actionType, limit);
        }
        return db.prepare(`
            SELECT * FROM audit_logs 
            ORDER BY timestamp DESC 
            LIMIT ?
        `).all(limit);
    } catch (e) {
        return [];
    }
};

// 8. User Economy (Uang Jajan)
db.exec(`
    CREATE TABLE IF NOT EXISTS user_economy (
        user_id TEXT PRIMARY KEY,
        uang_jajan INTEGER DEFAULT 0,
        last_work_count INTEGER DEFAULT 0,
        last_work_time INTEGER DEFAULT 0,
        hunger INTEGER DEFAULT 0,
        thirst INTEGER DEFAULT 0,
        stress INTEGER DEFAULT 0
    )
`);

// MIGRATION: Add columns if not exist (for existing DB)
// Wrap each in try-catch to ensure one failure (e.g. column exists) doesn't stop others
try { db.prepare('ALTER TABLE user_economy ADD COLUMN hunger INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_economy ADD COLUMN thirst INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_economy ADD COLUMN stress INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_economy ADD COLUMN luck_boost INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_economy ADD COLUMN luck_expiration INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_economy ADD COLUMN daily_transfer_total INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_economy ADD COLUMN last_transfer_day TEXT DEFAULT NULL').run(); } catch (e) { }

// 9. User Achievements
db.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at INTEGER NOT NULL,
        claimed INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, achievement_id)
    )
`);

// 10. User Stats (for achievement tracking)
db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY,
        total_work INTEGER DEFAULT 0,
        total_gambles INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        total_food_bought INTEGER DEFAULT 0,
        total_smokes INTEGER DEFAULT 0,
        total_alcohol INTEGER DEFAULT 0,
        unique_transfers TEXT DEFAULT '[]',
        consecutive_wins INTEGER DEFAULT 0,
        highest_balance INTEGER DEFAULT 0,
        -- TRYHARD STATS TRACKING
        best_combo_bom INTEGER DEFAULT 0,
        best_combo_math INTEGER DEFAULT 0,
        best_combo_saham INTEGER DEFAULT 0,
        best_streak_coinflip INTEGER DEFAULT 0,
        best_timing_slots REAL DEFAULT 0,
        total_games_bom INTEGER DEFAULT 0,
        total_games_math INTEGER DEFAULT 0,
        total_games_saham INTEGER DEFAULT 0,
        total_games_coinflip INTEGER DEFAULT 0,
        total_games_slots INTEGER DEFAULT 0,
        total_games_bigslot INTEGER DEFAULT 0,
        total_wins_bom INTEGER DEFAULT 0,
        total_wins_math INTEGER DEFAULT 0,
        total_wins_saham INTEGER DEFAULT 0,
        total_wins_coinflip INTEGER DEFAULT 0,
        total_wins_slots INTEGER DEFAULT 0,
        total_wins_bigslot INTEGER DEFAULT 0
    )
`);

// MIGRATION: Add columns if not exist
try { db.prepare('ALTER TABLE user_stats ADD COLUMN best_combo_bom INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN best_combo_math INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN best_combo_saham INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN best_streak_coinflip INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN best_timing_slots REAL DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_games_bom INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_games_math INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_games_saham INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_games_coinflip INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_games_slots INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_games_bigslot INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_wins_bom INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_wins_math INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_wins_saham INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_wins_coinflip INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_wins_slots INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_stats ADD COLUMN total_wins_bigslot INTEGER DEFAULT 0').run(); } catch (e) { }

// Ensure all columns exist (defensive check)
try {
    const columns = db.prepare("PRAGMA table_info(user_stats)").all();
    const columnNames = columns.map(c => c.name);
    const requiredColumns = [
        'best_combo_bom', 'best_combo_math', 'best_combo_saham',
        'best_streak_coinflip', 'best_timing_slots',
        'total_games_bom', 'total_games_math', 'total_games_saham',
        'total_games_coinflip', 'total_games_slots', 'total_games_bigslot',
        'total_wins_bom', 'total_wins_math', 'total_wins_saham',
        'total_wins_coinflip', 'total_wins_slots', 'total_wins_bigslot'
    ];
    
    for (const col of requiredColumns) {
        if (!columnNames.includes(col)) {
            console.warn(`[DB MIGRATION] Missing column: ${col}, attempting to add...`);
            try {
                const colType = col.includes('timing') ? 'REAL' : 'INTEGER';
                db.prepare(`ALTER TABLE user_stats ADD COLUMN ${col} ${colType} DEFAULT 0`).run();
            } catch (e) {
                console.error(`[DB MIGRATION] Failed to add column ${col}:`, e.message);
            }
        }
    }
} catch (e) {
    console.error('[DB MIGRATION CHECK ERROR]', e);
}

// --- INISIALISASI DATA ---
const { TIKET_CONFIG } = require('./utils/helpers.js');
try {
    const cekStok = db.prepare('SELECT count(*) as c FROM ticket_stock').get();
    if (cekStok.c === 0) {
        const insertStok = db.prepare('INSERT INTO ticket_stock (jenis_tiket) VALUES (?)');
        Object.keys(TIKET_CONFIG).forEach(k => insertStok.run(k));
        console.log('📦 [DATABASE] Stok awal diinisialisasi.');
    }
} catch (e) {
    console.log('⚠️ [DATABASE] Skip init stok (Config belum siap).');
}

console.log('✅ [DATABASE] Siap & Terhubung.');
// 9. System Variables (Global Jackpot, etc.)
db.exec(`
    CREATE TABLE IF NOT EXISTS system_vars (
        key TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0
    )
`);

// Initialize Jackpot if not exists
try {
    const checkJackpot = db.prepare("SELECT value FROM system_vars WHERE key = 'global_jackpot'").get();
    if (!checkJackpot) {
        db.prepare("INSERT INTO system_vars (key, value) VALUES ('global_jackpot', 0)").run();
    }
} catch (e) {
    console.error("Error initializing jackpot:", e);
}

// Helper Methods for Jackpot
db.addJackpot = (amount) => {
    try {
        db.prepare("UPDATE system_vars SET value = value + ? WHERE key = 'global_jackpot'").run(amount);
    } catch (e) { }
};

db.getJackpot = () => {
    try {
        const res = db.prepare("SELECT value FROM system_vars WHERE key = 'global_jackpot'").get();
        return res ? res.value : 0;
    } catch (e) { return 0; }
};

db.resetJackpot = () => {
    try {
        db.prepare("UPDATE system_vars SET value = 0 WHERE key = 'global_jackpot'").run();
    } catch (e) { }
};

// 10. Raffle System
db.exec(`
    CREATE TABLE IF NOT EXISTS raffle_participants (
        user_id TEXT PRIMARY KEY,
        ticket_count INTEGER DEFAULT 0
    )
`);

// Helper Methods for Raffle
db.buyRaffleTicket = (userId, count, price) => {
    try {
        const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
        const totalCost = count * price;

        if (!user || user.uang_jajan < totalCost) return { success: false, error: 'Uang tidak cukup' };

        db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(totalCost, userId);

        // Add to pot
        db.prepare("INSERT OR IGNORE INTO system_vars (key, value) VALUES ('raffle_pot', 0)").run();
        db.prepare("UPDATE system_vars SET value = value + ? WHERE key = 'raffle_pot'").run(totalCost);

        // Add tickets
        db.prepare('INSERT INTO raffle_participants (user_id, ticket_count) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET ticket_count = ticket_count + ?').run(userId, count, count);

        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Database error' };
    }
};

db.getRaffleData = () => {
    try {
        const pot = db.prepare("SELECT value FROM system_vars WHERE key = 'raffle_pot'").get()?.value || 0;
        const totalTickets = db.prepare("SELECT SUM(ticket_count) as total FROM raffle_participants").get()?.total || 0;
        return { pot, totalTickets };
    } catch (e) { return { pot: 0, totalTickets: 0 }; }
};

db.drawRaffleWinner = () => {
    try {
        const participants = db.prepare("SELECT * FROM raffle_participants").all();
        if (participants.length === 0) return null;

        const totalTickets = participants.reduce((sum, p) => sum + p.ticket_count, 0);
        let random = Math.floor(Math.random() * totalTickets);

        for (const p of participants) {
            random -= p.ticket_count;
            if (random < 0) return p.user_id;
        }
        return participants[participants.length - 1].user_id;
    } catch (e) { return null; }
};

db.resetRaffle = () => {
    try {
        db.prepare("DELETE FROM raffle_participants").run();
        db.prepare("UPDATE system_vars SET value = 0 WHERE key = 'raffle_pot'").run();
    } catch (e) { }
};

// 11. Coin Ujang Migration
try { db.prepare('ALTER TABLE user_economy ADD COLUMN coin_ujang INTEGER DEFAULT 0').run(); } catch (e) { }

// Helper Methods for Coin Ujang
db.exchangeCoin = (userId, amount) => {
    try {
        const rate = 10000000; // 1 Coin = 10 Juta
        const cost = amount * rate;

        const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
        if (!user || user.uang_jajan < cost) return { success: false, error: 'Saldo tidak cukup' };

        db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ?, coin_ujang = coin_ujang + ? WHERE user_id = ?').run(cost, amount, userId);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Database error' };
    }
};

db.buyCustomRoleTicket = (userId, durationCode) => {
    // Duration Code: '1d', '3d', '7d', '10d', '30d'
    const prices = { '1d': 1, '3d': 3, '7d': 5, '10d': 10, '30d': 20 };
    const price = prices[durationCode];

    if (!price) return { success: false, error: 'Durasi tidak valid' };

    try {
        const user = db.prepare('SELECT coin_ujang FROM user_economy WHERE user_id = ?').get(userId);
        if (!user || user.coin_ujang < price) return { success: false, error: 'Coin Ujang tidak cukup' };

        // Deduct Coin
        db.prepare('UPDATE user_economy SET coin_ujang = coin_ujang - ? WHERE user_id = ?').run(price, userId);

        // Add to Inventory
        db.prepare(`
            INSERT INTO inventaris (user_id, jenis_tiket, jumlah) VALUES (?, ?, 1)
            ON CONFLICT(user_id, jenis_tiket) DO UPDATE SET jumlah = jumlah + 1
        `).run(userId, durationCode);

        return { success: true, price };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Database error' };
    }
};

// 12. User Effects (Black Market)
db.exec(`
    CREATE TABLE IF NOT EXISTS user_effects (
        user_id TEXT,
        effect_type TEXT,
        expires_at INTEGER,
        PRIMARY KEY (user_id, effect_type)
    )
`);

// Helper Methods for Effects
db.addEffect = (userId, type, durationMs) => {
    try {
        const expiresAt = Date.now() + durationMs;
        db.prepare(`
            INSERT INTO user_effects (user_id, effect_type, expires_at) VALUES (?, ?, ?)
            ON CONFLICT(user_id, effect_type) DO UPDATE SET expires_at = ?
        `).run(userId, type, expiresAt, expiresAt);
        return true;
    } catch (e) { return false; }
};

db.getEffect = (userId, type) => {
    try {
        const effect = db.prepare('SELECT expires_at FROM user_effects WHERE user_id = ? AND effect_type = ?').get(userId, type);
        if (!effect) return null;

        if (Date.now() > effect.expires_at) {
            db.prepare('DELETE FROM user_effects WHERE user_id = ? AND effect_type = ?').run(userId, type);
            return null;
        }
        return effect;
    } catch (e) { return null; }
};

// 13. System Variable Helpers (Generic)
db.getSystemVar = (key, defaultValue) => {
    try {
        const res = db.prepare("SELECT value FROM system_vars WHERE key = ?").get(key);
        return res ? res.value : defaultValue;
    } catch (e) { return defaultValue; }
};

db.setSystemVar = (key, value) => {
    try {
        db.prepare("INSERT INTO system_vars (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?").run(key, value, value);
        return true;
    } catch (e) { return false; }
};

// Initialize Black Market Defaults
try {
    if (db.getSystemVar('bm_start_hour', -1) === -1) db.setSystemVar('bm_start_hour', 0);
    if (db.getSystemVar('bm_end_hour', -1) === -1) db.setSystemVar('bm_end_hour', 5);
    if (db.getSystemVar('price_jimat_judi', -1) === -1) db.setSystemVar('price_jimat_judi', 5);
    if (db.getSystemVar('price_pelicin', -1) === -1) db.setSystemVar('price_pelicin', 3);
} catch (e) { }

// 14. Khodam System
db.exec(`
    CREATE TABLE IF NOT EXISTS user_khodams (
        user_id TEXT PRIMARY KEY,
        khodam_name TEXT,
        rarity TEXT,
        acquired_at INTEGER
    )
`);

db.setKhodam = (userId, name, rarity) => {
    try {
        db.prepare(`
            INSERT INTO user_khodams (user_id, khodam_name, rarity, acquired_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET khodam_name = ?, rarity = ?, acquired_at = ?
        `).run(userId, name, rarity, Date.now(), name, rarity, Date.now());
        return true;
    } catch (e) { return false; }
};

db.getKhodam = (userId) => {
    try {
        return db.prepare('SELECT * FROM user_khodams WHERE user_id = ?').get(userId);
    } catch (e) { return null; }
};

db.deleteKhodam = (userId) => {
    try {
        db.prepare('DELETE FROM user_khodams WHERE user_id = ?').run(userId);
        return true;
    } catch (e) { return false; }
};

// COOLDOWN SYSTEM - Added for daily/weekly features
db.exec(`
    CREATE TABLE IF NOT EXISTS user_cooldowns (
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        last_used INTEGER NOT NULL,
        PRIMARY KEY (user_id, action_type)
    )
`);

// LUXURY ITEMS BUFFS - Track active buffs from consumable luxury items
db.exec(`
    CREATE TABLE IF NOT EXISTS user_luxury_buffs (
        user_id TEXT NOT NULL,
        buff_type TEXT NOT NULL,
        buff_value REAL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, buff_type)
    )
`);

// GENG SYSTEM (Guild/School Gang)
db.exec(`
    CREATE TABLE IF NOT EXISTS gengs (
        geng_id TEXT PRIMARY KEY,
        geng_name TEXT NOT NULL,
        leader_id TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        bank_balance INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        weekly_upkeep_paid INTEGER DEFAULT 0,
        last_upkeep_date INTEGER
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS geng_members (
        geng_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at INTEGER NOT NULL,
        PRIMARY KEY (geng_id, user_id),
        FOREIGN KEY (geng_id) REFERENCES gengs(geng_id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS geng_buffs (
        geng_id TEXT NOT NULL,
        buff_type TEXT NOT NULL,
        buff_value REAL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (geng_id, buff_type),
        FOREIGN KEY (geng_id) REFERENCES gengs(geng_id)
    )
`);

db.getCooldown = (userId, actionType) => {
    try {
        const row = db.prepare('SELECT last_used FROM user_cooldowns WHERE user_id = ? AND action_type = ?').get(userId, actionType);
        return row ? row.last_used : null;
    } catch (e) { return null; }
};

db.setCooldown = (userId, actionType, timestamp = null) => {
    try {
        const time = timestamp || Date.now();
        db.prepare(`
            INSERT INTO user_cooldowns (user_id, action_type, last_used) VALUES (?, ?, ?)
            ON CONFLICT(user_id, action_type) DO UPDATE SET last_used = ?
        `).run(userId, actionType, time, time);
        return true;
    } catch (e) { return false; }
};

// 15. JAIL SYSTEM
db.exec(`
    CREATE TABLE IF NOT EXISTS user_jail (
        user_id TEXT PRIMARY KEY,
        release_time INTEGER NOT NULL,
        reason TEXT
    )
`);

db.jailUser = (userId, durationMs, reason = 'Kriminal') => {
    try {
        const releaseTime = Date.now() + durationMs;
        db.prepare(`
            INSERT INTO user_jail (user_id, release_time, reason) VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET release_time = ?, reason = ?
        `).run(userId, releaseTime, reason, releaseTime, reason);
        return true;
    } catch (e) { return false; }
};

db.isJailed = (userId) => {
    try {
        const jail = db.prepare('SELECT release_time, reason FROM user_jail WHERE user_id = ?').get(userId);
        if (!jail) return null;

        if (Date.now() > jail.release_time) {
            db.prepare('DELETE FROM user_jail WHERE user_id = ?').run(userId);
            return null;
        }
        return jail;
    } catch (e) { return null; }
};

// 16. HEIST COOLDOWN (Global or Per User)
// Using existing user_cooldowns table with 'heist' action_type

// 17. LEADERBOARD BLACKLIST
db.exec(`
    CREATE TABLE IF NOT EXISTS leaderboard_blacklist (
        user_id TEXT PRIMARY KEY
    )
`);

db.blacklistUser = (userId) => {
    try {
        db.prepare('INSERT OR IGNORE INTO leaderboard_blacklist (user_id) VALUES (?)').run(userId);
        return true;
    } catch (e) { return false; }
};

db.unblacklistUser = (userId) => {
    try {
        db.prepare('DELETE FROM leaderboard_blacklist WHERE user_id = ?').run(userId);
        return true;
    } catch (e) { return false; }
};

db.isBlacklisted = (userId) => {
    try {
        const row = db.prepare('SELECT user_id FROM leaderboard_blacklist WHERE user_id = ?').get(userId);
        return !!row;
    } catch (e) { return false; }
};

// OVERRIDE getTopBalances to exclude blacklisted users
// 18. BOT ADMINS
db.exec(`
    CREATE TABLE IF NOT EXISTS bot_admins (
        user_id TEXT PRIMARY KEY,
        added_by TEXT,
        added_at INTEGER
    )
`);

// Seed Initial Admin
try {
    const initialAdmin = '1353265172973617204';
    db.prepare('INSERT OR IGNORE INTO bot_admins (user_id, added_by, added_at) VALUES (?, ?, ?)').run(initialAdmin, 'SYSTEM', Date.now());
} catch (e) { }

db.addAdmin = (userId, addedBy) => {
    try {
        db.prepare('INSERT OR IGNORE INTO bot_admins (user_id, added_by, added_at) VALUES (?, ?, ?)').run(userId, addedBy, Date.now());
        // Admin tetap punya dompet (fake dompet untuk bermain)
        // Tapi tidak bisa menerima transfer dari user lain
        return true;
    } catch (e) { return false; }
};

db.removeAdmin = (userId) => {
    try {
        db.prepare('DELETE FROM bot_admins WHERE user_id = ?').run(userId);
        return true;
    } catch (e) { return false; }
};

db.isAdmin = (userId) => {
    try {
        const row = db.prepare('SELECT user_id FROM bot_admins WHERE user_id = ?').get(userId);
        return !!row;
    } catch (e) { return false; }
};

db.getAdmins = () => {
    try {
        return db.prepare('SELECT * FROM bot_admins').all();
    } catch (e) { return []; }
};

db.getTopBalances = (limit = 10) => {
    try {
        return db.prepare(`
            SELECT user_id, uang_jajan 
            FROM user_economy 
            WHERE user_id NOT IN (SELECT user_id FROM leaderboard_blacklist)
            AND user_id NOT IN (SELECT user_id FROM bot_admins)
            ORDER BY uang_jajan DESC 
            LIMIT ?
        `).all(limit);
    } catch (e) { return []; }
};

// 19. LUCK PENALTY SYSTEM
db.exec(`
    CREATE TABLE IF NOT EXISTS user_luck_penalty (
        user_id TEXT PRIMARY KEY,
        penalty_value INTEGER DEFAULT 0
    )
`);

// Configurable Threshold
try {
    if (db.getSystemVar('auto_penalty_threshold', -1) === -1) {
        db.setSystemVar('auto_penalty_threshold', 1000000000); // 1 Milyar
    }
} catch (e) { }

db.setPenalty = (userId, value) => {
    try {
        db.prepare(`
            INSERT INTO user_luck_penalty (user_id, penalty_value) VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET penalty_value = ?
        `).run(userId, value, value);
        return true;
    } catch (e) { return false; }
};

db.getPenalty = (userId) => {
    try {
        const row = db.prepare('SELECT penalty_value FROM user_luck_penalty WHERE user_id = ?').get(userId);
        return row ? row.penalty_value : 0;
    } catch (e) { return 0; }
};

// 20. BANSOS SYSTEM
db.distributeBansos = (amount) => {
    try {
        const info = db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ?').run(amount);
        return { success: true, changes: info.changes };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Database error' };
    }
};

db.addSaldo = (userId, amount) => {
    try {
        const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
        if (!user) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(userId);
        db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, userId);
        return true;
    } catch (e) { return false; }
};

// 21. EVENT SYSTEM (Dual Wallet)
db.exec(`
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        entry_fee INTEGER DEFAULT 0,
        initial_balance INTEGER DEFAULT 0,
        start_time INTEGER,
        end_time INTEGER,
        is_active INTEGER DEFAULT 1,
        created_by TEXT
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS event_participants (
        event_id INTEGER,
        user_id TEXT,
        event_balance INTEGER DEFAULT 0,
        joined_at INTEGER,
        PRIMARY KEY (event_id, user_id)
    )
`);

// --- CORE DUAL WALLET LOGIC ---

// Get active event for a user (if they joined)
db.getUserActiveEvent = (userId) => {
    try {
        const event = db.prepare(`
            SELECT e.*, ep.event_balance 
            FROM events e 
            JOIN event_participants ep ON e.id = ep.event_id 
            WHERE ep.user_id = ? AND e.is_active = 1
        `).get(userId);
        return event;
    } catch (e) { return null; }
};

// Get Balance (Smart Switch)
db.getBalance = (userId) => {
    try {
        const event = db.getUserActiveEvent(userId);
        if (event) return event.event_balance;

        const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
        return user ? user.uang_jajan : 0;
    } catch (e) { return 0; }
};

// Update Balance (Smart Switch)
db.updateBalance = (userId, amount) => {
    try {
        const event = db.getUserActiveEvent(userId);

        if (event) {
            // Update Event Wallet
            db.prepare('UPDATE event_participants SET event_balance = event_balance + ? WHERE user_id = ? AND event_id = ?').run(amount, userId, event.id);
            return { success: true, wallet: 'event', newBalance: event.event_balance + amount };
        } else {
            // Update Main Wallet
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            if (!user) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(userId);

            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, userId);
            return { success: true, wallet: 'main', newBalance: (user ? user.uang_jajan : 0) + amount };
        }
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Database error' };
    }
};

// --- EVENT MANAGEMENT ---

db.createEvent = (name, fee, initialBalance, durationHours, creatorId) => {
    try {
        // Deactivate other events first (Single Event Rule)
        db.prepare('UPDATE events SET is_active = 0 WHERE is_active = 1').run();

        const startTime = Date.now();
        const endTime = startTime + (durationHours * 60 * 60 * 1000);

        const info = db.prepare(`
            INSERT INTO events (name, entry_fee, initial_balance, start_time, end_time, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(name, fee, initialBalance, startTime, endTime, creatorId);

        return { success: true, eventId: info.lastInsertRowid };
    } catch (e) { return { success: false, error: e.message }; }
};

db.joinEvent = (userId, eventId) => {
    try {
        const event = db.prepare('SELECT * FROM events WHERE id = ? AND is_active = 1').get(eventId);
        if (!event) return { success: false, error: 'Event tidak aktif/ditemukan.' };

        // Check if already joined
        const existing = db.prepare('SELECT * FROM event_participants WHERE user_id = ? AND event_id = ?').get(userId, eventId);
        if (existing) return { success: false, error: 'Sudah join event ini.' };

        // Check Fee
        if (event.entry_fee > 0) {
            const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
            if (!user || user.uang_jajan < event.entry_fee) {
                return { success: false, error: `Uang kurang! Butuh Rp ${event.entry_fee.toLocaleString('id-ID')}.` };
            }
            // Deduct Fee from MAIN WALLET
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(event.entry_fee, userId);
        }

        // Add to Participants with Initial Balance
        db.prepare(`
            INSERT INTO event_participants (event_id, user_id, event_balance, joined_at)
            VALUES (?, ?, ?, ?)
        `).run(eventId, userId, event.initial_balance, Date.now());

        return { success: true, eventName: event.name, initialBalance: event.initial_balance };
    } catch (e) { return { success: false, error: e.message }; }
};

db.stopEvent = (eventId) => {
    try {
        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
        if (!event) return { success: false, error: 'Event tidak ditemukan.' };

        // 1. Deactivate
        db.prepare('UPDATE events SET is_active = 0 WHERE id = ?').run(eventId);

        // 2. Distribute 10% of remaining event balance to main wallet
        const participants = db.prepare('SELECT * FROM event_participants WHERE event_id = ?').all(eventId);
        let count = 0;

        const transferStmt = db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?');

        for (const p of participants) {
            if (p.event_balance > 0) {
                const transferAmount = Math.floor(p.event_balance * 0.1); // 10%
                if (transferAmount > 0) {
                    transferStmt.run(transferAmount, p.user_id);
                    count++;
                }
            }
        }

        return { success: true, processed: count };
    } catch (e) { return { success: false, error: e.message }; }
};

db.getEventLeaderboard = (eventId) => {
    try {
        return db.prepare(`
            SELECT user_id, event_balance as uang_jajan 
            FROM event_participants 
            WHERE event_id = ? 
            ORDER BY event_balance DESC 
            LIMIT 100
        `).all(eventId);
    } catch (e) { return []; }
};

db.getActiveEvent = () => {
    try {
        return db.prepare('SELECT * FROM events WHERE is_active = 1').get();
    } catch (e) { return null; }
};

db.kickFromEvent = (userId, eventId) => {
    try {
        db.prepare('DELETE FROM event_participants WHERE user_id = ? AND event_id = ?').run(userId, eventId);
        return true;
    } catch (e) { return false; }
};

// 22. DAILY MISSIONS SYSTEM
db.exec(`
    CREATE TABLE IF NOT EXISTS daily_missions (
        user_id TEXT PRIMARY KEY,
        missions TEXT,
        last_updated INTEGER
    )
`);

db.getMissions = (userId) => {
    try {
        const row = db.prepare('SELECT * FROM daily_missions WHERE user_id = ?').get(userId);
        return row;
    } catch (e) { return null; }
};

db.saveMissions = (userId, missions) => {
    try {
        db.prepare(`
            INSERT INTO daily_missions (user_id, missions, last_updated) VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET missions = ?, last_updated = ?
        `).run(userId, JSON.stringify(missions), Date.now(), JSON.stringify(missions), Date.now());
        return true;
    } catch (e) { return false; }
};

// 23. ESKUL SYSTEM
db.exec(`
    CREATE TABLE IF NOT EXISTS user_eskul (
        user_id TEXT PRIMARY KEY,
        eskul_name TEXT,
        joined_at INTEGER,
        last_payment INTEGER
    )
`);

db.joinEskul = (userId, eskulName) => {
    try {
        const now = Date.now();
        db.prepare(`
            INSERT INTO user_eskul (user_id, eskul_name, joined_at, last_payment) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET eskul_name = ?, joined_at = ?, last_payment = ?
        `).run(userId, eskulName, now, now, eskulName, now, now);
        return true;
    } catch (e) { return false; }
};

db.getEskul = (userId) => {
    try {
        const row = db.prepare('SELECT * FROM user_eskul WHERE user_id = ?').get(userId);
        return row || null;
    } catch (e) { return null; }
};

// --- BANKING SYSTEM (Money Sink Phase 1) ---
db.exec(`
    CREATE TABLE IF NOT EXISTS user_banking (
        user_id TEXT PRIMARY KEY,
        bank_balance INTEGER DEFAULT 0,
        loan_amount INTEGER DEFAULT 0,
        loan_interest_rate REAL DEFAULT 0.02,
        loan_start_time INTEGER DEFAULT 0,
        loan_due_time INTEGER DEFAULT 0,
        last_maintenance_time INTEGER DEFAULT 0,
        daily_withdraw_total INTEGER DEFAULT 0,
        last_withdraw_day TEXT DEFAULT NULL
    )
`);

// Add columns if they don't exist (migration)
try { db.prepare('ALTER TABLE user_banking ADD COLUMN daily_withdraw_total INTEGER DEFAULT 0').run(); } catch (e) { }
try { db.prepare('ALTER TABLE user_banking ADD COLUMN last_withdraw_day TEXT DEFAULT NULL').run(); } catch (e) { }

// Banking Functions
db.getBankBalance = (userId) => {
    try {
        const row = db.prepare('SELECT bank_balance FROM user_banking WHERE user_id = ?').get(userId);
        return row ? row.bank_balance : 0;
    } catch (e) { return 0; }
};

db.depositToBank = (userId, amount) => {
    try {
        const user = db.prepare('SELECT * FROM user_banking WHERE user_id = ?').get(userId);
        if (!user) {
            db.prepare('INSERT INTO user_banking (user_id, bank_balance) VALUES (?, ?)').run(userId, amount);
        } else {
            db.prepare('UPDATE user_banking SET bank_balance = bank_balance + ? WHERE user_id = ?').run(amount, userId);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

db.withdrawFromBank = (userId, amount) => {
    try {
        const user = db.prepare('SELECT * FROM user_banking WHERE user_id = ?').get(userId);
        if (!user || user.bank_balance < amount) {
            return { success: false, error: 'Saldo bank tidak cukup' };
        }
        db.prepare('UPDATE user_banking SET bank_balance = bank_balance - ? WHERE user_id = ?').run(amount, userId);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

db.getLoan = (userId) => {
    try {
        const row = db.prepare('SELECT * FROM user_banking WHERE user_id = ?').get(userId);
        return row ? {
            loan_amount: row.loan_amount || 0,
            loan_start_time: row.loan_start_time || 0,
            loan_due_time: row.loan_due_time || 0,
            interest_rate: row.loan_interest_rate || 0.02
        } : null;
    } catch (e) { return null; }
};

db.createLoan = (userId, amount, days = 7) => {
    try {
        const now = Date.now();
        const dueTime = now + (days * 24 * 60 * 60 * 1000);
        
        const user = db.prepare('SELECT * FROM user_banking WHERE user_id = ?').get(userId);
        if (!user) {
            db.prepare('INSERT INTO user_banking (user_id, loan_amount, loan_start_time, loan_due_time) VALUES (?, ?, ?, ?)').run(userId, amount, now, dueTime);
        } else {
            if (user.loan_amount > 0) {
                return { success: false, error: 'Kamu masih punya pinjaman aktif' };
            }
            db.prepare('UPDATE user_banking SET loan_amount = ?, loan_start_time = ?, loan_due_time = ? WHERE user_id = ?').run(amount, now, dueTime, userId);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

db.payLoan = (userId, amount) => {
    try {
        const user = db.prepare('SELECT * FROM user_banking WHERE user_id = ?').get(userId);
        if (!user || user.loan_amount === 0) {
            return { success: false, error: 'Tidak ada pinjaman aktif' };
        }
        
        // Interest already calculated in handler (compound)
        // Just verify amount is sufficient
        const daysElapsed = Math.max(1, Math.floor((Date.now() - user.loan_start_time) / (24 * 60 * 60 * 1000)));
        let interest = 0;
        let remaining = user.loan_amount;
        
        // Compound interest calculation
        for (let day = 0; day < daysElapsed; day++) {
            const dailyInterest = Math.floor(remaining * user.loan_interest_rate);
            interest += dailyInterest;
            remaining += dailyInterest;
        }
        
        const totalOwed = user.loan_amount + interest;
        
        if (amount < totalOwed) {
            return { success: false, error: `Jumlah tidak cukup. Total yang harus dibayar: Rp ${totalOwed.toLocaleString('id-ID')}` };
        }
        
        // Pay loan
        db.prepare('UPDATE user_banking SET loan_amount = 0, loan_start_time = 0, loan_due_time = 0 WHERE user_id = ?').run(userId);
        return { success: true, interest: interest, daysElapsed: daysElapsed };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

// --- COMPENSATION SYSTEM ---
db.exec(`
    CREATE TABLE IF NOT EXISTS compensation_claimed (
        user_id TEXT PRIMARY KEY,
        package_type TEXT DEFAULT 'base',
        claimed_at INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS user_compensation (
        user_id TEXT PRIMARY KEY,
        package_type TEXT DEFAULT 'base',
        set_at INTEGER NOT NULL
    )
`);

// --- STATS TRACKING HELPERS ---
db.getUserStats = (userId) => {
    try {
        let stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
        if (!stats) {
            db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(userId);
            stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
        }
        return stats;
    } catch (e) {
        return null;
    }
};

db.updateUserStats = (userId, updates) => {
    try {
        const stats = db.getUserStats(userId);
        if (!stats) return false;
        
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(userId);
        
        db.prepare(`UPDATE user_stats SET ${setClause} WHERE user_id = ?`).run(...values);
        return true;
    } catch (e) {
        console.error('[STATS UPDATE ERROR]', e);
        return false;
    }
};

db.trackGamePlay = (userId, gameType, isWin = false) => {
    try {
        const stats = db.getUserStats(userId);
        const updates = {};
        updates[`total_games_${gameType}`] = (stats?.[`total_games_${gameType}`] || 0) + 1;
        if (isWin) {
            updates[`total_wins_${gameType}`] = (stats?.[`total_wins_${gameType}`] || 0) + 1;
        }
        db.updateUserStats(userId, updates);
    } catch (e) {
        console.error('[TRACK GAME ERROR]', e);
    }
};

db.updateBestCombo = (userId, gameType, comboCount) => {
    try {
        const stats = db.getUserStats(userId);
        const currentBest = stats?.[`best_combo_${gameType}`] || 0;
        if (comboCount > currentBest) {
            db.updateUserStats(userId, { [`best_combo_${gameType}`]: comboCount });
            return true; // New record!
        }
        return false;
    } catch (e) {
        return false;
    }
};

db.updateBestStreak = (userId, gameType, streakCount) => {
    try {
        const stats = db.getUserStats(userId);
        const currentBest = stats?.[`best_streak_${gameType}`] || 0;
        if (streakCount > currentBest) {
            db.updateUserStats(userId, { [`best_streak_${gameType}`]: streakCount });
            return true; // New record!
        }
        return false;
    } catch (e) {
        return false;
    }
};

db.updateBestTiming = (userId, gameType, timingScore) => {
    try {
        const stats = db.getUserStats(userId);
        const currentBest = stats?.[`best_timing_${gameType}`] || 0;
        if (timingScore > currentBest) {
            db.updateUserStats(userId, { [`best_timing_${gameType}`]: timingScore });
            return true; // New record!
        }
        return false;
    } catch (e) {
        return false;
    }
};

// --- ACHIEVEMENT HELPERS ---
db.getUserAchievements = (userId) => {
    try {
        return db.prepare('SELECT * FROM user_achievements WHERE user_id = ?').all(userId);
    } catch (e) {
        return [];
    }
};

db.hasAchievement = (userId, achievementId) => {
    try {
        const row = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(userId, achievementId);
        return !!row;
    } catch (e) {
        return false;
    }
};

db.unlockAchievement = (userId, achievementId) => {
    try {
        const exists = db.hasAchievement(userId, achievementId);
        if (!exists) {
            db.prepare('INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, claimed) VALUES (?, ?, ?, 0)')
                .run(userId, achievementId, Date.now());
            return true; // New achievement!
        }
        return false;
    } catch (e) {
        return false;
    }
};

db.claimAchievement = (userId, achievementId) => {
    try {
        db.prepare('UPDATE user_achievements SET claimed = 1 WHERE user_id = ? AND achievement_id = ?').run(userId, achievementId);
        return true;
    } catch (e) {
        return false;
    }
};

// --- LUXURY BUFFS HELPERS ---
db.addLuxuryBuff = (userId, buffType, buffValue, durationMs) => {
    try {
        const expiresAt = Date.now() + durationMs;
        db.prepare(`
            INSERT INTO user_luxury_buffs (user_id, buff_type, buff_value, expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, buff_type) DO UPDATE SET
                buff_value = ?,
                expires_at = ?
        `).run(userId, buffType, buffValue, expiresAt, buffValue, expiresAt);
        return true;
    } catch (e) {
        console.error('Error adding luxury buff:', e);
        return false;
    }
};

db.getLuxuryBuffs = (userId) => {
    try {
        const now = Date.now();
        // Clean expired buffs
        db.prepare('DELETE FROM user_luxury_buffs WHERE user_id = ? AND expires_at < ?').run(userId, now);
        // Get active buffs
        return db.prepare('SELECT * FROM user_luxury_buffs WHERE user_id = ? AND expires_at > ?').all(userId, now);
    } catch (e) {
        return [];
    }
};

db.getLuxuryBuff = (userId, buffType) => {
    try {
        const now = Date.now();
        const buff = db.prepare('SELECT * FROM user_luxury_buffs WHERE user_id = ? AND buff_type = ? AND expires_at > ?')
            .get(userId, buffType, now);
        return buff;
    } catch (e) {
        return null;
    }
};

// --- GENG HELPERS ---
db.createGeng = (gengId, gengName, leaderId) => {
    try {
        db.prepare(`
            INSERT INTO gengs (geng_id, geng_name, leader_id, created_at)
            VALUES (?, ?, ?, ?)
        `).run(gengId, gengName, leaderId, Date.now());
        
        // Add leader as member
        db.prepare(`
            INSERT INTO geng_members (geng_id, user_id, role, joined_at)
            VALUES (?, ?, 'leader', ?)
        `).run(gengId, leaderId, Date.now());
        
        return true;
    } catch (e) {
        console.error('Error creating geng:', e);
        return false;
    }
};

db.getGeng = (gengId) => {
    try {
        return db.prepare('SELECT * FROM gengs WHERE geng_id = ?').get(gengId);
    } catch (e) {
        return null;
    }
};

db.getGengByName = (gengName) => {
    try {
        return db.prepare('SELECT * FROM gengs WHERE geng_name = ?').get(gengName);
    } catch (e) {
        return null;
    }
};

db.getUserGeng = (userId) => {
    try {
        const member = db.prepare('SELECT * FROM geng_members WHERE user_id = ?').get(userId);
        if (!member) return null;
        const geng = db.getGeng(member.geng_id);
        return { ...geng, role: member.role };
    } catch (e) {
        return null;
    }
};

db.addGengMember = (gengId, userId) => {
    try {
        db.prepare(`
            INSERT INTO geng_members (geng_id, user_id, role, joined_at)
            VALUES (?, ?, 'member', ?)
        `).run(gengId, userId, Date.now());
        return true;
    } catch (e) {
        return false;
    }
};

db.removeGengMember = (gengId, userId) => {
    try {
        db.prepare('DELETE FROM geng_members WHERE geng_id = ? AND user_id = ?').run(gengId, userId);
        return true;
    } catch (e) {
        return false;
    }
};

db.getGengMembers = (gengId) => {
    try {
        return db.prepare('SELECT * FROM geng_members WHERE geng_id = ?').all(gengId);
    } catch (e) {
        return [];
    }
};

db.updateGengBank = (gengId, amount) => {
    try {
        db.prepare('UPDATE gengs SET bank_balance = bank_balance + ? WHERE geng_id = ?').run(amount, gengId);
        return true;
    } catch (e) {
        return false;
    }
};

db.upgradeGeng = (gengId) => {
    try {
        const geng = db.getGeng(gengId);
        if (!geng) return false;
        const newLevel = geng.level + 1;
        db.prepare('UPDATE gengs SET level = ? WHERE geng_id = ?').run(newLevel, gengId);
        return true;
    } catch (e) {
        return false;
    }
};

db.payGengUpkeep = (gengId) => {
    try {
        const now = Date.now();
        db.prepare('UPDATE gengs SET weekly_upkeep_paid = 1, last_upkeep_date = ? WHERE geng_id = ?')
            .run(now, gengId);
        return true;
    } catch (e) {
        return false;
    }
};

db.addGengBuff = (gengId, buffType, buffValue, durationMs) => {
    try {
        const expiresAt = Date.now() + durationMs;
        db.prepare(`
            INSERT INTO geng_buffs (geng_id, buff_type, buff_value, expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(geng_id, buff_type) DO UPDATE SET
                buff_value = ?,
                expires_at = ?
        `).run(gengId, buffType, buffValue, expiresAt, buffValue, expiresAt);
        return true;
    } catch (e) {
        return false;
    }
};

db.getGengBuffs = (gengId) => {
    try {
        const now = Date.now();
        db.prepare('DELETE FROM geng_buffs WHERE geng_id = ? AND expires_at < ?').run(gengId, now);
        return db.prepare('SELECT * FROM geng_buffs WHERE geng_id = ? AND expires_at > ?').all(gengId, now);
    } catch (e) {
        return [];
    }
};

// Weekly upkeep system
db.processGengUpkeep = () => {
    try {
        // Avoid circular dependency - hardcode config values
        const WEEKLY_UPKEEP = {
            1: 100_000,
            2: 250_000,
            3: 500_000,
            4: 1_000_000,
            5: 2_000_000
        };
        
        const allGengs = db.prepare('SELECT * FROM gengs').all();
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
        const results = { processed: 0, disbanded: 0, paid: 0 };

        allGengs.forEach(geng => {
            const lastUpkeep = geng.last_upkeep_date || geng.created_at;
            const timeSinceUpkeep = now - lastUpkeep;

            // Check if a week has passed
            if (timeSinceUpkeep >= oneWeek) {
                const upkeepCost = WEEKLY_UPKEEP[geng.level] || WEEKLY_UPKEEP[1];
                const bankBalance = geng.bank_balance || 0;

                if (bankBalance >= upkeepCost) {
                    // Deduct from bank
                    db.updateGengBank(geng.geng_id, -upkeepCost);
                    db.payGengUpkeep(geng.geng_id);
                    results.paid++;
                } else {
                    // Not enough money - disband geng
                    db.prepare('DELETE FROM geng_members WHERE geng_id = ?').run(geng.geng_id);
                    db.prepare('DELETE FROM geng_buffs WHERE geng_id = ?').run(geng.geng_id);
                    db.prepare('DELETE FROM gengs WHERE geng_id = ?').run(geng.geng_id);
                    results.disbanded++;
                }
                results.processed++;
            }
        });

        return results;
    } catch (e) {
        console.error('Error processing geng upkeep:', e);
        return { processed: 0, disbanded: 0, paid: 0, error: e.message };
    }
};

// Helper untuk cek upkeep status
db.getGengUpkeepStatus = (gengId) => {
    try {
        const geng = db.getGeng(gengId);
        if (!geng) return null;

        // Avoid circular dependency - hardcode config values
        const WEEKLY_UPKEEP = {
            1: 100_000,
            2: 250_000,
            3: 500_000,
            4: 1_000_000,
            5: 2_000_000
        };
        
        const now = Date.now();
        const lastUpkeep = geng.last_upkeep_date || geng.created_at;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const timeSinceUpkeep = now - lastUpkeep;
        const timeUntilUpkeep = oneWeek - timeSinceUpkeep;

        const upkeepCost = WEEKLY_UPKEEP[geng.level] || WEEKLY_UPKEEP[1];
        const bankBalance = geng.bank_balance || 0;
        const canPay = bankBalance >= upkeepCost;

        return {
            upkeepCost,
            bankBalance,
            canPay,
            timeUntilUpkeep: Math.max(0, timeUntilUpkeep),
            daysRemaining: Math.floor(Math.max(0, timeUntilUpkeep) / (24 * 60 * 60 * 1000))
        };
    } catch (e) {
        console.error('Error getting geng upkeep status:', e);
        return null;
    }
};

module.exports = db;

