const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../database.js');
const { TIKET_CONFIG } = require('../utils/helpers.js');

// Load environment variables (fallback to config.json for backward compatibility)
try {
    require('dotenv').config({ path: '.env' });
} catch (e) {
    // dotenv optional, continue without it
}
const config = (() => {
    try {
        return require('../config.json');
    } catch (e) {
        return {};
    }
})();

const app = express();
const PORT = process.env.PORT || config.port || config.PORT || 2560;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || config.adminPassword || 'changeme';
const SESSION_SECRET = process.env.SESSION_SECRET || config.sessionSecret || crypto.randomBytes(32).toString('hex');

// Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"]
        }
    }
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true
});

app.use('/api/', limiter);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Changed to false for security
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
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

    app.post('/login', loginLimiter, (req, res) => {
        const { password } = req.body;
        if (password === ADMIN_PASSWORD) {
            req.session.loggedin = true;
            req.session.userId = req.ip; // Track login IP
            res.redirect('/admin');
        } else {
            res.render('login', { error: 'Password Salah!' });
        }
    });

    app.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    });

    // 2. ROOT REDIRECT TO LOGIN
    app.get('/', (req, res) => {
        res.redirect('/login');
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

    // 5. ECONOMY DASHBOARD
    app.get('/economy', checkAuth, async (req, res) => {
        // Total Money in Circulation
        const totalMoney = db.prepare('SELECT SUM(uang_jajan) as total FROM user_economy').get() || { total: 0 };
        
        // Total Bank Deposits
        const totalBank = db.prepare('SELECT SUM(bank_balance) as total FROM user_banking').get() || { total: 0 };
        
        // Total Active Loans
        const totalLoans = db.prepare('SELECT SUM(loan_amount) as total FROM user_banking WHERE loan_amount > 0').get() || { total: 0 };
        
        // Top 10 Richest Users
        const topUsers = db.getTopBalances(10);
        const topUsersData = [];
        for (const u of topUsers) {
            const username = await getUsername(client, u.user_id);
            const bankBalance = db.prepare('SELECT bank_balance FROM user_banking WHERE user_id = ?').get(u.user_id) || { bank_balance: 0 };
            topUsersData.push({
                username,
                userId: u.user_id,
                mainBalance: u.uang_jajan,
                bankBalance: bankBalance.bank_balance,
                total: u.uang_jajan + bankBalance.bank_balance
            });
        }
        
        // User Count
        const userCount = db.prepare('SELECT COUNT(*) as count FROM user_economy').get() || { count: 0 };
        
        // Users with balance > 10M (Maintenance eligible)
        const richUsers = db.prepare('SELECT COUNT(*) as count FROM user_economy WHERE uang_jajan > 10000000').get() || { count: 0 };
        
        // Users with balance > 100M (Rich Tax eligible)
        const ultraRich = db.prepare('SELECT COUNT(*) as count FROM user_economy WHERE uang_jajan > 100000000').get() || { count: 0 };

        res.render('admin', {
            activeTab: 'economy',
            totalMoney: totalMoney.total || 0,
            totalBank: totalBank.total || 0,
            totalLoans: totalLoans.total || 0,
            topUsers: topUsersData,
            userCount: userCount.count || 0,
            richUsers: richUsers.count || 0,
            ultraRich: ultraRich.count || 0
        });
    });

    // 6. USER MANAGEMENT
    app.get('/users', checkAuth, async (req, res) => {
        const search = req.query.search || '';
        let users = [];
        
        if (search) {
            // Search by user ID or username
            const userIds = db.prepare('SELECT user_id FROM user_economy WHERE user_id LIKE ? LIMIT 50').all(`%${search}%`);
            for (const u of userIds) {
                try {
                    const username = await getUsername(client, u.user_id);
                    const userData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(u.user_id);
                    const bankData = db.prepare('SELECT * FROM user_banking WHERE user_id = ?').get(u.user_id);
                    const jailData = db.isJailed(u.user_id);
                    const penalty = db.getPenalty(u.user_id);
                    
                    users.push({
                        userId: u.user_id,
                        username,
                        balance: userData?.uang_jajan || 0,
                        bankBalance: bankData?.bank_balance || 0,
                        loan: bankData?.loan_amount || 0,
                        isJailed: jailData !== null,
                        jailRelease: jailData?.release_time || null,
                        penalty: penalty || 0
                    });
                } catch (e) {
                    // Skip if user not found
                }
            }
        }
        
        res.render('admin', { activeTab: 'users', users, search });
    });

    // 7. MODERATION
    app.get('/moderation', checkAuth, async (req, res) => {
        // Get all jailed users
        const jailedUsers = db.prepare('SELECT * FROM user_jail WHERE release_time > ?').all(Date.now());
        const jailedData = [];
        for (const j of jailedUsers) {
            const username = await getUsername(client, j.user_id);
            jailedData.push({
                userId: j.user_id,
                username,
                reason: j.reason,
                releaseTime: j.release_time
            });
        }
        
        // Get blacklisted users (leaderboard)
        const blacklisted = db.prepare('SELECT * FROM leaderboard_blacklist').all();
        const blacklistData = [];
        for (const b of blacklisted) {
            const username = await getUsername(client, b.user_id);
            blacklistData.push({
                userId: b.user_id,
                username
            });
        }
        
        res.render('admin', { activeTab: 'moderation', jailedUsers: jailedData, blacklisted: blacklistData });
    });

    // 8. GAME STATISTICS (Placeholder - requires tracking data)
    app.get('/games', checkAuth, (req, res) => {
        // Note: Game statistics require tracking table
        // For now, show basic info from available data
        
        // Active sessions (approximate from database)
        const activeLoans = db.prepare('SELECT COUNT(*) as count FROM user_banking WHERE loan_amount > 0').get() || { count: 0 };
        const activeBankUsers = db.prepare('SELECT COUNT(*) as count FROM user_banking WHERE bank_balance > 0').get() || { count: 0 };
        
        res.render('admin', {
            activeTab: 'games',
            activeLoans: activeLoans.count || 0,
            activeBankUsers: activeBankUsers.count || 0,
            note: 'Game statistics require tracking implementation. Coming soon!'
        });
    });

    // 9. LEADERBOARD
    app.get('/leaderboard', checkAuth, async (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const topUsers = db.getTopBalances(limit);
        const topUsersData = [];
        
        for (const u of topUsers) {
            const username = await getUsername(client, u.user_id);
            const bankBalance = db.prepare('SELECT bank_balance FROM user_banking WHERE user_id = ?').get(u.user_id) || { bank_balance: 0 };
            const isBlacklisted = db.isBlacklisted(u.user_id);
            const isAdmin = db.isAdmin(u.user_id);
            
            topUsersData.push({
                rank: topUsersData.length + 1,
                username,
                userId: u.user_id,
                mainBalance: u.uang_jajan,
                bankBalance: bankBalance.bank_balance,
                total: u.uang_jajan + bankBalance.bank_balance,
                isBlacklisted,
                isAdmin
            });
        }
        
        // Get admin wallets separately (fake wallets)
        const allAdmins = db.getAdmins();
        const adminWallets = [];
        for (const admin of allAdmins) {
            const username = await getUsername(client, admin.user_id);
            const userEcon = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(admin.user_id);
            const bankBalance = db.prepare('SELECT bank_balance FROM user_banking WHERE user_id = ?').get(admin.user_id) || { bank_balance: 0 };
            
            if (userEcon) {
                adminWallets.push({
                    username,
                    userId: admin.user_id,
                    mainBalance: userEcon.uang_jajan,
                    bankBalance: bankBalance.bank_balance,
                    total: userEcon.uang_jajan + bankBalance.bank_balance,
                    isAdmin: true
                });
            }
        }
        
        res.render('admin', { activeTab: 'leaderboard', topUsers: topUsersData, adminWallets, limit });
    });

    // 10. ACTIVITY LOGS
    app.get('/logs', checkAuth, async (req, res) => {
        const limit = parseInt(req.query.limit) || 100;
        const actionType = req.query.type || null;
        const logs = db.getAuditLogs(limit, actionType);
        
        const logsData = [];
        for (const log of logs) {
            const username = await getUsername(client, log.user_id);
            const targetName = log.target_id ? await getUsername(client, log.target_id) : null;
            
            logsData.push({
                id: log.id,
                actionType: log.action_type,
                userId: log.user_id,
                username,
                userTag: log.user_tag,
                targetId: log.target_id,
                targetName,
                details: log.details,
                timestamp: log.timestamp
            });
        }
        
        // Get unique action types for filter
        const actionTypes = db.prepare('SELECT DISTINCT action_type FROM audit_logs ORDER BY action_type').all().map(r => r.action_type);
        
        res.render('admin', { activeTab: 'logs', logs: logsData, actionTypes, selectedType: actionType, limit });
    });

    // 11. USER STATISTICS
    app.get('/statistics', checkAuth, async (req, res) => {
        const userId = req.query.userId;
        let userStats = null;
        let userAchievements = [];
        
        try {
            if (userId) {
                const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
                const achievements = db.prepare('SELECT * FROM user_achievements WHERE user_id = ?').all(userId);
                const username = await getUsername(client, userId);
                
                userStats = stats;
                userAchievements = achievements || [];
                
                res.render('admin', { 
                    activeTab: 'statistics', 
                    userStats, 
                    userAchievements, 
                    searchedUserId: userId,
                    searchedUsername: username,
                    topWorkers: [],
                    topGamblers: [],
                    topWinners: []
                });
            } else {
                // Top statistics - handle empty results
                const topWorkers = db.prepare('SELECT * FROM user_stats WHERE total_work > 0 ORDER BY total_work DESC LIMIT 10').all() || [];
                const topGamblers = db.prepare('SELECT * FROM user_stats WHERE total_gambles > 0 ORDER BY total_gambles DESC LIMIT 10').all() || [];
                const topWinners = db.prepare('SELECT * FROM user_stats WHERE total_wins > 0 ORDER BY total_wins DESC LIMIT 10').all() || [];
                
                const topWorkersData = [];
                const topGamblersData = [];
                const topWinnersData = [];
                
                for (const u of topWorkers) {
                    try {
                        const username = await getUsername(client, u.user_id);
                        topWorkersData.push({ ...u, username });
                    } catch (e) {
                        // Skip if user not found
                    }
                }
                for (const u of topGamblers) {
                    try {
                        const username = await getUsername(client, u.user_id);
                        topGamblersData.push({ ...u, username });
                    } catch (e) {
                        // Skip if user not found
                    }
                }
                for (const u of topWinners) {
                    try {
                        const username = await getUsername(client, u.user_id);
                        topWinnersData.push({ ...u, username });
                    } catch (e) {
                        // Skip if user not found
                    }
                }
                
                res.render('admin', { 
                    activeTab: 'statistics', 
                    topWorkers: topWorkersData,
                    topGamblers: topGamblersData,
                    topWinners: topWinnersData,
                    searchedUserId: null,
                    searchedUsername: null,
                    userStats: null,
                    userAchievements: []
                });
            }
        } catch (error) {
            console.error('Error in statistics:', error);
            res.render('admin', { 
                activeTab: 'statistics', 
                topWorkers: [],
                topGamblers: [],
                topWinners: [],
                error: error.message
            });
        }
    });

    // 12. EVENT MANAGEMENT
    app.get('/events', checkAuth, async (req, res) => {
        const events = db.prepare('SELECT * FROM events ORDER BY start_time DESC').all();
        const eventsData = [];
        
        for (const e of events) {
            const createdByName = e.created_by ? await getUsername(client, e.created_by) : 'System';
            const participants = db.prepare('SELECT COUNT(*) as count FROM event_participants WHERE event_id = ?').get(e.id);
            
            eventsData.push({
                ...e,
                createdByName,
                participantCount: participants.count || 0
            });
        }
        
        const activeEvent = db.getActiveEvent();
        
        res.render('admin', { activeTab: 'events', events: eventsData, activeEvent });
    });
    
    // 12A. CREATE EVENT
    app.post('/api/create-event', checkAuth, (req, res) => {
        const { name, fee, initialBalance, durationHours } = req.body;
        
        if (!name || fee === undefined || initialBalance === undefined || !durationHours) {
            return res.status(400).json({ success: false, error: 'All fields required!' });
        }
        
        const result = db.createEvent(name, parseInt(fee), parseInt(initialBalance), parseInt(durationHours), 'DASHBOARD');
        
        if (result.success) {
            db.addAuditLog('CREATE_EVENT', 'DASHBOARD', null, null, `Event created: ${name}`);
            res.json({ success: true, message: 'Event created successfully!', eventId: result.eventId });
        } else {
            res.status(500).json({ success: false, error: result.error || 'Failed to create event' });
        }
    });
    
    // 12B. STOP EVENT
    app.post('/api/stop-event', checkAuth, (req, res) => {
        const { eventId } = req.body;
        
        if (!eventId) {
            return res.status(400).json({ success: false, error: 'Event ID required!' });
        }
        
        const result = db.stopEvent(eventId);
        
        if (result.success) {
            db.addAuditLog('STOP_EVENT', 'DASHBOARD', null, null, `Event stopped: ID ${eventId}`);
            res.json({ success: true, message: `Event stopped! ${result.processed} participants processed.` });
        } else {
            res.status(500).json({ success: false, error: result.error || 'Failed to stop event' });
        }
    });

    // 13. ANALYTICS
    app.get('/analytics', checkAuth, (req, res) => {
        // Economy stats
        const totalMoney = db.prepare('SELECT SUM(uang_jajan) as total FROM user_economy').get() || { total: 0 };
        const totalBank = db.prepare('SELECT SUM(bank_balance) as total FROM user_banking').get() || { total: 0 };
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM user_economy').get() || { count: 0 };
        const activeUsers = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM user_stats WHERE total_work > 0 OR total_gambles > 0').get() || { count: 0 };
        
        // Game stats
        const totalGambles = db.prepare('SELECT SUM(total_gambles) as total FROM user_stats').get() || { total: 0 };
        const totalWins = db.prepare('SELECT SUM(total_wins) as total FROM user_stats').get() || { total: 0 };
        const totalWork = db.prepare('SELECT SUM(total_work) as total FROM user_stats').get() || { total: 0 };
        
        // Wealth distribution
        const users1M = db.prepare('SELECT COUNT(*) as count FROM user_economy WHERE uang_jajan > 1000000').get() || { count: 0 };
        const users10M = db.prepare('SELECT COUNT(*) as count FROM user_economy WHERE uang_jajan > 10000000').get() || { count: 0 };
        const users100M = db.prepare('SELECT COUNT(*) as count FROM user_economy WHERE uang_jajan > 100000000').get() || { count: 0 };
        
        res.render('admin', {
            activeTab: 'analytics',
            totalMoney: totalMoney.total || 0,
            totalBank: totalBank.total || 0,
            totalUsers: totalUsers.count || 0,
            activeUsers: activeUsers.count || 0,
            totalGambles: totalGambles.total || 0,
            totalWins: totalWins.total || 0,
            totalWork: totalWork.total || 0,
            users1M: users1M.count || 0,
            users10M: users10M.count || 0,
            users100M: users100M.count || 0
        });
    });

    // 14. ADMIN MANAGEMENT
    app.get('/admins', checkAuth, async (req, res) => {
        const admins = db.getAdmins();
        const adminsData = [];
        
        for (const admin of admins) {
            const username = await getUsername(client, admin.user_id);
            const addedByName = admin.added_by ? await getUsername(client, admin.added_by) : admin.added_by || 'System';
            
            adminsData.push({
                ...admin,
                username,
                addedByName
            });
        }
        
        res.render('admin', { activeTab: 'admins', admins: adminsData });
    });

    // 15. QUICK ACTIONS
    app.get('/quick', checkAuth, (req, res) => {
        res.render('admin', { activeTab: 'quick' });
    });

    // 16. MONITORING
    app.get('/monitoring', checkAuth, (req, res) => {
        const startTime = client.uptime || 0;
        const uptimeHours = Math.floor(startTime / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((startTime % (1000 * 60 * 60)) / (1000 * 60));
        
        // Recent activity
        const recentLogs = db.getAuditLogs(10);
        const activeJailed = db.prepare('SELECT COUNT(*) as count FROM user_jail WHERE release_time > ?').get(Date.now()) || { count: 0 };
        const activeLoans = db.prepare('SELECT COUNT(*) as count FROM user_banking WHERE loan_amount > 0').get() || { count: 0 };
        const activeEvents = db.prepare('SELECT COUNT(*) as count FROM events WHERE is_active = 1').get() || { count: 0 };
        
        res.render('admin', {
            activeTab: 'monitoring',
            uptime: `${uptimeHours}h ${uptimeMinutes}m`,
            recentLogs,
            activeJailed: activeJailed.count || 0,
            activeLoans: activeLoans.count || 0,
            activeEvents: activeEvents.count || 0,
            guildCount: client.guilds.cache.size,
            userCount: client.users.cache.size
        });
    });

    // 17. NOTIFICATIONS
    app.get('/notifications', checkAuth, (req, res) => {
        // Get system notifications (can be extended with a notifications table)
        const notifications = [];
        
        // Check for issues
        const overdueLoans = db.prepare(`
            SELECT COUNT(*) as count FROM user_banking 
            WHERE loan_amount > 0 AND loan_due_date < ?
        `).get(Date.now()) || { count: 0 };
        
        if (overdueLoans.count > 0) {
            notifications.push({
                type: 'warning',
                title: 'Overdue Loans',
                message: `${overdueLoans.count} users have overdue loans`,
                timestamp: Date.now()
            });
        }
        
        res.render('admin', { activeTab: 'notifications', notifications });
    });

    // 18. SAY MESSAGE (Bot Message Sender)
    app.get('/say', checkAuth, (req, res) => {
        res.render('admin', { activeTab: 'say' });
    });

    // 11. SYSTEM HEALTH
    app.get('/system', checkAuth, (req, res) => {
        const startTime = client.uptime || 0;
        const uptimeHours = Math.floor(startTime / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((startTime % (1000 * 60 * 60)) / (1000 * 60));
        
        // Database size
        const dbPath = path.join(__dirname, '../custom_roles.db');
        const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
        const dbSizeMB = (dbSize / (1024 * 1024)).toFixed(2);
        
        // Guild count
        const guildCount = client.guilds.cache.size;
        
        // Total users in database
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM user_economy').get() || { count: 0 };
        
        res.render('admin', {
            activeTab: 'system',
            uptime: `${uptimeHours}h ${uptimeMinutes}m`,
            dbSize: dbSizeMB,
            guildCount,
            totalUsers: totalUsers.count || 0,
            nodeVersion: process.version,
            platform: process.platform
        });
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

    // E. UPDATE USER BALANCE
    app.post('/api/update-user-balance', checkAuth, (req, res) => {
        const { userId, amount } = req.body;
        if (!userId || !amount) {
            return res.status(400).send('Missing userId or amount');
        }
        
        // Admin tetap bisa diupdate saldonya (fake dompet)
        db.updateBalance(userId, parseInt(amount));
        db.addAuditLog('UPDATE_BALANCE', 'DASHBOARD', null, userId, `Balance adjusted: ${amount > 0 ? '+' : ''}${amount}`);
        res.redirect(`/users?search=${userId}`);
    });
    
    // E2. SET USER BALANCE (Set absolute value)
    app.post('/api/set-user-balance', checkAuth, (req, res) => {
        const { userId, amount } = req.body;
        if (!userId || amount === undefined) {
            return res.status(400).json({ success: false, error: 'Missing userId or amount' });
        }
        
        // Admin tetap bisa diupdate saldonya (fake dompet)
        const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
        if (!user) {
            db.prepare('INSERT INTO user_economy (user_id, uang_jajan) VALUES (?, ?)').run(userId, parseInt(amount));
        } else {
            db.prepare('UPDATE user_economy SET uang_jajan = ? WHERE user_id = ?').run(parseInt(amount), userId);
        }
        
        res.json({ success: true, message: 'Saldo berhasil diupdate!' });
    });
    
    // E3. DELETE USER WALLET
    app.post('/api/delete-user-wallet', checkAuth, (req, res) => {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing userId' });
        }
        
        // Hapus dompet
        db.prepare('DELETE FROM user_economy WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM user_banking WHERE user_id = ?').run(userId);
        
        res.json({ success: true, message: 'Dompet berhasil dihapus!' });
    });

    // F. JAIL USER
    app.post('/api/jail-user', checkAuth, (req, res) => {
        const { userId, hours, reason } = req.body;
        if (!userId || !hours) {
            return res.status(400).send('Missing userId or hours');
        }
        const durationMs = parseInt(hours) * 60 * 60 * 1000;
        db.jailUser(userId, durationMs, reason || 'Admin Action');
        db.addAuditLog('JAIL_USER', 'DASHBOARD', null, userId, `Jailed for ${hours} hours: ${reason || 'Admin Action'}`);
        res.redirect('/moderation');
    });

    // G. UNJAIL USER
    app.post('/api/unjail-user', checkAuth, (req, res) => {
        const { userId } = req.body;
        if (userId) {
            db.prepare('DELETE FROM user_jail WHERE user_id = ?').run(userId);
            db.addAuditLog('UNJAIL_USER', 'DASHBOARD', null, userId, 'User unjailed');
        }
        res.redirect('/moderation');
    });

    // H. BLACKLIST USER (Leaderboard)
    app.post('/api/blacklist-user', checkAuth, (req, res) => {
        const { userId } = req.body;
        if (userId) {
            db.blacklistUser(userId);
            db.addAuditLog('BLACKLIST_USER', 'DASHBOARD', null, userId, 'User blacklisted from leaderboard');
        }
        res.redirect('/moderation');
    });

    // I. UNBLACKLIST USER
    app.post('/api/unblacklist-user', checkAuth, (req, res) => {
        const { userId } = req.body;
        if (userId) {
            db.prepare('DELETE FROM leaderboard_blacklist WHERE user_id = ?').run(userId);
            db.addAuditLog('UNBLACKLIST_USER', 'DASHBOARD', null, userId, 'User unblacklisted from leaderboard');
        }
        res.redirect('/moderation');
    });

    // J. SET USER PENALTY
    app.post('/api/set-penalty', checkAuth, (req, res) => {
        const { userId, penalty } = req.body;
        if (userId && penalty !== undefined) {
            db.setPenalty(userId, parseInt(penalty));
            db.addAuditLog('SET_PENALTY', 'DASHBOARD', null, userId, `Penalty set to: ${penalty}`);
        }
        res.redirect(`/users?search=${userId}`);
    });

    // K. SEND MESSAGE AS BOT
    app.post('/api/say-message', checkAuth, async (req, res) => {
        const { channelId, mode, message, embed } = req.body;
        const { EmbedBuilder } = require('discord.js');
        
        if (!channelId) {
            return res.status(400).json({ success: false, error: 'Channel ID harus diisi!' });
        }

        try {
            const channel = client.channels.cache.get(channelId);
            if (!channel) {
                return res.status(404).json({ success: false, error: 'Channel tidak ditemukan!' });
            }

            // Cek apakah channel adalah text channel
            if (!channel.isTextBased()) {
                return res.status(400).json({ success: false, error: 'Channel harus berupa text channel!' });
            }

            if (mode === 'chat') {
                // Chat mode - plain text
                if (!message) {
                    return res.status(400).json({ success: false, error: 'Pesan harus diisi!' });
                }
                await channel.send(message);
            } else if (mode === 'embed') {
                // Embed mode
                if (!embed || (!embed.title && !embed.description)) {
                    return res.status(400).json({ success: false, error: 'Title atau Description harus diisi!' });
                }
                
                const embedBuilder = new EmbedBuilder();
                
                if (embed.title) embedBuilder.setTitle(embed.title);
                if (embed.description) embedBuilder.setDescription(embed.description);
                if (embed.url) embedBuilder.setURL(embed.url);
                if (embed.color) {
                    // Convert hex to number
                    const color = embed.color.startsWith('#') ? embed.color.slice(1) : embed.color;
                    embedBuilder.setColor(parseInt(color, 16));
                }
                if (embed.thumbnail) embedBuilder.setThumbnail(embed.thumbnail);
                if (embed.image) embedBuilder.setImage(embed.image);
                if (embed.footer) embedBuilder.setFooter({ text: embed.footer });
                
                await channel.send({ embeds: [embedBuilder] });
            } else {
                return res.status(400).json({ success: false, error: 'Mode tidak valid!' });
            }
            
            res.json({ success: true, message: 'Pesan berhasil dikirim!' });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ success: false, error: error.message || 'Gagal mengirim pesan!' });
        }
    });

    // L. ADD ADMIN
    app.post('/api/add-admin', checkAuth, async (req, res) => {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }
        
        // Get current admin from session (would need to store in session)
        const addedBy = 'DASHBOARD'; // Could be improved to track actual admin
        
        if (db.addAdmin(userId, addedBy)) {
            db.addAuditLog('ADD_ADMIN', userId, null, null, `Admin added via dashboard`);
            res.json({ success: true, message: 'Admin added successfully!' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to add admin' });
        }
    });

    // M. REMOVE ADMIN
    app.post('/api/remove-admin', checkAuth, (req, res) => {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }
        
        if (db.removeAdmin(userId)) {
            db.addAuditLog('REMOVE_ADMIN', userId, null, null, `Admin removed via dashboard`);
            res.json({ success: true, message: 'Admin removed successfully!' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to remove admin' });
        }
    });

    // N. BULK JAIL
    app.post('/api/bulk-jail', checkAuth, (req, res) => {
        const { userIds, hours, reason } = req.body;
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, error: 'User IDs required' });
        }
        
        const durationMs = parseInt(hours) * 60 * 60 * 1000;
        let successCount = 0;
        
        userIds.forEach(userId => {
            if (db.jailUser(userId.trim(), durationMs, reason || 'Bulk Action')) {
                successCount++;
                db.addAuditLog('JAIL_USER', 'DASHBOARD', null, userId, `Bulk jail: ${reason || 'Bulk Action'}`);
            }
        });
        
        res.json({ success: true, message: `Jailed ${successCount}/${userIds.length} users` });
    });

    // O. BULK BALANCE
    app.post('/api/bulk-balance', checkAuth, (req, res) => {
        const { userIds, amount } = req.body;
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !amount) {
            return res.status(400).json({ success: false, error: 'User IDs and amount required' });
        }
        
        let successCount = 0;
        
        userIds.forEach(userId => {
            const uid = userId.trim();
            if (!db.isAdmin(uid)) {
                db.updateBalance(uid, parseInt(amount));
                successCount++;
                db.addAuditLog('UPDATE_BALANCE', 'DASHBOARD', null, uid, `Bulk balance: +${amount}`);
            }
        });
        
        res.json({ success: true, message: `Updated balance for ${successCount}/${userIds.length} users` });
    });

    // 19. WEALTH LIMITER MANAGEMENT
    app.get('/limiter', checkAuth, async (req, res) => {
        const activeLimiters = db.getUsersWithActiveLimiter();
        const limiterData = [];
        
        const levels = [
            { limit: 100000000, duration: 6 * 3600 * 1000, name: '100 Juta' },
            { limit: 500000000, duration: 12 * 3600 * 1000, name: '500 Juta' },
            { limit: 1000000000, duration: 24 * 3600 * 1000, name: '1 Milyar' },
            { limit: 10000000000, duration: 48 * 3600 * 1000, name: '10 Milyar' },
            { limit: 50000000000, duration: 72 * 3600 * 1000, name: '50 Milyar' },
            { limit: 100000000000, duration: 120 * 3600 * 1000, name: '100 Milyar' }
        ];
        
        for (const limiter of activeLimiters) {
            try {
                const username = await getUsername(client, limiter.user_id);
                const levelIdx = limiter.level_cleared;
                const currentLevel = levelIdx < levels.length ? levels[levelIdx] : null;
                
                let status = 'NORMAL';
                let timeRemaining = null;
                
                if (limiter.first_breach_time && currentLevel) {
                    const elapsed = Date.now() - limiter.first_breach_time;
                    const remaining = currentLevel.duration - elapsed;
                    
                    if (remaining <= 0) {
                        status = 'SHOULD_CLEAR';
                    } else if (limiter.balance < currentLevel.limit * 0.8) {
                        status = 'MERCY';
                    } else {
                        status = 'ACTIVE';
                        timeRemaining = Math.floor(remaining / 1000 / 60); // minutes
                    }
                }
                
                limiterData.push({
                    ...limiter,
                    username,
                    currentLevel: currentLevel ? currentLevel.name : 'Cleared',
                    status,
                    timeRemaining
                });
            } catch (e) {
                // Skip if user not found
            }
        }
        
        res.render('admin', { activeTab: 'limiter', limiters: limiterData, levels });
    });

    // API: Reset Limiter
    app.post('/api/limiter/reset', checkAuth, async (req, res) => {
        const { userId, level } = req.body;
        const adminUserTag = (await client.users.fetch(req.session.userId).catch(() => ({ tag: 'Unknown' }))).tag;
        const targetUserTag = (await client.users.fetch(userId).catch(() => ({ tag: 'Unknown' }))).tag;

        if (!userId) {
            db.addAuditLog('RESET_LIMITER_FAIL', req.session.userId, adminUserTag, null, 'Missing userId');
            return res.status(400).json({ success: false, error: 'User ID harus diisi!' });
        }

        const newLevel = level !== undefined ? parseInt(level) : null;
        if (db.resetUserLimiter(userId, newLevel)) {
            db.addAuditLog('RESET_LIMITER', req.session.userId, adminUserTag, userId, `Reset limiter for ${targetUserTag} to level ${newLevel !== null ? newLevel : 0}`);
            res.json({ success: true, message: `Limiter ${targetUserTag} berhasil direset!` });
        } else {
            db.addAuditLog('RESET_LIMITER_FAIL', req.session.userId, adminUserTag, userId, `Failed to reset limiter for ${targetUserTag}`);
            res.status(500).json({ success: false, error: 'Gagal reset limiter.' });
        }
    });

    // API: Set Limiter Level
    app.post('/api/limiter/set-level', checkAuth, async (req, res) => {
        const { userId, level } = req.body;
        const adminUserTag = (await client.users.fetch(req.session.userId).catch(() => ({ tag: 'Unknown' }))).tag;
        const targetUserTag = (await client.users.fetch(userId).catch(() => ({ tag: 'Unknown' }))).tag;

        if (!userId || level === undefined) {
            db.addAuditLog('SET_LIMITER_LEVEL_FAIL', req.session.userId, adminUserTag, null, 'Missing userId or level');
            return res.status(400).json({ success: false, error: 'User ID dan Level harus diisi!' });
        }

        if (db.setUserLimiterLevel(userId, parseInt(level))) {
            db.addAuditLog('SET_LIMITER_LEVEL', req.session.userId, adminUserTag, userId, `Set limiter level for ${targetUserTag} to ${level}`);
            res.json({ success: true, message: `Limiter level ${targetUserTag} berhasil diatur ke ${level}!` });
        } else {
            db.addAuditLog('SET_LIMITER_LEVEL_FAIL', req.session.userId, adminUserTag, userId, `Failed to set limiter level for ${targetUserTag}`);
            res.status(500).json({ success: false, error: 'Gagal set limiter level.' });
        }
    });

    // API: Clear Limiter Timer
    app.post('/api/limiter/clear-timer', checkAuth, async (req, res) => {
        const { userId } = req.body;
        const adminUserTag = (await client.users.fetch(req.session.userId).catch(() => ({ tag: 'Unknown' }))).tag;
        const targetUserTag = (await client.users.fetch(userId).catch(() => ({ tag: 'Unknown' }))).tag;

        if (!userId) {
            db.addAuditLog('CLEAR_LIMITER_TIMER_FAIL', req.session.userId, adminUserTag, null, 'Missing userId');
            return res.status(400).json({ success: false, error: 'User ID harus diisi!' });
        }

        if (db.clearUserLimiterTimer(userId)) {
            db.addAuditLog('CLEAR_LIMITER_TIMER', req.session.userId, adminUserTag, userId, `Cleared limiter timer for ${targetUserTag}`);
            res.json({ success: true, message: `Timer limiter ${targetUserTag} berhasil dihapus!` });
        } else {
            db.addAuditLog('CLEAR_LIMITER_TIMER_FAIL', req.session.userId, adminUserTag, userId, `Failed to clear limiter timer for ${targetUserTag}`);
            res.status(500).json({ success: false, error: 'Gagal clear timer.' });
        }
    });

    // 20. MAX BET MANAGEMENT
    app.get('/maxbet', checkAuth, async (req, res) => {
        const customMaxBets = db.getUsersWithCustomMaxBet();
        const maxBetData = [];
        
        for (const mb of customMaxBets) {
            try {
                const username = await getUsername(client, mb.user_id);
                const setByName = mb.set_by ? await getUsername(client, mb.set_by).catch(() => mb.set_by) : 'System';
                
                maxBetData.push({
                    ...mb,
                    username,
                    setByName
                });
            } catch (e) {
                // Skip if user not found
            }
        }
        
        res.render('admin', { activeTab: 'maxbet', maxBets: maxBetData });
    });

    // API: Set Custom Max Bet
    app.post('/api/maxbet/set', checkAuth, async (req, res) => {
        const { userId, amount } = req.body;
        const adminUserTag = (await client.users.fetch(req.session.userId).catch(() => ({ tag: 'Unknown' }))).tag;
        const targetUserTag = (await client.users.fetch(userId).catch(() => ({ tag: 'Unknown' }))).tag;

        if (!userId || !amount) {
            db.addAuditLog('SET_MAX_BET_FAIL', req.session.userId, adminUserTag, null, 'Missing userId or amount');
            return res.status(400).json({ success: false, error: 'User ID dan Amount harus diisi!' });
        }

        const betAmount = parseInt(amount);
        if (isNaN(betAmount) || betAmount <= 0 || betAmount > 100000000) {
            db.addAuditLog('SET_MAX_BET_FAIL', req.session.userId, adminUserTag, userId, `Invalid amount: ${amount}`);
            return res.status(400).json({ success: false, error: 'Amount harus antara 1 - 100 Juta!' });
        }

        if (db.setUserMaxBet(userId, betAmount, req.session.userId)) {
            db.addAuditLog('SET_MAX_BET', req.session.userId, adminUserTag, userId, `Set max bet for ${targetUserTag} to ${betAmount.toLocaleString('id-ID')}`);
            res.json({ success: true, message: `Max bet ${targetUserTag} berhasil diatur ke Rp ${betAmount.toLocaleString('id-ID')}!` });
        } else {
            db.addAuditLog('SET_MAX_BET_FAIL', req.session.userId, adminUserTag, userId, `Failed to set max bet for ${targetUserTag}`);
            res.status(500).json({ success: false, error: 'Gagal set max bet.' });
        }
    });

    // API: Reset Max Bet
    app.post('/api/maxbet/reset', checkAuth, async (req, res) => {
        const { userId } = req.body;
        const adminUserTag = (await client.users.fetch(req.session.userId).catch(() => ({ tag: 'Unknown' }))).tag;
        const targetUserTag = (await client.users.fetch(userId).catch(() => ({ tag: 'Unknown' }))).tag;

        if (!userId) {
            db.addAuditLog('RESET_MAX_BET_FAIL', req.session.userId, adminUserTag, null, 'Missing userId');
            return res.status(400).json({ success: false, error: 'User ID harus diisi!' });
        }

        if (db.resetUserMaxBet(userId)) {
            db.addAuditLog('RESET_MAX_BET', req.session.userId, adminUserTag, userId, `Reset max bet for ${targetUserTag} to global`);
            res.json({ success: true, message: `Max bet ${targetUserTag} berhasil direset ke global (10 Juta)!` });
        } else {
            db.addAuditLog('RESET_MAX_BET_FAIL', req.session.userId, adminUserTag, userId, `Failed to reset max bet for ${targetUserTag}`);
            res.status(500).json({ success: false, error: 'Gagal reset max bet.' });
        }
    });

    // P. DOWNLOAD BACKUP
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