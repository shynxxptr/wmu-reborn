const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');
const missionHandler = require('./missionHandler.js');

// Active Crash Games
// Key: messageId
// Value: { userId, bet, multiplier, crashPoint, interval, isCashedOut, messageId, lastWarning }
const activeCrash = new Map();
const crashCooldowns = new Map();
// Combo system for consecutive cashouts
const crashCombo = new Map(); // userId -> { count, lastCashout }

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
        const maxBet = db.getUserMaxBet(userId);
        
        if (lower === 'all' || lower === 'allin') {
            bet = Math.min(balance, maxBet);
            if (bet > maxBet) bet = maxBet; // Safety Net
        }
        else if (lower.endsWith('k')) bet = parseFloat(lower) * 1000;
        else if (lower.endsWith('m') || lower.endsWith('jt')) bet = parseFloat(lower) * 1000000;
        else bet = parseInt(lower);

        if (isNaN(bet) || bet <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
        if (bet > maxBet) return message.reply(`❌ Maksimal taruhan adalah Rp ${maxBet.toLocaleString('id-ID')}!`);

        // Cooldown Check (20 Seconds)
        const now = Date.now();
        const cooldownTime = 5000;
        const lastPlay = crashCooldowns.get(userId) || 0;
        if (now - lastPlay < cooldownTime) {
            const remaining = Math.ceil((cooldownTime - (now - lastPlay)) / 1000);
            return message.reply(`⏳ **Sabar bang!** Tunggu ${remaining} detik lagi.`);
        }
        crashCooldowns.set(userId, now);

        if (balance < bet) return message.reply('💸 **Uang gak cukup!**');

        // Deduct Bet
        const updateRes = db.updateBalance(userId, -bet);
        const walletType = updateRes.wallet === 'event' ? '🎟️ Event' : '💰 Utama';
        missionHandler.trackMission(userId, 'play_crash');
        
        // TRACK STATS
        db.trackGamePlay(userId, 'saham', false);

        // Calculate Crash Point
        // Algorithm: More instant crash + weighted distribution for more crashes at 1-2x
        // House Edge: ~12% (built into distribution) - HARDER to prevent spam
        
        const r = Math.random();
        let crashPoint = 1.00;

        if (r < 0.12) {
            // 12% chance of instant crash (1.00x) - INCREASED to prevent spam
            crashPoint = 1.00;
        } else if (r < 0.45) {
            // 33% chance of crash between 1.0x - 2.0x (after instant crash)
            // This makes 45% total chance to crash at 1.0x - 2.0x
            const adjustedRandom = (r - 0.12) / 0.33; // Normalize to 0-1 range
            // Linear distribution from 1.0x to 2.0x
            crashPoint = 1.0 + (adjustedRandom * 1.0); // 1.0x to 2.0x
            crashPoint = Math.floor(crashPoint * 100) / 100;
        } else {
            // Remaining 55% chance: exponential distribution for higher multipliers
            // But still weighted towards lower multipliers
            const houseEdge = 0.88; // 12% house edge - Increased for more challenge
            const maxMultiplier = 100;
            const adjustedRandom = (r - 0.45) / 0.55; // Normalize to 0-1 range
            
            // Exponential-like distribution: lower values more common
            // Using: 1 + (max - 1) * (1 - (1 - adjustedRandom)^power)
            // Lower power = more crashes at low multiplier (harder to win)
            const power = 0.25; // Further reduced from 0.4 - Makes low multipliers MUCH more common
            const baseMultiplier = 1 + (maxMultiplier - 1) * (1 - Math.pow(1 - adjustedRandom, power));
            crashPoint = Math.floor(baseMultiplier * houseEdge * 100) / 100;
            
            // Ensure minimum is 2.0x (after low range crash)
            if (crashPoint < 2.0) crashPoint = 2.0;
        }

        // Cap at 100x for safety in this bot economy
        if (crashPoint > 100) crashPoint = 100;

        // Initial UI dengan visual enhancement
        const embed = new EmbedBuilder()
            .setTitle('📈 SAHAM GORENGAN (Crash)')
            .setDescription(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💰 **Bet:** Rp ${bet.toLocaleString('id-ID')}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `# 🟢 **1.00x**\n\n` +
                `*Siap-siap JUAL sebelum anjlok!*\n` +
                `⚠️ **Warning:** Saham bisa crash kapan saja!`
            )
            .setColor('#00FF00')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '📈 Warung Mang Ujang : Reborn' })
            .setTimestamp();

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
            walletType,
            lastWarning: 0 // Track last warning time to prevent spam
        };

        // Start Loop with error handling
        game.interval = setInterval(async () => {
            try {
                if (game.isCashedOut) {
                    clearInterval(game.interval);
                    game.interval = null;
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
                    game.interval = null;
                    this.endGame(msg, game, true); // Crashed
                    return;
                } else {
                    game.multiplier = nextMult;
                    
                    // WARNING SYSTEM - TRYHARD FEATURE
                    const warning = this.getWarning(game.multiplier, game.crashPoint);
                    const color = this.getWarningColor(game.multiplier);
                    
                    try {
                        let warningText = '';
                        const now = Date.now();
                        // Show warning every 3 seconds to prevent spam
                        if (warning && (now - game.lastWarning > 3000)) {
                            warningText = `\n\n${warning}`;
                            game.lastWarning = now;
                        }

                        // Dynamic multiplier display dengan emoji
                        const multEmoji = game.multiplier >= 5.0 ? '🟢' : game.multiplier >= 2.0 ? '🟡' : '🟠';
                        const multBar = multEmoji.repeat(Math.min(10, Math.floor(game.multiplier)));
                        
                        const newEmbed = new EmbedBuilder()
                            .setTitle('📈 SAHAM GORENGAN (Crash)')
                            .setDescription(
                                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                `💰 **Bet:** Rp ${game.bet.toLocaleString('id-ID')}\n` +
                                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                `# ${multEmoji} **${game.multiplier.toFixed(2)}x**\n` +
                                `${multBar}\n${warningText}\n\n` +
                                `*Naik terus! Jual sebelum crash!*`
                            )
                            .setColor(color)
                            .setAuthor({ 
                                name: message.author.username, 
                                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                            })
                            .setFooter({ text: '📈 Warung Mang Ujang : Reborn' })
                            .setTimestamp();

                        await msg.edit({ embeds: [newEmbed] });
                    } catch (e) {
                        // Ignore edit errors (rate limits)
                    }
                }
            } catch (error) {
                // Cleanup on error
                console.error('[Crash Game Error]', error);
                clearInterval(game.interval);
                game.interval = null;
                activeCrash.delete(game.messageId);
                try {
                    await msg.edit({ content: '❌ **Error terjadi!** Game dihentikan.', embeds: [] });
                } catch (e) { }
            }
        }, 2000); // 2 seconds update interval

        activeCrash.set(msg.id, game);
    },

    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('crash_')) return;

        try {
            const game = activeCrash.get(interaction.message.id);
            if (!game) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: '❌ Game sudah berakhir.' });
                }
                return interaction.reply({ content: '❌ Game sudah berakhir.', flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.user.id !== game.userId) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: '❌ Bukan saham kamu!' });
                }
                return interaction.reply({ content: '❌ Bukan saham kamu!', flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.customId === 'crash_cashout') {
                if (game.isCashedOut) {
                    if (interaction.deferred || interaction.replied) {
                        return interaction.editReply({ content: '❌ Sudah di-cashout!' });
                    }
                    return interaction.reply({ content: '❌ Sudah di-cashout!', flags: [MessageFlags.Ephemeral] });
                }
            game.isCashedOut = true;
            if (game.interval) {
                clearInterval(game.interval);
                game.interval = null;
            }

            // COMBO SYSTEM - Track consecutive cashouts
            const combo = crashCombo.get(game.userId) || { count: 0, lastCashout: 0 };
            const now = Date.now();
            // Reset combo if last cashout was more than 5 minutes ago
            if (now - combo.lastCashout > 5 * 60 * 1000) {
                combo.count = 0;
            }
            
            // Check if this is a combo (cashout at 2x+)
            let comboBonus = 0;
            let comboText = '';
            if (game.multiplier >= 2.0) {
                combo.count++;
                combo.lastCashout = now;
                crashCombo.set(game.userId, combo);
                
                // TRACK STATS - Update best combo
                const isNewRecord = db.updateBestCombo(game.userId, 'saham', combo.count);
                let achievementUnlocked = false;
                if (isNewRecord && combo.count >= 3) {
                    // Check achievements
                    const achievementHandler = require('./achievementHandler.js');
                    const unlocked = await achievementHandler.checkAchievements(game.userId);
                    if (unlocked.length > 0) {
                        achievementUnlocked = true;
                    }
                }
                
                // Combo bonus: 3+ consecutive cashouts at 2x+ = bonus
                if (combo.count >= 3) {
                    comboBonus = 0.10; // +10% bonus for 3+ combo
                    comboText = `\n🔥 **COMBO x${combo.count}** (+${(comboBonus * 100).toFixed(0)}% bonus)`;
                    if (isNewRecord) {
                        comboText += `\n🎉 **NEW RECORD!** Best Combo: ${combo.count}x!`;
                    }
                }
            } else {
                // Reset combo if cashout below 2x
                combo.count = 0;
                crashCombo.set(game.userId, combo);
            }

            const baseWin = Math.floor(game.bet * game.multiplier);
            const winAmount = Math.floor(baseWin * (1 + comboBonus));
            db.updateBalance(game.userId, winAmount);
            
            // TRACK STATS
            db.trackGamePlay(game.userId, 'saham', true);
            
            // Check achievements (total wins)
            try {
                const achievementHandler = require('./achievementHandler.js');
                const unlocked = await achievementHandler.checkAchievements(game.userId);
                
                // Celebrate milestones
                const stats = db.getUserStats(game.userId);
                const celebrationHandler = require('./celebrationHandler.js');
                const user = await interaction.client.users.fetch(game.userId).catch(() => null);
                if (user) {
                    await celebrationHandler.checkMilestones(game.userId, interaction.channel, user, stats);
                    
                    // Celebrate achievement unlock
                    if (unlocked.length > 0) {
                        for (const ach of unlocked) {
                            await celebrationHandler.celebrateAchievement(
                                interaction.channel, 
                                user, 
                                ach.name, 
                                ach.reward
                            );
                        }
                    }
                    
                    // Celebrate combo milestones
                    if (combo.count === 10 || combo.count === 20) {
                        await celebrationHandler.celebrateCombo(interaction.channel, user, 'saham', combo.count);
                    }
                    
                    // Celebrate big win
                    if (winAmount >= 10000000) {
                        await celebrationHandler.celebrateBigWin(interaction.channel, user, winAmount, game.multiplier);
                    }
                }
            } catch (e) {
                console.error('[CRASH ACHIEVEMENT ERROR]', e);
            }
            
            // Track Mission - Win Crash
            missionHandler.trackMission(game.userId, 'win_crash');

            // Status badge berdasarkan multiplier
            const multBadge = game.multiplier >= 5.0 ? '🟢 [HIGH]' : game.multiplier >= 2.0 ? '🟡 [MEDIUM]' : '🟠 [LOW]';
            
            const embed = new EmbedBuilder()
                .setTitle('💰 PROFIT SUKSES!')
                .setDescription(
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `✅ **JUAL SUKSES!** ${multBadge}\n` +
                    `📈 **Multiplier:** ${game.multiplier.toFixed(2)}x\n` +
                    `💰 **Win:** Rp ${winAmount.toLocaleString('id-ID')}${comboText}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `*${game.walletType}*`
                )
                .setColor('#00FF00')
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setFooter({ text: `📈 Warung Mang Ujang : Reborn • History: ${this.getHistoryString()}` })
                .setTimestamp();
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('crash_disabled')
                    .setLabel(`SOLD @ ${game.multiplier.toFixed(2)}x`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            // Use update if not replied, otherwise editReply
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed], components: [row] });
            } else {
                await interaction.update({ embeds: [embed], components: [row] });
            }
            
            activeCrash.delete(interaction.message.id);
            
            // Show achievement notification if unlocked (after update/editReply)
            if (achievementUnlocked) {
                try {
                    await interaction.followUp({ 
                        content: '🎉 **ACHIEVEMENT UNLOCKED!** Gunakan `!claim` untuk claim reward!', 
                        flags: [MessageFlags.Ephemeral]
                    });
                } catch (e) {
                    console.error('[CRASH FOLLOWUP ERROR]', e);
                }
            }
        } catch (error) {
            console.error('[CRASH INTERACTION ERROR]', error);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: '❌ **Error:** Gagal memproses cashout. Silakan coba lagi.' });
                } else {
                    await interaction.reply({ content: '❌ **Error:** Gagal memproses cashout. Silakan coba lagi.', flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) {
                console.error('[CRASH ERROR HANDLING FAILED]', e);
            }
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
                .setDescription(
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `❌ **CRASH!** 🔴 [FAILED]\n` +
                    `📉 **Crash Point:** ${game.crashPoint.toFixed(2)}x\n` +
                    `💸 **Loss:** Rp ${game.bet.toLocaleString('id-ID')}\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `*${game.walletType}*`
                )
                .setColor('#FF0000')
                .setAuthor({ 
                    name: message.author?.username || 'Unknown', 
                    iconURL: message.author?.displayAvatarURL({ dynamic: true }) || undefined
                })
                .setFooter({ text: `📈 Warung Mang Ujang : Reborn • History: ${this.getHistoryString()}` })
                .setTimestamp();

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
    },

    // WARNING SYSTEM - TRYHARD FEATURE
    getWarning(multiplier, crashPoint) {
        // Random fake warnings for tension (30% chance)
        const fakeWarningChance = 0.3;
        const warnings = [
            '⚠️ **Saham mulai tidak stabil!**',
            '⚠️ **Hati-hati, volatilitas tinggi!**',
            '⚠️ **Peringatan: Risiko meningkat!**'
        ];

        // Zone-based warnings
        if (multiplier >= 5.0) {
            // Extreme zone - Real danger
            return '🔴 **ZONA EKSTREM!** Cashout sekarang atau risiko tinggi!';
        } else if (multiplier >= 3.0) {
            // Danger zone
            if (Math.random() < fakeWarningChance) {
                return warnings[Math.floor(Math.random() * warnings.length)];
            }
            return '🟠 **ZONA BAHAYA!** Pertimbangkan cashout!';
        } else if (multiplier >= 1.5) {
            // Caution zone
            if (Math.random() < fakeWarningChance) {
                return warnings[Math.floor(Math.random() * warnings.length)];
            }
            return '🟡 **ZONA PERINGATAN** - Tetap waspada!';
        }
        // Safe zone - no warning
        return null;
    },

    getWarningColor(multiplier) {
        if (multiplier >= 5.0) return '#FF0000'; // Red - Extreme
        if (multiplier >= 3.0) return '#FF6600'; // Orange - Danger
        if (multiplier >= 1.5) return '#FFAA00'; // Yellow - Caution
        return '#00FF00'; // Green - Safe
    }
};
