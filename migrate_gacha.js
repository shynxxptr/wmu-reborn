const db = require('./database.js');

try {
    db.prepare(`
        INSERT OR IGNORE INTO ticket_stock (jenis_tiket, price_value, price_text, max_stock, sold) 
        VALUES ('ticket_box', 15000, 'Rp 15.000', 999, 0)
    `).run();
    console.log("✅ Database updated: ticket_box added.");
} catch (error) {
    console.error("❌ Database update failed:", error);
}
