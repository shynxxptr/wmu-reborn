const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token } = require('./config.json');
const db = require('./database.js'); // Load Database Global

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