const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');
const missionHandler = require('./missionHandler.js');

// Active Crash Games
// Key: messageId
// Value: { userId, bet, multiplier, crashPoint, interval, isCashedOut, messageId }
const activeCrash = new Map();
const crashCooldowns = new Map();

module.exports = {
    activeCrash,

    async handleCrash(message, command, args) {
        const userId = message.author.id;

        // Parse Bet
        const rawBet = args[1];
        if (!rawBet) return message.reply('❌ Format: `!saham <bet>` atau `!saham all`');

        const balance = db.getBalance(userId);

        let bet = 0;
        const lower = rawBet.toLowerCase();
        if (lower === 'all' || lower === 'allin') bet = balance;
        else if (lower.endsWith('k')) bet = parseFloat(lower) * 1000;
        else if (lower.endsWith('m') || lower.endsWith('jt')) bet = parseFloat(lower) * 1000000;
        else bet = parseInt(lower);

        if (isNaN(bet) || bet <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
        if (bet > 100000000) return message.reply('❌ Maksimal taruhan adalah 100 Juta!');

        // Cooldown Check (20 Seconds)
        const now = Date.now();
        const cooldownTime = 20000;
        const lastPlay = crashCooldowns.get(userId) || 0;
        if (now - lastPlay < cooldownTime) {
            return message.reply(`⏳ **Sabar bang!** Tunggu <t:${Math.ceil((lastPlay + cooldownTime) / 1000)}:R> lagi.`);
        }
        crashCooldowns.set(userId, now);

        if (balance < bet) return message.reply('💸 **Uang gak cukup!**');

        // Deduct Bet
        const updateRes = db.updateBalance(userId, -bet);
        const walletType = updateRes.wallet === 'event' ? '🎟️ Event' : '💰 Utama';
        missionHandler.trackMission(userId, 'play_crash');

        // Calculate Crash Point
        // Algorithm: 1% instant crash (1.00x).
        // Distribution based on e^x. 
        // Simple algo: 0.99 / (1 - random)
        // But let's cap it or make it fun.
        // House Edge 4%: 100 / (1 - h) ...

        // Standard Crash Algo:
        // E = 0.01 // 1% instant crash
        // H = 0.04 // 4% house edge
        // R = Math.random()
        // Multiplier = (100 * (1 - H)) / (100 * (1 - R)) ? No that's complex.

        // Simple Implementation:
        // Multiplier = 0.99 / (1 - Math.random())
        // If result > max, cap it.

        const r = Math.random();
        let crashPoint = 1.00;

        if (r > 0.03) { // 3% chance of instant crash (1.00x) - Reduced from 5%
            crashPoint = Math.floor(100 / (1 - Math.random())) / 100;
            // Apply House Edge? The formula 1/(1-r) is already fair-ish but infinite mean.
            // Let's use a simpler weighted random for game feel.
            // 50% chance < 2.00x
        } else {
            crashPoint = 1.00;
        }

        // Cap at 100x for safety in this bot economy
        if (crashPoint > 100) crashPoint = 100;

        // Initial UI
        const embed = new EmbedBuilder()
            .setTitle('📈 SAHAM GORENGAN (Crash)')
            .setDescription(`Bet: **Rp ${bet.toLocaleString('id-ID')}**\n\n# 1.00x\n\n*Siap-siap JUAL sebelum anjlok!*`)
            .setColor('#00FF00');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('crash_cashout')
                .setLabel('💰 JUAL SEKARANG')
                .setStyle(ButtonStyle.Success)
        );

        const msg = await message.reply({ embeds: [embed], components: [row] });

        // Game State
        const game = {
            userId,
            bet,
            multiplier: 1.00,
            crashPoint,
            isCashedOut: false,
            messageId: msg.id,
            startTime: Date.now(),
            walletType
        };

        // Start Loop
        game.interval = setInterval(async () => {
            if (game.isCashedOut) {
                clearInterval(game.interval);
                return;
            }

            // Increase Multiplier
            // Speed curve: Slow at start, fast later
            // Simple linear increment for Discord rate limits
            // +0.2x every 2 seconds? Too slow.
            // Let's do exponential visual: 1.0 -> 1.1 -> 1.3 -> 1.6...

            const elapsed = (Date.now() - game.startTime) / 1000; // seconds
            // Formula: M = e^(0.06 * t) 
            // t=0, M=1. t=10, M=1.8. t=20, M=3.3.

            let nextMult = Math.pow(Math.E, 0.1 * elapsed);
            if (nextMult < 1.00) nextMult = 1.00;

            // Check Crash
            if (nextMult >= game.crashPoint) {
                clearInterval(game.interval);
                this.endGame(msg, game, true); // Crashed
            } else {
                game.multiplier = nextMult;
                // Update Message (Rate Limit handling: only update if change is significant or every 2s)
                // Discord rate limit is 5 edits/5s per channel? Or per message?
                // Safe bet: Update every 2-3 seconds.

                // For smoother feel, we might skip some edits if too fast.
                // But setInterval is already controlling timing.

                try {
                    const newEmbed = new EmbedBuilder()
                        .setTitle('📈 SAHAM GORENGAN (Crash)')
                        .setDescription(`Bet: **Rp ${game.bet.toLocaleString('id-ID')}**\n\n# ${game.multiplier.toFixed(2)}x\n\n*Naik terus!*`)
                        .setColor('#00FF00');

                    await msg.edit({ embeds: [newEmbed] });
                } catch (e) {
                    // Ignore edit errors (rate limits)
                }
            }
        }, 2000); // 2 seconds update interval

        activeCrash.set(msg.id, game);
    },

    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('crash_')) return;

        const game = activeCrash.get(interaction.message.id);
        if (!game) return interaction.reply({ content: '❌ Game sudah berakhir.', flags: [MessageFlags.Ephemeral] });

        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: '❌ Bukan saham kamu!', flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.customId === 'crash_cashout') {
            if (game.isCashedOut) return;
            game.isCashedOut = true;
            clearInterval(game.interval);

            const winAmount = Math.floor(game.bet * game.multiplier);
            db.updateBalance(game.userId, winAmount);

            const embed = new EmbedBuilder()
                .setTitle('💰 PROFIT SUKSES!')
                .setDescription(`Kamu berhasil JUAL di angka **${game.multiplier.toFixed(2)}x**!\nWin: **Rp ${winAmount.toLocaleString('id-ID')}**\n*${game.walletType}*`)
                .setColor('#00FF00');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('crash_disabled')
                    .setLabel(`SOLD @ ${game.multiplier.toFixed(2)}x`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            await interaction.update({ embeds: [embed], components: [row] });
            activeCrash.delete(interaction.message.id);
        }
    },

    async endGame(message, game, isCrash) {
        activeCrash.delete(game.messageId);

        // Add to History
        const finalMult = isCrash ? game.crashPoint : game.multiplier;
        this.addToHistory(finalMult);

        if (isCrash) {
            const embed = new EmbedBuilder()
                .setTitle('📉 CRASH! ANJLOK!')
                .setDescription(`Saham anjlok di angka **${game.crashPoint.toFixed(2)}x**.\nUang **Rp ${game.bet.toLocaleString('id-ID')}** hangus.\n*${game.walletType}*`)
                .setColor('#FF0000')
                .setFooter({ text: `History: ${this.getHistoryString()}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('crash_disabled')
                    .setLabel(`CRASHED @ ${game.crashPoint.toFixed(2)}x`)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

            try {
                await message.edit({ embeds: [embed], components: [row] });
            } catch (e) { }
        }
    },

    // --- HISTORY FEATURE ---
    crashHistory: [],

    addToHistory(multiplier) {
        this.crashHistory.unshift(multiplier);
        if (this.crashHistory.length > 5) this.crashHistory.pop();
    },

    getHistoryString() {
        if (this.crashHistory.length === 0) return '-';
        return this.crashHistory.map(m => `${m.toFixed(2)}x`).join(' | ');
    }
};
