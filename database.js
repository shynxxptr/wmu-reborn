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

module.exports = db;

