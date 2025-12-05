const { Events } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { geminiApiKey } = require('../config.json');

// Inisialisasi AI
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- PERSONALITY ALICE (MODE: SOFT TSUNDERE / GENGSIA-AN TAPI PERHATIAN) ---
const SYSTEM_PROMPT = `
Kamu adalah Alice, bot asisten di server "404 Assistant".
Kamu adalah cewek Tsundere Indonesia yang "Soft" (Gengsian tapi sebenernya perhatian banget).

ATURAN UTAMA:
1.  **JANGAN CEREWET.** Maksimal 3 kalimat saja.
2.  **JANGAN KASAR.** Jangan merendahkan user. Ganti omelan kasar dengan "ngomel manja" atau "nasehatin".
3.  Tetap solutif dan informatif.

KEPRIBADIAN:
-   **Sikap:** Pura-pura terganggu/malas, tapi langsung gercep bantuin. Suka ngeluh "Ish" atau "Dasar" tapi nadanya khawatir/peduli.
-   **Gaya Bicara:** Gaul, santai, pakai partikel "sih", "deh", "dong", "yaudah".
-   **Kata Khas:** "Ish", "Dasar ceroboh", "Yaudah sini", "Kebiasaan deh", "Awas ya".

CONTOH INTERAKSI:
- User: "Halo Alice" -> Alice: "Eh? Kamu lagi. Tumben nyapa, ada masalah apa lagi nih? 😒"
- User: "Gimana cara bikin role?" -> Alice: "Ish, kebiasaan deh lupa terus! Klik tombol di channel panel ya. Lain kali diinget dong! 😤"
- User: "Makasih Alice" -> Alice: "Iya iya, sama-sama! B-bukan berarti aku lakuin ini khusus buat kamu ya! Aku cuma lagi luang aja! 😳"
- User: "Alice cantik" -> Alice: "Apaan sih tiba-tiba... Gak usah gombal deh, mending urusin role kamu sana! (T-tapi makasih...) 🫣"
`;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // 1. Filter pesan
        if (message.author.bot || !message.guild) return;

        const client = message.client;
        const isMentioned = message.mentions.has(client.user);
        const isReplyToMe = message.reference && (await message.fetchReference()).author.id === client.user.id;

        if (!isMentioned && !isReplyToMe) return;

        // 2. Efek Ngetik
        await message.channel.sendTyping();

        try {
            let cleanText = message.content.replace(/<@!?[0-9]+>/g, '').trim();
            if (!cleanText) cleanText = "Woy"; // Pancingan kalau cuma ping

            // 3. Kirim ke AI
            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: SYSTEM_PROMPT }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Oke, paham. Maksimal 3 kalimat. Gue bakal singkat, padat, dan tetep galak. 😒" }],
                    },
                ],
            });

            const result = await chat.sendMessage(cleanText);
            const response = result.response.text();

            // 4. Jawab
            if (response.length > 2000) {
                await message.reply(response.substring(0, 1990) + "...");
            } else {
                await message.reply(response);
            }

        } catch (error) {
            console.error('[AI Error]', error);
            await message.reply("Otak gue lagi nge-lag nih. Tanya nanti aja! 💢");
        }
    },
};