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
module.exports = db;