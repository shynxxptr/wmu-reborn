const db = require('../database.js');

// Cooldown Map for Doa Ujang
const doaCooldowns = new Map();

module.exports = {
    async handleGambling(message, command, args) {
        const userId = message.author.id;
        const content = message.content.toLowerCase().trim();
        const now = Date.now();

        // !doaujang
        if (command === '!doaujang') {
            const cooldownTime = 15 * 60 * 1000; // 15 Menit
            const lastDoa = doaCooldowns.get(userId) || 0;

            if (now - lastDoa < cooldownTime) {
                return message.reply(`🛑 **Sabar!** Mang Ujang lagi wirid.\nCoba lagi <t:${Math.ceil((lastDoa + cooldownTime) / 1000)}:R>.`);
            }

            const cost = 2000;
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);

            if (!user || user.uang_jajan < cost) {
                return message.reply(`💸 **Sedekah kurang!** Butuh Rp ${cost.toLocaleString('id-ID')} buat beli dupa.`);
            }

            // Deduct cost
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(cost, userId);

            // Apply Luck
            const luckBoost = Math.floor(Math.random() * 11) + 10; // 10% - 20%
            const duration = 7 * 60 * 1000; // 7 Menit
            const expiration = now + duration;

            db.prepare('UPDATE user_economy SET luck_boost = ?, luck_expiration = ? WHERE user_id = ?').run(luckBoost, expiration, userId);
            doaCooldowns.set(userId, now);

            return message.reply(`🙏 **Doa Terkabul!**\nMang Ujang mendoakanmu... Hoki bertambah **${luckBoost}%** selama 7 menit! 🍀`);
        }

        // Helper to get active luck
        const getLuck = (uid) => {
            const u = db.prepare('SELECT luck_boost, luck_expiration FROM user_economy WHERE user_id = ?').get(uid);
            if (u && u.luck_expiration > Date.now()) {
                return u.luck_boost;
            }
            return 0;
        };

        // !coinflip <amount> <h/t>
        if (command === '!coinflip' || command === '!cf') {
            const amount = parseInt(args[1]);
            const choice = args[2]?.toLowerCase(); // head/tail atau h/t

            if (isNaN(amount) || amount <= 0 || !['head', 'tail', 'h', 't'].includes(choice)) {
                return message.reply('❌ Format: `!cf <jumlah> <head/tail>`');
            }

            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            if (!user || user.uang_jajan < amount) return message.reply('💸 **Uang gak cukup!** Jangan maksa judi.');

            // Luck Logic
            const luck = getLuck(userId);
            const baseChance = 0.5;
            const winChance = baseChance + (luck / 100); // e.g. 0.5 + 0.15 = 0.65

            const isWin = Math.random() < winChance;

            // Determine result based on win/loss
            // If win, result matches choice. If loss, result is opposite.
            let result;
            if (isWin) {
                result = choice.startsWith('h') ? 'head' : 'tail';
            } else {
                result = choice.startsWith('h') ? 'tail' : 'head';
            }

            if (isWin) {
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, userId);
                const luckMsg = luck > 0 ? ` (🍀 Luck +${luck}%)` : '';
                return message.reply(`🪙 **${result.toUpperCase()}!** Kamu MENANG Rp ${amount.toLocaleString('id-ID')}! 🎉${luckMsg}`);
            } else {
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(amount, userId);
                return message.reply(`🪙 **${result.toUpperCase()}!** Kamu KALAH Rp ${amount.toLocaleString('id-ID')}. Sad. 📉`);
            }
        }

        // !slots <amount>
        if (command === '!slots') {
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply('❌ Format: `!slots <jumlah>`');

            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            if (!user || user.uang_jajan < amount) return message.reply('💸 **Uang gak cukup!**');

            // Deduct bet first
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(amount, userId);

            // EMOJI MAKANAN KANTIN
            const items = ['☕', '🍝', '🥣', '🍹', '🍞', '🍡'];

            // Luck Logic for Slots
            // If lucky, chance to reroll bad result
            const luck = getLuck(userId);
            const shouldReroll = luck > 0 && Math.random() < (luck / 100);

            let r1 = items[Math.floor(Math.random() * items.length)];
            let r2 = items[Math.floor(Math.random() * items.length)];
            let r3 = items[Math.floor(Math.random() * items.length)];

            // Simple Reroll Logic: If no win and lucky, try once more
            if (shouldReroll && !(r1 === r2 && r2 === r3) && !(r1 === r2 || r2 === r3 || r1 === r3)) {
                r1 = items[Math.floor(Math.random() * items.length)];
                r2 = items[Math.floor(Math.random() * items.length)];
                r3 = items[Math.floor(Math.random() * items.length)];
            }

            // Helper for delay
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            // Initial State: All spinning
            const spinning = '🌀';
            const renderFrame = (r1, r2, r3) => {
                return `**🎰 WARUNG SLOTS 🎰**\n` +
                    `╔═════════════════╗\n` +
                    `║   ${r1}  ${r2}  ${r3}   ║\n` +
                    `╚═════════════════╝`;
            };

            const msg = await message.reply(renderFrame(spinning, spinning, spinning) + `\n*Spinning...*`);

            // Animation Sequence
            // Reel 1 Stop
            await delay(1000);
            await msg.edit(renderFrame(r1, spinning, spinning) + `\n*Spinning...*`);

            // Reel 2 Stop
            await delay(1000);
            await msg.edit(renderFrame(r1, r2, spinning) + `\n*Spinning...*`);

            // Reel 3 Stop (Final Result)
            await delay(1000);

            let winMultiplier = 0;
            if (r1 === r2 && r2 === r3) winMultiplier = 5; // Jackpot
            else if (r1 === r2 || r2 === r3 || r1 === r3) winMultiplier = 2; // Small Win

            const winAmount = amount * winMultiplier;
            if (winMultiplier > 0) {
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(winAmount, userId); // Add win (original bet already deducted)
            }

            let resultText = winMultiplier > 0 ? `🎉 **WIN!** (+Rp ${winAmount.toLocaleString('id-ID')})` : '📉 **LOSE**';
            if (winMultiplier === 5) resultText = `🚨 **JACKPOT!!!** (+Rp ${winAmount.toLocaleString('id-ID')})`;
            if (luck > 0) resultText += ` 🍀`;

            await msg.edit(renderFrame(r1, r2, r3) + `\n${resultText}`);
        }
    }
};
