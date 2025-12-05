const { Events } = require('discord.js');

// --- KONFIGURASI CHANNEL ---
// Ganti dengan ID Channel tempat bot menyapa member baru
const WELCOME_CHANNEL_ID = '1420428322176892933'; 

// --- BANK PESAN ---
// Gunakan {user} untuk mention orangnya
// Gunakan {server} untuk nama server
const messages = [
    "Hai {user}! Selamat datang di **{server}** yaaa! 🌸 Seneng banget kamu bisa join disini. Semoga betah dan dapet banyak temen baru ya! ✨",
    
    "Waaah ada temen baru! Halo {user}, salken yaaa! 🥰 Jangan malu-malu buat ngobrol di chat umum. We are happy to have you! 💖",
    
    "Welcome home {user}! 🏡 Makasih banyak udah mampir ke **{server}**. Yuk langsung seru-seruan bareng kita! Jangan lupa baca rules dulu ya cantik/ganteng! 🎀",
    
    "Eh halo {user}! 👋 Selamat bergabung yaaa. **{server}** jadi makin rame nih ada kamu. Have fun dan semoga harimu menyenangkan! 💫",
    
    "Hi hi {user}! Akhirnya dateng juga! 🥳 Yuk kenalan sama yang lain. Kalau butuh bantuan, jangan ragu buat tanya-tanya admin ya! 💕",
    
    "Halo {user}, selamat datang! 🌷 Ih seneng deh nambah member baru. Semoga kamu nyaman main di **{server}** yaaa! ✨",

    "Knock knock! Ada {user} dateng nih! 🚪 Selamat datang di **{server}** bestie! Jangan lupa say hi di chat yaaa! 🌈",

    "Yey! {user} sudah mendarat di **{server}**! 🚀 Selamat bergabung! Semoga kita bisa jadi temen baik yaaa! 🌙"
];

// Memori agar pesan tidak berulang
let recentIndexes = []; 

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
            if (!channel) return;

            // --- LOGIKA PENGACAKAN ---
            let randomIndex;
            let attempts = 0;
            
            // Cari index yang belum dipakai baru-baru ini
            do {
                randomIndex = Math.floor(Math.random() * messages.length);
                attempts++;
            } while (recentIndexes.includes(randomIndex) && attempts < 10);

            // Simpan index
            recentIndexes.push(randomIndex);
            if (recentIndexes.length > 3) recentIndexes.shift();

            // --- PROSES PESAN ---
            let text = messages[randomIndex];
            
            // Ganti placeholder dengan data asli
            text = text.replace(/{user}/g, `<@${member.id}>`);
            text = text.replace(/{server}/g, member.guild.name);

            // --- KIRIM PESAN (Efek Ngetik) ---
            setTimeout(async () => {
                 await channel.sendTyping(); 
                 setTimeout(async () => {
                     await channel.send(text);
                 }, 1500); 
            }, 1000);

        } catch (error) {
            console.error('[Welcome Error]', error);
        }
    },
};