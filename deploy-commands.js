const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');
const fs = require('fs');
const path = require('path');

const commands = [];

function getCommands(dir) {
    // Baca isi folder
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            // Jika folder, cari ke dalamnya (rekursif)
            getCommands(fullPath);
        } else if (file.name.endsWith('.js')) {
            // Jika file .js, coba load
            try {
                const command = require(fullPath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                    console.log(`✅ Loaded: ${command.data.name} -> dari ${file.name}`);
                } else {
                    console.log(`⚠️  Skipped: ${file.name} (Kurang properti data/execute)`);
                }
            } catch (err) {
                console.error(`❌ Error loading ${file.name}:`, err.message);
            }
        }
    }
}

try {
    console.log('📂 Mencari command di folder commands/ ...');
    getCommands(path.join(__dirname, 'commands'));
    
    if (commands.length === 0) {
        console.error('❌ TIDAK ADA command yang ditemukan! Cek struktur folder kamu.');
    } else {
        const rest = new REST().setToken(token);
        (async () => {
            try {
                console.log(`⏳ Mendaftarkan ${commands.length} commands ke Discord...`);
                await rest.put(Routes.applicationCommands(clientId), { body: commands });
                console.log('🎉 SUKSES! Command berhasil didaftarkan.');
                console.log('👉 Silakan Restart Discord (Ctrl+R) jika belum muncul.');
            } catch (error) {
                console.error('❌ Gagal Deploy:', error);
            }
        })();
    }
} catch (e) {
    console.error('❌ Error Path:', e.message);
}