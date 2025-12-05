const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const db = require('../database.js');
const { TIKET_CONFIG } = require('../utils/helpers.js');
const config = require('../config.json');

const app = express();
const PORT = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'alice_secret_key',
    resave: false,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

function checkAuth(req, res, next) {
    if (req.session.loggedin) next();
    else res.redirect('/login');
}

// Fungsi Helper untuk Format Username
async function getUsername(client, id) {
    try {
        const user = await client.users.fetch(id);
        return user.username;
    } catch {
        return `Unknown (${id})`;
    }
}

function startDashboard(client) {

    // 1. LOGIN
    app.get('/login', (req, res) => {
        res.render('login', { error: null });
    });

    app.post('/login', (req, res) => {
        const { password } = req.body;
        if (password === config.adminPassword) {
            req.session.loggedin = true;
            res.redirect('/admin');
        } else {
            res.render('login', { error: 'Password Salah!' });
        }
    });

    app.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    });

    // 2. LANDING PAGE (PUBLIC)
    app.get('/', (req, res) => {
        // FIX: Use config.guildId if available, otherwise fallback to first guild
        const guild = config.guildId ? client.guilds.cache.get(config.guildId) : client.guilds.cache.first();
        const memberCount = guild ? guild.memberCount : 0;
        res.render('landing', { memberCount });
    });

    // 3. ADMIN DASHBOARD
    app.get('/admin', checkAuth, async (req, res) => {
        const roles = db.prepare('SELECT * FROM role_aktif').all();

        const roleData = [];
        for (const r of roles) {
            const guild = client.guilds.cache.get(r.guild_id);
            const discordRole = guild ? guild.roles.cache.get(r.role_id) : null;
            const ownerName = await getUsername(client, r.user_id);

            const shareRows = db.prepare('SELECT friend_id FROM role_shares WHERE role_id = ?').all(r.role_id);
            const sharedUsers = [];
            for (const s of shareRows) {
                const name = await getUsername(client, s.friend_id);
                sharedUsers.push(name);
            }

            roleData.push({
                dbId: r.id,
                roleId: r.role_id,
                roleName: discordRole ? discordRole.name : '⚠️ Deleted Role',
                roleColor: discordRole ? discordRole.hexColor : '#000000',
                ownerName: ownerName,
                ownerId: r.user_id,
                expiresAt: r.expires_at * 1000,
                sharedUsers: sharedUsers
            });
        }

        res.render('admin', { roleData, activeTab: 'roles' });
    });

    // 4. STOCK MANAGER
    app.get('/stocks', checkAuth, (req, res) => {
        const stocks = db.prepare('SELECT * FROM ticket_stock').all();
        res.render('admin', { stocks, TIKET_CONFIG, activeTab: 'stocks' });
    });

    // --- API ACTIONS ---

    // A. Hapus Role
    app.post('/api/delete-role', checkAuth, async (req, res) => {
        const { roleId } = req.body;
        const rData = db.prepare('SELECT * FROM role_aktif WHERE role_id = ?').get(roleId);
        if (rData) {
            const guild = client.guilds.cache.get(rData.guild_id);
            if (guild) {
                const ro = guild.roles.cache.get(roleId);
                if (ro) await ro.delete('Web Dashboard').catch(() => { });
            }
            db.prepare('DELETE FROM role_aktif WHERE role_id = ?').run(roleId);
            db.prepare('DELETE FROM role_shares WHERE role_id = ?').run(roleId);
        }
        res.redirect('/admin');
    });

    // B. MANAGE WAKTU
    app.post('/api/manage-time', checkAuth, (req, res) => {
        const { roleId, action, amount, unit } = req.body;

        let multiplier = 1;
        if (unit === 'minutes') multiplier = 60;
        if (unit === 'hours') multiplier = 3600;
        if (unit === 'days') multiplier = 86400;

        let seconds = parseInt(amount) * multiplier;
        if (action === 'sub') seconds = -seconds;

        const rData = db.prepare('SELECT expires_at FROM role_aktif WHERE role_id = ?').get(roleId);
        if (rData) {
            const newExp = rData.expires_at + seconds;
            db.prepare('UPDATE role_aktif SET expires_at = ? WHERE role_id = ?').run(newExp, roleId);
        }
        res.redirect('/admin');
    });

    // C. RESET STOK
    app.post('/api/reset-stock', checkAuth, async (req, res) => {
        const { jenis } = req.body;
        db.prepare('UPDATE ticket_stock SET sold = 0 WHERE jenis_tiket = ?').run(jenis);
        try { require('../handlers/adminHandler.js').updateLiveReport(client); } catch (e) { }
        res.redirect('/stocks');
    });

    // D. UPDATE STOK
    app.post('/api/update-stock', checkAuth, (req, res) => {
        const { jenis, max_stock, price_text, price_value } = req.body;
        const old = db.prepare('SELECT price_value FROM ticket_stock WHERE jenis_tiket = ?').get(jenis);
        db.prepare(`UPDATE ticket_stock SET max_stock=?, price_text=?, price_value=?, last_price_value=? WHERE jenis_tiket=?`)
            .run(max_stock, price_text, price_value, old.price_value, jenis);
        try { require('../handlers/adminHandler.js').updateLiveReport(client); } catch (e) { }
        res.redirect('/stocks');
    });

    // F. DOWNLOAD BACKUP
    app.get('/api/download-backup/:filename', checkAuth, (req, res) => {
        const { filename } = req.params;
        const backupPath = path.join(__dirname, '../backups', filename);

        if (fs.existsSync(backupPath)) {
            res.download(backupPath);
        } else {
            res.status(404).send('Backup file not found');
        }
    });

    app.listen(PORT, () => {
        console.log(`🌐 [WEB ADMIN] Online di http://localhost:${PORT}`);
    });
}

module.exports = startDashboard;