const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database.js'); // Load Database Global

// Load environment variables (fallback to config.json for backward compatibility)
try {
    require('dotenv').config({ path: '.env' });
} catch (e) {
    // dotenv optional, continue without it
}

// Get token from env or config.json
let token = process.env.BOT_TOKEN;
if (!token) {
    try {
        const config = require('./config.json');
        token = config.token;
    } catch (e) {
        // config.json might not exist, that's ok if env var is set
    }
}

if (!token) {
    console.error('❌ [FATAL] BOT_TOKEN not found in environment or config.json!');
    console.error('   Please set BOT_TOKEN in .env file or config.json');
    process.exit(1);
}

// Inisialisasi Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences // Added for Palak Feature (Online Check)
    ]
});

client.commands = new Collection();

// --- 1. LOAD COMMANDS (Recursive) ---
function loadCommands(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(fullPath);
        } else if (file.name.endsWith('.js')) {
            const command = require(fullPath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
        }
    }
}
loadCommands(path.join(__dirname, 'commands'));

// --- 2. LOAD EVENTS ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// --- 3. LOGIN ---
client.login(token);

// --- JALANKAN WEB DASHBOARD (PASSING CLIENT) ---
try {
    const startDashboard = require('./dashboard/server.js');
    startDashboard(client); // <--- KIRIM PARAMETER CLIENT DI SINI
} catch (err) {
    console.error('❌ Gagal menjalankan Dashboard:', err);
}

// --- INITIALIZE AUTO-CLEANUP SCHEDULER ---
try {
    const { initCleanupScheduler, initLeaderboardScheduler, initBankingScheduler } = require('./utils/scheduler.js');
    initCleanupScheduler();
    initLeaderboardScheduler(client);
    initBankingScheduler(); // Banking: Interest & Loan Processing
} catch (err) {
    console.error('❌ Gagal menjalankan Scheduler:', err);
}

// --- GLOBAL ERROR HANDLERS ---
process.on('uncaughtException', (error) => {
    console.error('❌ [FATAL] Uncaught Exception:', error);
    // Log to file or monitoring service in production
    if (process.env.NODE_ENV === 'production') {
        // TODO: Send to monitoring service (Sentry, etc.)
    }
    // Don't exit in production, let PM2 handle restart
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    // Log to file or monitoring service in production
    if (process.env.NODE_ENV === 'production') {
        // TODO: Send to monitoring service (Sentry, etc.)
    }
});

// --- DATABASE BACKUP ---
if (process.env.AUTO_BACKUP_ENABLED === 'true') {
    try {
        const { backupDatabase, uploadToS3 } = require('./utils/backup.js');
        
        // Initial backup on startup (delay 30 seconds to ensure DB is ready)
        setTimeout(() => {
            console.log('💾 [BACKUP] Running initial backup...');
            const backupFile = backupDatabase();
            
            // Upload to S3 if configured
            if (backupFile && process.env.S3_BACKUP_BUCKET) {
                uploadToS3(backupFile).catch(err => {
                    console.error('❌ [BACKUP] S3 upload failed:', err);
                });
            }
        }, 30000); // 30 seconds delay
        
        // Schedule periodic backup
        const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24') * 60 * 60 * 1000;
        setInterval(() => {
            console.log('💾 [BACKUP] Running scheduled backup...');
            const backupFile = backupDatabase();
            if (backupFile && process.env.S3_BACKUP_BUCKET) {
                uploadToS3(backupFile).catch(err => {
                    console.error('❌ [BACKUP] S3 upload failed:', err);
                });
            }
        }, backupInterval);
        
        console.log(`✅ [BACKUP] Auto-backup enabled (every ${process.env.BACKUP_INTERVAL_HOURS || '24'} hours)`);
    } catch (err) {
        console.error('❌ [BACKUP] Failed to initialize backup system:', err);
    }
}