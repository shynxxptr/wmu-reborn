const { Events } = require('discord.js');

// --- KONFIGURASI ID CHANNEL (ISI DENGAN ID ASLI) ---
const RULES_CHANNEL_ID = '1420428322176892931'; 
const INFO_CHANNEL_ID  = '1420452429719408661'; 

// --- DAFTAR SAPAAN ALICE (Mode: Super Ramah & Manis) ---
const greetings = [
    "Halo {user}! Selamat datang di **{channel}**! 🌸 Senang banget kamu udah mampir disini. Jangan lupa baca {rules} dan cek {info} ya, biar makin nyaman! ✨",
    
    "Waaah ada  {user}! 👋 Selamat bergabung di **{channel}**. Yuk ngobrol santai! Oiya, sempatkan baca {rules} dan {info} juga yakkkkk! 💖",
    
    "Haiii {user}! 🥰 Semoga betah di **{channel}** ya. Alice cuma mau ingetin buat cek {rules} dan {info} biar suasananya nyaman terus di sini. Have fun! 🎀",
    
    "Selamat datang, {user}! ✨ Suasana di **{channel}** jadi makin ceria nih ada kamu. Jangan lupa intip {rules} dan {info} sebentar ya! 💕",
    
    "Haloooooo! {user}, selamat datang di **{channel}**! 🌷 Kalau bingung, bisa cek {info} atau baca {rules} dulu ya. Semoga harimu menyenangkan! ☀️",
    
    "Yey! {user} join **{channel}**! 🎉 Ayo ramaikan! Tapi jangan lupa patuhi {rules} dan pantau {info} yakkkkkkk, biar kita semua happy! 🥰"
];

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        // 1. Filter: Cek apakah ini event JOIN?
        if (!newState.channelId || oldState.channelId === newState.channelId) return;

        // 2. Filter: Abaikan Bot
        if (newState.member.user.bot) return;

        const channel = newState.channel;
        const user = newState.member.user;

        try {
            // 3. Pilih Pesan Random
            let text = greetings[Math.floor(Math.random() * greetings.length)];
            
            // 4. Replace Placeholder
            text = text.replace(/{user}/g, `<@${user.id}>`);
            text = text.replace(/{channel}/g, channel.name);
            text = text.replace(/{rules}/g, RULES_CHANNEL_ID ? `<#${RULES_CHANNEL_ID}>` : 'Rules');
            text = text.replace(/{info}/g, INFO_CHANNEL_ID ? `<#${INFO_CHANNEL_ID}>` : 'Info Server');

            // --- EFEK MENGETIK ---
            
            // A. Trigger status "Alice is typing..."
            await channel.sendTyping();

            // B. Tahan selama 3 detik
            await new Promise(resolve => setTimeout(resolve, 3000));

            // C. Kirim Pesan
            const msg = await channel.send({ content: text });

            // 6. Hapus Otomatis setelah 1 Menit
            setTimeout(() => {
                msg.delete().catch(() => {});
            }, 30000); 

        } catch (error) {
             console.error(`[VoiceGreet Error] ${error.message}`);
        }
    },
};