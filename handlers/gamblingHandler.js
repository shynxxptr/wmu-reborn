const db = require('../database.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { formatMoney } = require('../utils/helpers.js');
const path = require('path');
const missionHandler = require('./missionHandler.js');

// Cooldown Map for Doa Ujang
const doaCooldowns = new Map();
// Cooldown Map for BigSlot
const bigSlotCooldowns = new Map();
// Active Slots Map
const activeSlots = new Map();
// Active Simple Slots Map (for timing stop)
const activeSimpleSlots = new Map(); // messageId -> { userId, reel1, reel2, reel3, stopped, timing }
// Cooldown Map for Math
const mathCooldowns = new Map();
const coinflipCooldowns = new Map();
// Combo & difficulty scaling for math game - TRYHARD FEATURE
const mathCombo = new Map(); // userId -> { count, difficulty }
const slotsCooldowns = new Map();
// Streak system for coinflip - TRYHARD FEATURE
const coinflipStreak = new Map(); // userId -> { count, lastWin }
const coinflipHistory = new Map(); // userId -> [last 10 results]

module.exports = {
    async handleGambling(message, command, args) {
        const userId = message.author.id;
        const content = message.content.toLowerCase().trim();
        const now = Date.now();



        // Helper for Global Jackpot
        const handleJackpot = (betAmount, user) => {
            // 2% to Jackpot
            const contribution = Math.floor(betAmount * 0.02);
            if (contribution > 0) db.addJackpot(contribution);

            // 0.0001% Chance (1 in 1,000,000)
            if (Math.random() < 0.000001) {
                const jackpotPool = db.getJackpot();
                if (jackpotPool > 0) {
                    // Jackpot always goes to MAIN WALLET (Bonus)
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(jackpotPool, user);
                    db.resetJackpot();
                    message.channel.send(`🚨 **GLOBAL JACKPOT ALERT** 🚨\n🎉 <@${user}> BARUSAN JEBOL JACKPOT SEBESAR **Rp ${formatMoney(jackpotPool)}**! 🎉\n*Sultan mendadak!* 💸`);
                }
            }
        };

        // !doaujang
        if (command === '!doaujang') {
            const cooldownTime = 15 * 60 * 1000; // 15 Menit
            const lastDoa = doaCooldowns.get(userId) || 0;

            if (now - lastDoa < cooldownTime) {
                const remaining = Math.ceil((cooldownTime - (now - lastDoa)) / 1000);
                return message.reply(`⏳ **Sabar bang!** Mang Ujang lagi wirid.\nCoba lagi ${remaining} detik lagi.`);
            }

            const cost = 2000;
            const currentBalance = db.getBalance(userId);

            if (currentBalance < cost) {
                return message.reply(`💸 **Sedekah kurang!** Butuh Rp ${formatMoney(cost)} buat beli dupa.`);
            }

            // Deduct cost
            db.updateBalance(userId, -cost);

            // Apply Luck
            const luckBoost = Math.floor(Math.random() * 11) + 10; // 10% - 20%
            const duration = 7 * 60 * 1000; // 7 Menit
            const expiration = now + duration;

            db.prepare('UPDATE user_economy SET luck_boost = ?, luck_expiration = ? WHERE user_id = ?').run(luckBoost, expiration, userId);
            doaCooldowns.set(userId, now);

            return message.reply(`🙏 **Doa Terkabul!**\nMang Ujang mendoakanmu... Hoki bertambah **${luckBoost}%** selama 7 menit! 🍀`);
        }

        // Helper to get effective luck (Base + Penalty + Wealth Limiter + Luxury Buffs)
        const getEffectiveLuck = (uid) => {
            // 1. Base Luck from Doa Ujang
            let luck = 0;
            const u = db.prepare('SELECT luck_boost, luck_expiration FROM user_economy WHERE user_id = ?').get(uid);
            if (u && u.luck_expiration > Date.now()) {
                luck = u.luck_boost;
            }

            // 2. Luxury Items Buff
            try {
                const luxuryHandler = require('./luxuryItemsHandler.js');
                const luxuryLuck = luxuryHandler.getEffectiveLuxuryLuck(uid);
                luck += luxuryLuck;
            } catch (e) {
                // Luxury handler not available yet
            }

            // 3. Manual Penalty
            const penalty = db.getPenalty(uid);
            luck += penalty;

            // 3. DYNAMIC WEALTH LIMITER (Sistem Rungkad Bertingkat)
            const wealth = db.getWealthStatus(uid);
            const userBal = db.getBalance(uid);

            // Threshold Configuration (Sistem Rungkad Bertingkat)
            const levels = [
                { limit: 100000000, duration: 6 * 3600 * 1000 },      // 100 Juta - 6 Jam
                { limit: 500000000, duration: 12 * 3600 * 1000 },    // 500 Juta - 12 Jam
                { limit: 1000000000, duration: 24 * 3600 * 1000 },  // 1 Milyar - 24 Jam
                { limit: 10000000000, duration: 48 * 3600 * 1000 },  // 10 Milyar - 2 Hari
                { limit: 50000000000, duration: 72 * 3600 * 1000 },  // 50 Milyar - 3 Hari
                { limit: 100000000000, duration: 120 * 3600 * 1000 }, // 100 Milyar - 5 Hari
                { limit: 500000000000, duration: 168 * 3600 * 1000 }, // 500 Milyar - 7 Hari
                { limit: 1000000000000, duration: 240 * 3600 * 1000 }, // 1 Triliun - 10 Hari
                { limit: 5000000000000, duration: 336 * 3600 * 1000 }, // 5 Triliun - 14 Hari
                { limit: 10000000000000, duration: 480 * 3600 * 1000 }  // 10 Triliun - 20 Hari
            ];

            const currentLevelIdx = wealth.level_cleared;

            // If user has cleared all levels, no more limits (or add more levels later)
            if (currentLevelIdx < levels.length) {
                const target = levels[currentLevelIdx];

                // Check Breach
                if (userBal >= target.limit) {
                    const now = Date.now();

                    if (!wealth.first_breach_time) {
                        // First time hitting limit -> Start Timer
                        db.updateWealthStatus(uid, wealth.level_cleared, now);
                        luck -= 90; // Immediate Penalty
                        // console.log(`[LIMITER] User ${uid} hit ${target.limit}. Timer started.`);
                    } else {
                        // Timer already running
                        const elapsed = now - wealth.first_breach_time;

                        if (elapsed >= target.duration) {
                            // Level Cleared!
                            db.updateWealthStatus(uid, wealth.level_cleared + 1, null);
                            // console.log(`[LIMITER] User ${uid} cleared level ${wealth.level_cleared}.`);
                        } else {
                            // Still Stuck -> Apply Penalty
                            // MERCY RULE: If balance drops below 80% of target, pause penalty
                            if (userBal < (target.limit * 0.8)) {
                                // Mercy: No Penalty
                                // console.log(`[LIMITER] User ${uid} in mercy zone.`);
                            } else {
                                luck -= 90; // RUNGKAD MODE
                                // console.log(`[LIMITER] User ${uid} penalized. Time left: ${(target.duration - elapsed)/1000}s`);
                            }
                        }
                    }
                } else {
                    // Below limit, but check if timer is running (it doesn't reset!)
                    if (wealth.first_breach_time) {
                        const now = Date.now();
                        const elapsed = now - wealth.first_breach_time;
                        const target = levels[currentLevelIdx];

                        if (elapsed >= target.duration) {
                            // Level Cleared (even if balance dropped, they survived the time)
                            db.updateWealthStatus(uid, wealth.level_cleared + 1, null);
                        } else {
                            // Timer running, but balance is low.
                            // Check Mercy Rule
                            if (userBal < (target.limit * 0.8)) {
                                // Mercy: No Penalty
                            } else {
                                // Between 80% and 100% -> Penalty applies
                                luck -= 90;
                            }
                        }
                    }
                }
            }

            return luck;
        };

        // !coinflip <amount> <h/t> [safe/normal/risky]
        if (command === '!coinflip' || command === '!cf') {
            const rawAmount = args[1];
            const choice = args[2]?.toLowerCase(); // head/tail atau h/t
            const riskMode = args[3]?.toLowerCase() || 'normal'; // safe/normal/risky

            if (!rawAmount || !['head', 'tail', 'h', 't'].includes(choice)) {
                return message.reply('❌ Format: `!cf <jumlah> <head/tail> [safe/normal/risky]`');
            }
            
            if (!['safe', 'normal', 'risky'].includes(riskMode)) {
                return message.reply('❌ Mode harus: `safe`, `normal`, atau `risky`');
            }

            let amount = 0;
            const currentBalance = db.getBalance(userId);
            const lowerAmount = rawAmount.toLowerCase();
            const maxBet = db.getUserMaxBet(userId);

            if (lowerAmount === 'all' || lowerAmount === 'allin') {
                amount = Math.min(currentBalance, maxBet);
                if (amount > maxBet) amount = maxBet; // Safety Net
            } else if (lowerAmount.endsWith('k')) {
                amount = parseFloat(lowerAmount) * 1000;
            } else if (lowerAmount.endsWith('m') || lowerAmount.endsWith('jt')) {
                amount = parseFloat(lowerAmount) * 1000000;
            } else {
                amount = parseInt(lowerAmount);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
            if (amount > maxBet) return message.reply(`❌ Maksimal taruhan adalah Rp ${maxBet.toLocaleString('id-ID')}!`);

            // Cooldown Check (5 Seconds)
            const cfCooldown = 5000;
            const lastCf = coinflipCooldowns.get(userId) || 0;
            if (now - lastCf < cfCooldown) {
                const remaining = Math.ceil((cfCooldown - (now - lastCf)) / 1000);
                return message.reply(`⏳ **Sabar bang!** Tunggu ${remaining} detik lagi.`);
            }
            coinflipCooldowns.set(userId, now);

            if (currentBalance < amount) return message.reply('💸 **Uang gak cukup!** Jangan maksa judi.');

            // Deduct Upfront
            const updateRes = db.updateBalance(userId, -amount);
            const walletType = updateRes.wallet === 'event' ? '🎟️ Saldo Event' : '💰 Saldo Utama';

            // TRACK STATS
            db.trackGamePlay(userId, 'coinflip', false);

            // Jackpot Check
            handleJackpot(amount, userId);

            // RISK MODE SYSTEM - TRYHARD FEATURE
            let baseChance = 0.45; // 45% base
            let multiplier = 2.0; // Standard 2x
            
            if (riskMode === 'safe') {
                baseChance = 0.50; // +5% win chance
                multiplier = 1.8; // -10% multiplier (2.0 * 0.9)
            } else if (riskMode === 'risky') {
                baseChance = 0.40; // -5% win chance
                multiplier = 2.4; // +20% multiplier (2.0 * 1.2)
            }
            
            // Luck Logic - CHALLENGING BUT FUN
            const luck = getEffectiveLuck(userId);
            const winChance = baseChance + (luck / 150); // Reduced luck effect (from /100 to /150)

            // Check guaranteed win from luxury items
            let isWin = false;
            try {
                const luxuryHandler = require('./luxuryItemsHandler.js');
                if (luxuryHandler.hasGuaranteedWin(userId)) {
                    isWin = true; // Guaranteed win!
                } else {
                    isWin = Math.random() < winChance;
                }
            } catch (e) {
                isWin = Math.random() < winChance;
            }
            
            // STREAK SYSTEM - Track consecutive wins
            const streak = coinflipStreak.get(userId) || { count: 0, lastWin: false };
            let streakBonus = 0;
            let streakText = '';
            
            if (isWin) {
                if (streak.lastWin) {
                    streak.count++;
                } else {
                    streak.count = 1; // Reset to 1 if first win after loss
                }
                streak.lastWin = true;
                
                // TRACK STATS - Update best streak
                const isNewRecord = db.updateBestStreak(userId, 'coinflip', streak.count);
                let achievementUnlocked = false;
                if (isNewRecord && streak.count >= 5) {
                    // Check achievements
                    const achievementHandler = require('./achievementHandler.js');
                    const unlocked = await achievementHandler.checkAchievements(userId);
                    if (unlocked.length > 0) {
                        achievementUnlocked = true;
                    }
                }
                
                // Streak bonus - BALANCED
                if (streak.count >= 5) {
                    streakBonus = 0.30; // +30% for 5+ streak (reduced from 50%)
                    streakText = ` 🔥 **STREAK x${streak.count}** (+30% bonus)`;
                    if (isNewRecord) {
                        streakText += ` 🎉 **NEW RECORD!**`;
                    }
                } else if (streak.count >= 3) {
                    streakBonus = 0.15; // +15% for 3-4 streak (reduced from 20%)
                    streakText = ` 🔥 **STREAK x${streak.count}** (+15% bonus)`;
                } else if (streak.count >= 2) {
                    streakBonus = 0.05; // +5% for 2 streak (reduced from 10%)
                    streakText = ` 🔥 **STREAK x${streak.count}** (+5% bonus)`;
                }
            } else {
                streak.count = 0;
                streak.lastWin = false;
            }
            coinflipStreak.set(userId, streak);
            
            // Update history
            const history = coinflipHistory.get(userId) || [];
            history.push({ result: isWin ? choice : (choice === 'h' ? 't' : 'h'), win: isWin });
            if (history.length > 10) history.shift();
            coinflipHistory.set(userId, history);

            // Determine result based on win/loss
            // If win, result matches choice. If loss, result is opposite.
            let result;
            if (isWin) {
                result = choice.startsWith('h') ? 'head' : 'tail';
            } else {
                result = choice.startsWith('h') ? 'tail' : 'head';
            }

            // Animation
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const createFlipEmbed = (currentFace, status) => {
                const emoji = currentFace === 'head' ? '🪙' : '🪙';
                const faceText = currentFace === 'head' ? '**HEAD** ⬆️' : '**TAIL** ⬇️';
                const faceEmoji = currentFace === 'head' ? '🟡' : '⚪';
                return new EmbedBuilder()
                    .setTitle('🪙 COINFLIP 🪙')
                    .setDescription(
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `${faceEmoji} ${emoji} ${faceText}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        status
                    )
                    .setColor(currentFace === 'head' ? '#FFD700' : '#C0C0C0')
                    .setAuthor({ 
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setFooter({ text: '🪙 Warung Mang Ujang : Reborn' })
                    .setTimestamp();
            };

            // Initial flip message
            const msg = await message.reply({ embeds: [createFlipEmbed('head', '🌀 Flipping...')] });

            // Flip animation (alternate 4 times)
            const faces = ['tail', 'head', 'tail', 'head'];
            for (const face of faces) {
                await delay(300);
                await msg.edit({ embeds: [createFlipEmbed(face, '🌀 Flipping...')] });
            }

            // Final result
            await delay(500);

            if (isWin) {
                // Apply streak bonus and risk mode multiplier
                const baseWin = amount * multiplier;
                const finalWin = Math.floor(baseWin * (1 + streakBonus));
                db.updateBalance(userId, finalWin);
                
                // TRACK STATS
                db.trackGamePlay(userId, 'coinflip', true);
                
                // Check achievements (total wins)
                try {
                    const achievementHandler = require('./achievementHandler.js');
                    const unlocked = await achievementHandler.checkAchievements(userId);
                    
                    // Celebrate milestones
                    const stats = db.getUserStats(userId);
                    const celebrationHandler = require('./celebrationHandler.js');
                    await celebrationHandler.checkMilestones(userId, message.channel, message.author, stats);
                    
                    // Celebrate achievement unlock
                    if (unlocked.length > 0) {
                        for (const ach of unlocked) {
                            await celebrationHandler.celebrateAchievement(
                                message.channel, 
                                message.author, 
                                ach.name, 
                                ach.reward
                            );
                        }
                    }
                } catch (e) {
                    console.error('[COINFLIP ACHIEVEMENT ERROR]', e);
                }
                
                // Celebrate streak milestones
                if (streak.count === 10 || streak.count === 20) {
                    const celebrationHandler = require('./celebrationHandler.js');
                    await celebrationHandler.celebrateStreak(message.channel, message.author, streak.count);
                }
                
                // Celebrate big win
                if (finalWin >= 10000000) {
                    const celebrationHandler = require('./celebrationHandler.js');
                    await celebrationHandler.celebrateBigWin(message.channel, message.author, finalWin, multiplier);
                }
                
                missionHandler.trackMission(userId, 'win_coinflip');
                
                const luckMsg = luck > 0 ? `\n🍀 **Luck:** +${luck}%` : '';
                const modeBadge = riskMode !== 'normal' ? `\n🎯 **Mode:** ${riskMode.toUpperCase()}` : '';
                const historyText = history.length > 0 ? `\n📊 **History:** ${history.slice(-5).map(h => h.win ? '🟢' : '🔴').join(' ')}` : '';
                
                let achievementMsg = '';
                if (achievementUnlocked) {
                    achievementMsg = '\n\n🎉 **ACHIEVEMENT UNLOCKED!** Gunakan `!claim` untuk claim reward!';
                }
                
                const winStatus = `✅ **MENANG!** 🟢 [SUCCESS]\n` +
                                 `💰 **Win:** +Rp ${formatMoney(finalWin)}\n` +
                                 `${streakText}${luckMsg}${modeBadge}${historyText}${achievementMsg}\n` +
                                 `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                 `*${walletType}*`;
                
                await msg.edit({
                    embeds: [createFlipEmbed(result, winStatus)],
                    content: null
                });
            } else {
                // Already deducted
                const historyText = history.length > 0 ? `\n📊 **History:** ${history.slice(-5).map(h => h.win ? '🟢' : '🔴').join(' ')}` : '';
                const modeBadge = riskMode !== 'normal' ? `\n🎯 **Mode:** ${riskMode.toUpperCase()}` : '';
                
                const loseStatus = `❌ **KALAH!** 🔴 [FAILED]\n` +
                                  `💸 **Loss:** -Rp ${formatMoney(amount)}${modeBadge}${historyText}\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `*${walletType}*`;
                
                await msg.edit({
                    embeds: [createFlipEmbed(result, loseStatus)],
                    content: null
                });
            }
            return;
        }

        // !slots <amount>
        if (command === '!slots') {
            const rawAmount = args[1];
            if (!rawAmount) return message.reply('❌ Format: `!slots <jumlah>`');

            let amount = 0;
            const currentBalance = db.getBalance(userId);
            const lowerAmount = rawAmount.toLowerCase();
            const maxBet = db.getUserMaxBet(userId);

            if (lowerAmount === 'all' || lowerAmount === 'allin') {
                amount = Math.min(currentBalance, maxBet);
                if (amount > maxBet) amount = maxBet; // Safety Net
            } else if (lowerAmount.endsWith('k')) {
                amount = parseFloat(lowerAmount) * 1000;
            } else if (lowerAmount.endsWith('m') || lowerAmount.endsWith('jt')) {
                amount = parseFloat(lowerAmount) * 1000000;
            } else {
                amount = parseInt(lowerAmount);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
            if (amount > maxBet) return message.reply(`❌ Maksimal taruhan adalah Rp ${maxBet.toLocaleString('id-ID')}!`);

            // Cooldown Check (10 Seconds)
            const slotCooldown = 10000;
            const lastSlot = slotsCooldowns.get(userId) || 0;
            if (now - lastSlot < slotCooldown) {
                const remaining = Math.ceil((slotCooldown - (now - lastSlot)) / 1000);
                return message.reply(`⏳ **Sabar bang!** Tunggu ${remaining} detik lagi.`);
            }
            slotsCooldowns.set(userId, now);

            if (currentBalance < amount) return message.reply('💸 **Uang gak cukup!**');

            // Deduct bet first
            const updateRes = db.updateBalance(userId, -amount);
            const walletType = updateRes.wallet === 'event' ? '🎟️ Saldo Event' : '💰 Saldo Utama';
            missionHandler.trackMission(userId, 'play_slots');
            
            // TRACK STATS (will be updated on win/loss)

            // Jackpot Check
            handleJackpot(amount, userId);

            // EMOJI MAKANAN KANTIN
            const items = ['☕', '🍝', '🥣', '🍹', '🍞', '🍡'];

            // Luck Logic for Slots - CHALLENGING BUT FUN
            // If lucky, chance to reroll bad result (reduced effect)
            const luck = getEffectiveLuck(userId);
            const shouldReroll = luck > 0 && Math.random() < (luck / 150); // Reduced from /100 to /150

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

            const createEmbed = (r1, r2, r3, status, color = '#0099ff') => {
                const grid = `\`\`\`\n╔═════════════════╗\n║   ${r1}  ${r2}  ${r3}   ║\n╚═════════════════╝\n\`\`\``;
                const statusBadge = status.includes('MENANG') ? '🟢 [WIN]' : status.includes('KALAH') ? '🔴 [LOSE]' : '🟡 [SPINNING]';
                return new EmbedBuilder()
                    .setTitle('🎰 WARUNG SLOTS 🎰')
                    .setDescription(
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `${grid}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `${statusBadge} ${status}`
                    )
                    .setColor(color)
                    .setAuthor({ 
                        name: message.author.username, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setFooter({ text: '🎰 Warung Mang Ujang : Reborn' })
                    .setTimestamp();
            };

            // TIMING STOP MECHANIC - TRYHARD FEATURE
            const stopButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('slot_stop_reel')
                    .setLabel('🛑 STOP REEL')
                    .setStyle(ButtonStyle.Danger)
            );

            const msg = await message.reply({ 
                embeds: [createEmbed(spinning, spinning, spinning, 'Spinning... Tekan STOP di timing tepat!')],
                components: [stopButton]
            });

            // Save state for timing stop
            activeSimpleSlots.set(msg.id, {
                userId,
                reel1: r1,
                reel2: r2,
                reel3: r3,
                stopped: false,
                currentReel: 0,
                startTime: Date.now()
            });

            // Reel 1 - Timing window: 800-1200ms for perfect
            const reel1Start = Date.now();
            await delay(500);
            await msg.edit({ embeds: [createEmbed(spinning, spinning, spinning, 'Reel 1 spinning... STOP sekarang!')], components: [stopButton] });
            
            let reel1StopTime = 2000; // Default auto-stop
            let reel1Stopped = false;
            while (!reel1Stopped && (Date.now() - reel1Start) < 2000) {
                const state = activeSimpleSlots.get(msg.id);
                if (!state || state.stopped || state.currentReel > 0) {
                    reel1StopTime = Date.now() - reel1Start;
                    reel1Stopped = true;
                    break;
                }
                await delay(50);
            }

            let reel1Timing = 'bad';
            if (reel1StopTime >= 800 && reel1StopTime <= 1200) reel1Timing = 'perfect';
            else if (reel1StopTime >= 500 && reel1StopTime <= 1500) reel1Timing = 'good';

            await msg.edit({ embeds: [createEmbed(r1, spinning, spinning, `Reel 1: ${reel1Timing === 'perfect' ? '✨ PERFECT!' : reel1Timing === 'good' ? '✅ Good' : '❌ Bad'} Reel 2 spinning...`)] });

            // Reel 2
            const reel2Start = Date.now();
            await delay(500);
            await msg.edit({ embeds: [createEmbed(r1, spinning, spinning, 'Reel 2 spinning... STOP sekarang!')], components: [stopButton] });
            
            let reel2StopTime = 2000;
            let reel2Stopped = false;
            while (!reel2Stopped && (Date.now() - reel2Start) < 2000) {
                const state = activeSimpleSlots.get(msg.id);
                if (!state || state.stopped || state.currentReel > 1) {
                    reel2StopTime = Date.now() - reel2Start;
                    reel2Stopped = true;
                    break;
                }
                await delay(50);
            }

            let reel2Timing = 'bad';
            if (reel2StopTime >= 800 && reel2StopTime <= 1200) reel2Timing = 'perfect';
            else if (reel2StopTime >= 500 && reel2StopTime <= 1500) reel2Timing = 'good';

            await msg.edit({ embeds: [createEmbed(r1, r2, spinning, `Reel 2: ${reel2Timing === 'perfect' ? '✨ PERFECT!' : reel2Timing === 'good' ? '✅ Good' : '❌ Bad'} Reel 3 spinning...`)] });

            // Reel 3 - Final (auto)
            await delay(1000);

            // Calculate timing bonus
            let timingBonus = 0;
            let timingText = '';
            const perfectCount = [reel1Timing, reel2Timing].filter(t => t === 'perfect').length;
            const goodCount = [reel1Timing, reel2Timing].filter(t => t === 'good').length;

            // Timing bonus - BALANCED
            if (perfectCount === 2) {
                timingBonus = 0.30; // +30% for 2 perfect (reduced from 50%)
                timingText = ' 🔥 **PERFECT TIMING x2!** (+30% bonus)';
            } else if (perfectCount === 1) {
                timingBonus = 0.15; // +15% for 1 perfect (reduced from 20%)
                timingText = ' ✨ **PERFECT TIMING!** (+15% bonus)';
            } else if (goodCount >= 1) {
                timingBonus = 0.08; // +8% for good timing (reduced from 10%)
                timingText = ' ✅ **Good Timing** (+8% bonus)';
            }

            let winMultiplier = 0;
            if (r1 === r2 && r2 === r3) winMultiplier = 8;
            else if (r1 === r2 || r2 === r3 || r1 === r3) winMultiplier = 3;

            const baseWinAmount = amount * winMultiplier;
            const winAmount = Math.floor(baseWinAmount * (1 + timingBonus));
            
            // TRACK STATS - Update best timing
            let achievementMsg = '';
            if (perfectCount === 2) {
                const isNewRecord = db.updateBestTiming(userId, 'slots', 2.0);
                if (isNewRecord) {
                    const achievementHandler = require('./achievementHandler.js');
                    const unlocked = await achievementHandler.checkAchievements(userId).catch(() => []);
                    if (unlocked.length > 0) {
                        achievementMsg = '\n\n🎉 **ACHIEVEMENT UNLOCKED!** Gunakan `!claim` untuk claim reward!';
                    }
                }
            }
            
            if (winMultiplier > 0) {
                db.updateBalance(userId, winAmount);
                // TRACK STATS
                db.trackGamePlay(userId, 'slots', true);
                
                // Check achievements (total wins)
                const achievementHandler = require('./achievementHandler.js');
                await achievementHandler.checkAchievements(userId).catch(() => {});
            } else {
                // TRACK STATS
                db.trackGamePlay(userId, 'slots', false);
            }
            
            let resultText = winMultiplier > 0 ? `🎉 **WIN!** (+Rp ${formatMoney(winAmount)})${timingText}` : '📉 **LOSE**';
            if (winMultiplier === 8) resultText = `🚨 **JACKPOT!!!** (+Rp ${formatMoney(winAmount)})${timingText}`;
            if (luck > 0) resultText += ` 🍀`;
            resultText += `${achievementMsg}\n*${walletType}*`;

            const finalColor = winMultiplier > 0 ? '#00ff00' : '#ff0000';
            const disabledButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('slot_stop_disabled')
                    .setLabel('🛑 STOPPED')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            await msg.edit({ 
                embeds: [createEmbed(r1, r2, r3, resultText, finalColor)],
                components: [disabledButton]
            });
            
            activeSimpleSlots.delete(msg.id);
        }
        // !math <amount>
        if (command === '!math') {
            const rawAmount = args[1];
            if (!rawAmount) return message.reply('❌ Format: `!math <jumlah>`');

            // Parse amount with suffixes
            let amount = 0;
            const currentBalance = db.getBalance(userId);
            const lowerAmount = rawAmount.toLowerCase();
            const maxBet = db.getUserMaxBet(userId);

            if (lowerAmount === 'all' || lowerAmount === 'allin') {
                amount = Math.min(currentBalance, maxBet);
                if (amount > maxBet) amount = maxBet; // Safety Net
            } else if (lowerAmount.endsWith('k')) {
                amount = parseFloat(lowerAmount) * 1000;
            } else if (lowerAmount.endsWith('m') || lowerAmount.endsWith('jt')) {
                amount = parseFloat(lowerAmount) * 1000000;
            } else {
                amount = parseInt(rawAmount);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
            if (amount > maxBet) return message.reply(`❌ Maksimal taruhan adalah Rp ${maxBet.toLocaleString('id-ID')}!`);

            // Cooldown Check (20 Seconds)
            const mathCooldownTime = 20000;
            const lastMath = mathCooldowns.get(userId) || 0;
            if (now - lastMath < mathCooldownTime) {
                const remaining = Math.ceil((mathCooldownTime - (now - lastMath)) / 1000);
                return message.reply(`⏳ **Sabar bang!** Tunggu ${remaining} detik lagi.`);
            }
            mathCooldowns.set(userId, now);

            if (currentBalance < amount) return message.reply('💸 **Uang gak cukup!** Kerja dulu sana.');

            // Deduct bet
            const updateRes = db.updateBalance(userId, -amount);
            const walletType = updateRes.wallet === 'event' ? '🎟️ Saldo Event' : '💰 Saldo Utama';
            missionHandler.trackMission(userId, 'play_math');
            
            // TRACK STATS (will be updated on win/loss)

            // Determine Difficulty & Multiplier - CHALLENGING BUT FUN
            let difficulty = 'easy';
            let multiplier = 1.15; // 15% Profit (reduced from 1.2)
            let timeLimit = 15000; // 15 seconds

            // Max bet is 10M, so adjust thresholds accordingly
            if (amount >= 5000000) { // 5M or more
                difficulty = 'extreme';
                multiplier = 2.5; // 150% Profit (reduced from 3.0)
                timeLimit = 5000; // 5 seconds
            } else if (amount >= 2000000) { // 2M - 4.99M
                difficulty = 'hard';
                multiplier = 1.8; // 80% Profit (reduced from 2.0)
                timeLimit = 7000; // 7 seconds
            } else if (amount >= 500000) { // 500k - 1.99M
                difficulty = 'medium';
                multiplier = 1.4; // 40% Profit (reduced from 1.5)
                timeLimit = 10000; // 10 seconds
            }

            // Safe Math Parser (replaces eval() for security)
            const safeCalculate = (expression) => {
                // Remove parentheses and calculate recursively
                const calculateExpression = (expr) => {
                    // Handle parentheses first
                    while (expr.includes('(')) {
                        const start = expr.lastIndexOf('(');
                        const end = expr.indexOf(')', start);
                        if (end === -1) break;
                        const inner = expr.substring(start + 1, end);
                        const innerResult = calculateExpression(inner);
                        expr = expr.substring(0, start) + innerResult + expr.substring(end + 1);
                    }

                    // Split by operators (preserve order: *, /, +, -)
                    const tokens = expr.match(/(\d+\.?\d*|[+\-*/])/g) || [];
                    if (tokens.length === 0) return 0;

                    // Convert to numbers and operators
                    const stack = [];
                    let i = 0;
                    while (i < tokens.length) {
                        const token = tokens[i];
                        if (token === '*' || token === '/') {
                            const prev = stack.pop();
                            const next = parseFloat(tokens[++i]);
                            if (token === '*') stack.push(prev * next);
                            else stack.push(prev / next);
                        } else if (token !== '+' && token !== '-') {
                            stack.push(parseFloat(token));
                        } else if (token === '-') {
                            // Handle negative numbers
                            const next = parseFloat(tokens[++i]);
                            stack.push(-next);
                        }
                        i++;
                    }

                    // Sum all values
                    return stack.reduce((sum, val) => sum + val, 0);
                };

                return calculateExpression(expression.replace(/\s/g, ''));
            };

            // Generate Question
            const generateQuestion = (diff) => {
                const ops = ['+', '-', '*', '/'];
                let q = '', a = 0;

                const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

                switch (diff) {
                    case 'easy': // Add/Sub, 2 terms, small numbers
                        {
                            const o = ops[Math.floor(Math.random() * 2)];
                            const n1 = rand(1, 50);
                            const n2 = rand(1, 50);
                            q = `${n1} ${o} ${n2}`;
                            if (o === '+') a = n1 + n2;
                            else a = n1 - n2;
                        }
                        break;
                    case 'medium': // Mul/Div or 3 terms Add/Sub
                        {
                            if (Math.random() < 0.5) {
                                const o = ops[Math.floor(Math.random() * 2) + 2]; // * or /
                                const n1 = rand(2, 12);
                                const n2 = rand(2, 12);
                                if (o === '/') { // Ensure integer result
                                    const res = n1;
                                    const div = n2;
                                    const num = res * div;
                                    q = `${num} / ${div}`;
                                    a = res;
                                } else {
                                    q = `${n1} * ${n2}`;
                                    a = n1 * n2;
                                }
                            } else {
                                const n1 = rand(10, 100);
                                const n2 = rand(10, 100);
                                const n3 = rand(10, 100);
                                const o1 = ops[Math.floor(Math.random() * 2)];
                                const o2 = ops[Math.floor(Math.random() * 2)];
                                q = `${n1} ${o1} ${n2} ${o2} ${n3}`;
                                // Calculate safely
                                let temp = o1 === '+' ? n1 + n2 : n1 - n2;
                                a = o2 === '+' ? temp + n3 : temp - n3;
                            }
                        }
                        break;
                    case 'hard': // Mixed 3 terms, larger numbers
                        {
                            const n1 = rand(20, 200);
                            const n2 = rand(5, 20);
                            const n3 = rand(5, 20);
                            const o1 = ops[Math.floor(Math.random() * 3)]; // +, -, *
                            const o2 = ops[Math.floor(Math.random() * 2)]; // +, -
                            q = `${n1} ${o1} ${n2} ${o2} ${n3}`;
                            // Calculate safely
                            let temp;
                            if (o1 === '+') temp = n1 + n2;
                            else if (o1 === '-') temp = n1 - n2;
                            else temp = n1 * n2;
                            a = o2 === '+' ? temp + n3 : temp - n3;
                        }
                        break;
                    case 'extreme': // 5 terms, parentheses, large numbers
                        {
                            const n1 = rand(100, 1000);
                            const n2 = rand(10, 100);
                            const n3 = rand(10, 100);
                            const n4 = rand(10, 100);
                            const n5 = rand(1, 50);

                            const o1 = ops[Math.floor(Math.random() * 3)]; // +, -, *
                            const o2 = ops[Math.floor(Math.random() * 3)]; // +, -, *
                            const o3 = ops[Math.floor(Math.random() * 3)]; // +, -, *
                            const o4 = ops[Math.floor(Math.random() * 2)]; // +, -

                            // Randomly choose a structure
                            if (Math.random() < 0.5) {
                                // (A o B) o C o (D o E)
                                q = `(${n1} ${o1} ${n2}) ${o2} ${n3} ${o3} (${n4} ${o4} ${n5})`;
                            } else {
                                // A o (B o C) o D o E
                                q = `${n1} ${o1} (${n2} ${o2} ${n3}) ${o3} ${n4} ${o4} ${n5}`;
                            }
                            // Use safe parser for complex expressions
                            a = safeCalculate(q);
                        }
                        break;
                }
                return { q, a: Math.round(a * 100) / 100 }; // Round to 2 decimals if needed
            };

            const { q, a } = generateQuestion(difficulty);
            
            // Show combo info
            let comboText = '';
            if (combo.count > 0) {
                comboText = ` 🔥 **COMBO x${combo.count}**`;
                if (combo.difficulty > 0) {
                    comboText += ` (+${(combo.difficulty * 100).toFixed(0)}% difficulty)`;
                }
            }

            await message.reply(`🧠 **MATH GAME** (${difficulty.toUpperCase()})${comboText}\nSoal: **${q}**\nJawab dalam ${timeLimit / 1000} detik!`);

            const filter = m => m.author.id === userId;
            const collector = message.channel.createMessageCollector({ filter, time: timeLimit, max: 1 });

            collector.on('collect', m => {
                const ans = parseFloat(m.content);
                if (ans === a) {
                    // COMBO SYSTEM - Increment combo on correct answer
                    combo.count++;
                    combo.difficulty = Math.min(combo.difficulty + 0.05, 0.50); // +5% difficulty per win, max 50%
                    mathCombo.set(userId, combo);
                    
                    // TRACK STATS - Update best combo
                    const isNewRecord = db.updateBestCombo(userId, 'math', combo.count);
                    let achievementUnlocked = false;
                    if (isNewRecord && combo.count >= 10) {
                        // Check achievements (async, don't wait)
                        const achievementHandler = require('./achievementHandler.js');
                        achievementHandler.checkAchievements(userId).then(unlocked => {
                            if (unlocked.length > 0) {
                                achievementUnlocked = true;
                            }
                        }).catch(() => {});
                    }
                    
                    // COMBO BONUS
                    let comboBonus = 0;
                    let comboBonusText = '';
                    if (combo.count >= 10) {
                        comboBonus = 0.20; // +20% for 10+ combo
                        comboBonusText = ` 🔥 **COMBO x${combo.count}** (+20% bonus)`;
                    } else if (combo.count >= 5) {
                        comboBonus = 0.10; // +10% for 5-9 combo
                        comboBonusText = ` 🔥 **COMBO x${combo.count}** (+10% bonus)`;
                    } else if (combo.count >= 3) {
                        comboBonus = 0.05; // +5% for 3-4 combo
                        comboBonusText = ` 🔥 **COMBO x${combo.count}** (+5% bonus)`;
                    }
                    
                    const baseWin = Math.floor(amount * multiplier);
                    const winAmount = Math.floor(baseWin * (1 + comboBonus));
                    db.updateBalance(userId, winAmount);
                    
                    // TRACK STATS
                    db.trackGamePlay(userId, 'math', true);
                    
                    // Check achievements (total wins) - async but don't wait
                    const achievementHandler = require('./achievementHandler.js');
                    achievementHandler.checkAchievements(userId).then(async (unlocked) => {
                        // Celebrate milestones
                        const stats = db.getUserStats(userId);
                        const celebrationHandler = require('./celebrationHandler.js');
                        await celebrationHandler.checkMilestones(userId, message.channel, message.author, stats);
                        
                        // Celebrate combo milestones
                        if (combo.count === 10 || combo.count === 20) {
                            await celebrationHandler.celebrateCombo(message.channel, message.author, 'math', combo.count);
                        }
                        
                        // Celebrate achievement unlock
                        if (unlocked.length > 0) {
                            for (const ach of unlocked) {
                                await celebrationHandler.celebrateAchievement(
                                    message.channel, 
                                    message.author, 
                                    ach.name, 
                                    ach.reward
                                );
                            }
                        }
                        
                        // Celebrate big win
                        if (winAmount >= 10000000) {
                            await celebrationHandler.celebrateBigWin(message.channel, message.author, winAmount, multiplier);
                        }
                    }).catch(() => {});
                    
                    let achievementMsg = '';
                    if (isNewRecord && combo.count >= 10) {
                        achievementMsg = '\n\n🎉 **ACHIEVEMENT UNLOCKED!** Gunakan `!claim` untuk claim reward!';
                    }
                    
                    m.reply(`✅ **BENAR!** Kamu menang Rp ${formatMoney(winAmount)}!${comboBonusText}${isNewRecord && combo.count >= 10 ? ' 🎉 **NEW RECORD!**' : ''}${achievementMsg} 🎉\n*${walletType}*`);
                } else {
                    // Reset combo on wrong answer
                    combo.count = 0;
                    combo.difficulty = Math.max(combo.difficulty - 0.10, 0); // -10% difficulty on loss
                    mathCombo.set(userId, combo);
                    
                    // TRACK STATS
                    db.trackGamePlay(userId, 'math', false);
                    
                    m.reply(`❌ **SALAH!** Jawabannya adalah **${a}**. Kamu kehilangan Rp ${formatMoney(amount)}.\n💀 **COMBO RESET!**\n*${walletType}*`);
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    // Reset combo on timeout
                    combo.count = 0;
                    combo.difficulty = Math.max(combo.difficulty - 0.10, 0);
                    mathCombo.set(userId, combo);
                    
                    // TRACK STATS
                    db.trackGamePlay(userId, 'math', false);
                    
                    message.reply(`⏰ **WAKTU HABIS!** Jawabannya adalah **${a}**. Kamu kehilangan Rp ${formatMoney(amount)}.\n💀 **COMBO RESET!**\n*${walletType}*`);
                }
            });
        }

        // !bs / !bigslot (Gates of Mang Ujang) - AUTO/TURBO VERSION
        if (command === '!bs' || command === '!bigslot') {
            // COOLDOWN CHECK
            const bsCooldown = 20000; // 20 Detik
            const lastBs = bigSlotCooldowns.get(userId) || 0;
            if (now - lastBs < bsCooldown) {
                const remaining = Math.ceil((bsCooldown - (now - lastBs)) / 1000);
                return message.reply(`⏳ **Sabar bang!** Tunggu ${remaining} detik lagi.`);
            }
            bigSlotCooldowns.set(userId, now);

            let argsIdx = 1;
            let isBuy = false;
            let riskMode = 'normal'; // normal, double, safe - TRYHARD FEATURE

            if (args[argsIdx]?.toLowerCase() === 'buy') {
                isBuy = true;
                argsIdx++;
            }

            const rawAmount = args[argsIdx];
            if (!rawAmount) return message.reply(`❌ Format: \`!bs [buy] <bet> [normal/double/safe] [auto/turbo] [count]\`\nContoh: \`!bs 10000 normal auto 20\``);
            
            // Check for risk mode
            if (args[argsIdx + 1]?.toLowerCase() === 'normal' || 
                args[argsIdx + 1]?.toLowerCase() === 'double' || 
                args[argsIdx + 1]?.toLowerCase() === 'safe') {
                riskMode = args[argsIdx + 1].toLowerCase();
                argsIdx++; // Skip risk mode in amount parsing
            }

            // Parse Amount
            let amount = 0;
            const currentBalance = db.getBalance(userId);
            const lowerAmount = rawAmount.toLowerCase();
            const maxBet = db.getUserMaxBet(userId);

            if (lowerAmount === 'all' || lowerAmount === 'allin') {
                amount = Math.min(currentBalance, maxBet);
                if (amount > maxBet) amount = maxBet; // Safety Net
            } else if (lowerAmount.endsWith('k')) amount = parseFloat(lowerAmount) * 1000;
            else if (lowerAmount.endsWith('m') || lowerAmount.endsWith('jt')) amount = parseFloat(lowerAmount) * 1000000;
            else amount = parseInt(rawAmount);

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
            if (amount > maxBet) return message.reply(`❌ Maksimal taruhan adalah Rp ${maxBet.toLocaleString('id-ID')}!`);
            if (isBuy && amount > 100000) return message.reply('❌ Maksimal bet untuk fitur Buy adalah 100 Ribu (Total 10 Juta)!');

            argsIdx++;
            let mode = 'normal'; // normal, auto, turbo
            let requestedSpins = 1;

            if (args[argsIdx]?.toLowerCase() === 'auto') {
                mode = 'auto';
                argsIdx++;
                if (args[argsIdx] && !isNaN(args[argsIdx])) requestedSpins = parseInt(args[argsIdx]);
            } else if (args[argsIdx]?.toLowerCase() === 'turbo') {
                mode = 'turbo';
                argsIdx++;
                if (args[argsIdx] && !isNaN(args[argsIdx])) requestedSpins = parseInt(args[argsIdx]);
            }

            // Limit Spins (Strict 10, 30, 50)
            const allowedSpins = [10, 30, 50];
            if ((mode === 'auto' || mode === 'turbo') && !allowedSpins.includes(requestedSpins)) {
                return message.reply('❌ **Auto/Turbo Spin** cuma boleh **10, 30, atau 50** spin!');
            }
            if (requestedSpins < 1) requestedSpins = 1;

            const costPerSpin = isBuy ? amount * 100 : amount;
            const totalCost = costPerSpin * requestedSpins;
            missionHandler.trackMission(userId, 'play_slots', requestedSpins);
            missionHandler.trackMission(userId, 'play_bigslot', requestedSpins);

            // Initial Check - Check total cost for all spins
            if (currentBalance < costPerSpin) {
                return message.reply(`💸 **Uang gak cukup!** Butuh Rp ${formatMoney(costPerSpin)} per spin.`);
            }
            if (currentBalance < totalCost) {
                return message.reply(`💸 **Uang gak cukup!** Butuh Rp ${formatMoney(totalCost)} untuk ${requestedSpins} spin (Rp ${formatMoney(costPerSpin)} per spin).`);
            }

            // Symbols & Helpers
            const symbols = {
                low: ['🍌', '🍇', '🍉', '🍊', '🍎'],
                high: ['🍜', '🍗', '🍔', '🍰'],
                scatter: '🍭',
                multi: '💣'
            };

            const getPayout = (symbol, count) => {
                if (count < 10) return 0; // Increased from 8 to 10 (harder to win)
                if (symbols.low.includes(symbol)) {
                    if (count >= 14) return 1.5; // Increased from 12
                    if (count >= 12) return 1;  // Increased from 10
                    return 0.5;
                }
                if (symbols.high.includes(symbol)) {
                    if (count >= 14) return 2.5; // Increased from 12
                    if (count >= 12) return 1.5; // Increased from 10
                    return 1;
                }
                return 0;
            };

            const generateGrid = (isFreeSpinMode) => {
                // STREAK SYSTEM: Hot (5%), Cold (50%), Normal (45%)
                // MODIFIED: Apply Effective Luck to Streak
                const luck = getEffectiveLuck(userId);

                // If luck is very bad (e.g. -50 or lower), force Cold Streak
                let streakRoll = Math.random();

                if (luck <= -50) {
                    streakRoll = 0.2; // Force Cold range (0.15 - 0.45)
                } else if (luck >= 20) {
                    streakRoll = 0.01; // Force Hot range (< 0.15) if very lucky
                }

                let scatterChance, multiChance, highChance;

                // RISK MODE MODIFIERS - TRYHARD FEATURE (BALANCED)
                let multiplierModifier = 1.0;
                let winChanceModifier = 1.0;
                
                if (riskMode === 'double') {
                    multiplierModifier = 1.5; // +50% multiplier
                    winChanceModifier = 0.85; // -15% win chance (reduced from -20%)
                } else if (riskMode === 'safe') {
                    multiplierModifier = 0.75; // -25% multiplier (reduced from -30%)
                    winChanceModifier = 1.25; // +25% win chance (reduced from +30%)
                }

                // Boost chances slightly during Free Spins - CHALLENGING BUT FUN
                if (isFreeSpinMode) {
                    scatterChance = 0.02;  // Further reduced from 0.025
                    multiChance = 0.05;    // Further reduced from 0.06
                    highChance = 0.40;     // Further reduced from 0.45

                    // Penalty during Free Spins too
                    if (luck <= -50) {
                        scatterChance = 0.001;
                        multiChance = 0.01;
                        highChance = 0.10;
                    }

                } else if (streakRoll < 0.15) {
                    // HOT STREAK (15%)
                    scatterChance = 0.04; // Reduced from 0.05
                    multiChance = 0.06;   // Reduced from 0.07
                    highChance = 0.50;    // Reduced from 0.58
                } else if (streakRoll < 0.35) {
                    // COLD STREAK (20%) - Reduced from 30%
                    scatterChance = 0.008;
                    multiChance = 0.015;
                    highChance = 0.30;
                } else {
                    // NORMAL (65%) - BALANCED CHANCE
                    scatterChance = 0.015; // Reduced from 0.025 (40% reduction)
                    multiChance = 0.025;   // Reduced from 0.04 (37.5% reduction)
                    highChance = 0.35;     // Reduced from 0.47 (25.5% reduction)
                }
                
                // Apply risk mode modifiers to chances - BALANCED
                if (riskMode === 'double') {
                    // Reduce chances for double mode (-15%)
                    scatterChance *= winChanceModifier;
                    multiChance *= winChanceModifier;
                    highChance *= winChanceModifier;
                } else if (riskMode === 'safe') {
                    // Increase chances for safe mode (+25%)
                    scatterChance = Math.min(scatterChance * winChanceModifier, 0.05);
                    multiChance = Math.min(multiChance * winChanceModifier, 0.05);
                    highChance = Math.min(highChance * winChanceModifier, 0.60);
                }

                const grid = [];
                for (let i = 0; i < 5; i++) {
                    const row = [];
                    for (let j = 0; j < 6; j++) {
                        const r = Math.random();
                        if (r < scatterChance) row.push(symbols.scatter);
                        else if (r < multiChance) row.push(symbols.multi);
                        else if (r < highChance) row.push(symbols.high[Math.floor(Math.random() * symbols.high.length)]);
                        else row.push(symbols.low[Math.floor(Math.random() * symbols.low.length)]);
                    }
                    grid.push(row);
                }
                return { grid, multiplierModifier };
            };

            // ASCII Helper
            // Embed Helper
            const renderEmbed = (gridRows, bet, status, resultText, logs, color = 'Blue') => {
                const gridString = gridRows.map(row => `║ ${row.join('  ')} ║`).join('\n');
                const borderTop = '╔══════════════════════════════════╗';
                const borderBot = '╚══════════════════════════════════╝';
                const fullGrid = `\`\`\`\n${borderTop}\n${gridString}\n${borderBot}\n\`\`\``;

                let riskModeText = '';
                if (riskMode === 'double') {
                    riskModeText = ' 🔥 **DOUBLE MODE** (+50% multiplier, -15% win chance)';
                } else if (riskMode === 'safe') {
                    riskModeText = ' 🛡️ **SAFE MODE** (+25% win chance, -25% multiplier)';
                }

                // Status badge
                const statusBadge = color === 'Green' ? '🟢 [WIN]' : color === 'Red' ? '🔴 [LOSE]' : '🟡 [SPINNING]';
                const embedColor = color === 'Green' ? '#00FF00' : color === 'Red' ? '#FF0000' : '#FFD700';
                
                const embed = new EmbedBuilder()
                    .setTitle('🎰 WARUNG SLOTS (Gates of Mang Ujang) 🎰')
                    .setColor(embedColor)
                    .setDescription(
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `${fullGrid}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `${statusBadge} ${status}`
                    )
                    .addFields(
                        { name: '💰 Bet', value: `Rp ${formatMoney(bet)}${riskModeText}`, inline: true },
                        { name: '📊 Status', value: status, inline: true },
                        { name: '🚨 Max Win', value: `5000x Bet (Rp ${formatMoney(bet * 5000)})`, inline: true }
                    );

                if (resultText) {
                    embed.addFields({ name: '📝 Result', value: resultText, inline: false });
                }

                if (logs && logs.length > 0) {
                    embed.setFooter({ text: logs.join(' | ') });
                }

                return embed;
            };

            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const spinning = '🌀';

            // Stop Button
            const stopButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('slot_stop')
                    .setLabel('🛑 STOP AUTO SPIN')
                    .setStyle(ButtonStyle.Danger)
            );

            // Initial Embed
            let msg = await message.reply({
                content: `🚀 **Memulai ${mode === 'normal' ? 'Spin' : mode.toUpperCase() + ' Mode'} (${requestedSpins}x)...**`,
                embeds: [renderEmbed(
                    Array(5).fill(Array(6).fill(spinning)),
                    amount,
                    'Starting...',
                    null,
                    [],
                    'Blue'
                )],
                components: [stopButton]
            });

            activeSlots.set(msg.id, { userId, stopped: false });

            let totalSpent = 0;
            let totalWon = 0;
            let spinsLeft = requestedSpins;
            let freeSpinsQueue = 0;
            let spinIndex = 0;
            let accumulatedMultiplier = 0; // For Free Spins
            let walletType = '';

            const MAX_WIN_CAP = amount * 5000;
            let isMaxWinReached = false;

            // --- SPIN LOOP ---
            while ((spinsLeft > 0 || freeSpinsQueue > 0) && !isMaxWinReached) {
                // Check Stop Flag
                if (activeSlots.get(msg.id)?.stopped) {
                    await message.channel.send(`🛑 **Auto Spin Dihentikan oleh User!**`);
                    break;
                }

                spinIndex++;
                let isFreeSpin = false;
                let currentCost = 0;

                // Determine if Free Spin or Paid Spin
                if (freeSpinsQueue > 0) {
                    isFreeSpin = true;
                    freeSpinsQueue--;
                } else {
                    spinsLeft--;
                    currentCost = costPerSpin;
                }

                // Check Balance for Paid Spins
                if (!isFreeSpin) {
                    const currentBal = db.getBalance(userId);
                    if (currentBal < currentCost) {
                        await message.channel.send(`⚠️ **Stop!** Uang habis di spin ke-${spinIndex}.`);
                        break;
                    }
                    // Deduct
                    const updateRes = db.updateBalance(userId, -currentCost);
                    walletType = updateRes.wallet === 'event' ? '🎟️ Event' : '💰 Utama';
                    totalSpent += currentCost;
                    handleJackpot(currentCost, userId);
                }

                // Generate Grid
                const gridResult = generateGrid(isFreeSpin);
                let grid = gridResult.grid;
                const currentMultiplierModifier = gridResult.multiplierModifier;

                // Handle Buy Feature (Force Scatters on first spin if bought)
                if (isBuy && spinIndex === 1) {
                    let scatters = 0;
                    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) if (grid[r][c] === symbols.scatter) scatters++;
                    while (scatters < 4) {
                        const r = Math.floor(Math.random() * 5);
                        const c = Math.floor(Math.random() * 6);
                        if (grid[r][c] !== symbols.scatter) {
                            grid[r][c] = symbols.scatter;
                            scatters++;
                        }
                    }
                }

                // Animation (Only for Normal or Auto, skip for Turbo unless it's a Free Spin trigger maybe?)
                // To keep it fast, we skip animation in Turbo, but maybe show it if it's a big win?
                // For now, keep standard logic:
                if (mode !== 'turbo') {
                    for (let r = 1; r <= 5; r++) {
                        const partialGrid = [];
                        for (let j = 0; j < 5; j++) {
                            if (j < r) partialGrid.push(grid[j]);
                            else partialGrid.push(Array(6).fill(spinning));
                        }
                        let status = isFreeSpin ? `🔥 FREE SPIN (${freeSpinsQueue + 1} Left)` : `Spin ${spinIndex}`;
                        if (accumulatedMultiplier > 0) status += ` | Total Multi: x${accumulatedMultiplier}`;

                        await msg.edit({ embeds: [renderEmbed(partialGrid, amount, status, 'Spinning...', [], 'Blue')] });
                        await delay(800);
                    }
                } else {
                    // Turbo Mode Delay (Safety)
                    await delay(200);
                }

                // Calculate Win
                let spinWin = 0;
                let log = [];

                // 1. Scatters (Trigger Free Spins)
                let scatterCount = 0;
                for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) if (grid[r][c] === symbols.scatter) scatterCount++;

                if (scatterCount >= 4) {
                    const addedSpins = 10;
                    freeSpinsQueue += addedSpins;
                    log.push(`✨ **SCATTER! +${addedSpins} FREE SPINS**`);

                    const scatterEmbed = new EmbedBuilder()
                        .setTitle('✨ SCATTER TRIGGERED! ✨')
                        .setDescription(`Selamat! Kamu dapat **+${addedSpins} Free Spins**!`)
                        .setImage('attachment://scatter.png')
                        .setColor('#FFD700');

                    const scatterMsg = await message.channel.send({
                        embeds: [scatterEmbed],
                        files: [path.join(__dirname, '../assets/scatter.png')]
                    });

                    await delay(3000); // Wait 3 seconds
                    try {
                        await scatterMsg.delete(); // Auto-delete
                    } catch (e) { }
                }

                // 2. Symbols
                const counts = {};
                for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
                    const s = grid[r][c];
                    counts[s] = (counts[s] || 0) + 1;
                }

                let roundWin = 0;
                for (const [sym, count] of Object.entries(counts)) {
                    if (sym === symbols.scatter || sym === symbols.multi) continue;
                    const pay = getPayout(sym, count);
                    if (pay > 0) {
                        // Apply risk mode multiplier modifier
                        roundWin += amount * pay * currentMultiplierModifier;
                    }
                }

                // 3. Multipliers
                let roundMulti = 0;
                for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
                    if (grid[r][c] === symbols.multi) {
                        // Reduced high multipliers chance
                        const multis = [2, 2, 2, 5, 5, 10, 10, 25, 50];
                        roundMulti += multis[Math.floor(Math.random() * multis.length)];
                    }
                }

                if (roundWin > 0) {
                    // Accumulating Multiplier Logic for Free Spins
                    if (isFreeSpin) {
                        if (roundMulti > 0) {
                            accumulatedMultiplier += roundMulti;
                            spinWin = roundWin * accumulatedMultiplier;
                            log.push(`💣 **Multi x${roundMulti}** (Total: x${accumulatedMultiplier})`);
                        } else {
                            spinWin = roundWin;
                        }
                    } else {
                        // Normal Spin
                        if (roundMulti > 0) {
                            spinWin = roundWin * roundMulti;
                            log.push(`💣 **Multiplier x${roundMulti}**`);
                        } else {
                            spinWin = roundWin;
                        }
                    }
                }

                // Payout
                if (spinWin > 0) {
                    db.updateBalance(userId, spinWin);
                    totalWon += spinWin;
                    // TRACK STATS
                    db.trackGamePlay(userId, 'bigslot', true);
                    
                    // Check achievements (total wins) - only once per session to avoid spam
                    if (spinIndex === 1 || (spinIndex % 10 === 0)) {
                        try {
                            const achievementHandler = require('./achievementHandler.js');
                            await achievementHandler.checkAchievements(userId);
                        } catch (e) {
                            console.error('[BIGSLOT ACHIEVEMENT ERROR]', e);
                        }
                    }
                } else {
                    // TRACK STATS
                    db.trackGamePlay(userId, 'bigslot', false);
                }

                // MAX WIN CHECK
                if (totalWon >= MAX_WIN_CAP) {
                    totalWon = MAX_WIN_CAP;
                    isMaxWinReached = true;
                }

                // Update Message (Final Result of this spin)
                const resultText = spinWin > 0 ? `💰 **WIN: Rp ${formatMoney(spinWin)}**` : `📉 **RUNGKAD**`;
                let status = isFreeSpin ? `🔥 FREE SPIN (${freeSpinsQueue} Left)` : `Spin ${spinIndex}`;
                if (accumulatedMultiplier > 0) status += ` | Total Multi: x${accumulatedMultiplier}`;

                const color = spinWin > 0 ? 'Green' : 'Red';

                if (mode === 'turbo') {
                    await msg.edit({ embeds: [renderEmbed(grid, amount, status, resultText, log, color)] });
                    await delay(500);
                } else {
                    await msg.edit({ embeds: [renderEmbed(grid, amount, status, resultText, log, color)] });
                    await delay(1000);
                }
            }

            // Final Summary
            const net = totalWon - totalSpent;
            const summaryStatus = net >= 0 ? '🟢 [PROFIT]' : '🔴 [LOSS]';
            
            const summaryEmbed = new EmbedBuilder()
                .setTitle('🎰 SESSION ENDED')
                .setColor(net >= 0 ? '#00FF00' : '#FF0000')
                .setDescription(
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `${summaryStatus} **Session Summary**\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .addFields(
                    { name: 'Total Spins', value: `${spinIndex}`, inline: true },
                    { name: 'Total Spent', value: `Rp ${formatMoney(totalSpent)}`, inline: true },
                    { name: 'Total Won', value: `Rp ${formatMoney(totalWon)}`, inline: true },
                    { name: 'Net Profit', value: `Rp ${formatMoney(net)}`, inline: false },
                    { name: 'Wallet', value: walletType || 'Unknown', inline: false }
                )
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setFooter({ text: '🎰 Warung Mang Ujang' })
                .setTimestamp();

            if (isMaxWinReached) {
                summaryEmbed.setDescription(
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `🚨 **MAX WIN REACHED!**\n` +
                    `💰 **Win:** 5000x Bet = Rp ${formatMoney(amount * 5000)}\n` +
                    `⚠️ Sesi dihentikan otomatis untuk mencegah exploit.\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                );
            }

            await message.channel.send({ embeds: [summaryEmbed] });
            activeSlots.delete(msg.id);
        }
    },

    // Handle Button Interactions for Slot Stop
    async handleSlotButton(interaction) {
        try {
            if (interaction.customId === 'slot_stop') {
                const state = activeSlots.get(interaction.message.id);
                if (!state) {
                    if (interaction.deferred || interaction.replied) {
                        return interaction.editReply({ content: '❌ Sesi tidak ditemukan.' });
                    }
                    return interaction.reply({ content: '❌ Sesi tidak ditemukan.', flags: [MessageFlags.Ephemeral] });
                }

                if (state.userId !== interaction.user.id) {
                    if (interaction.deferred || interaction.replied) {
                        return interaction.editReply({ content: '❌ Bukan sesi kamu!' });
                    }
                    return interaction.reply({ content: '❌ Bukan sesi kamu!', flags: [MessageFlags.Ephemeral] });
                }

                state.stopped = true;
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: '🛑 Menghentikan auto spin...' });
                } else {
                    await interaction.reply({ content: '🛑 Menghentikan auto spin...', flags: [MessageFlags.Ephemeral] });
                }
            } else if (interaction.customId === 'slot_stop_reel') {
                // Timing stop for simple slots - TRYHARD FEATURE
                const state = activeSimpleSlots.get(interaction.message.id);
                if (!state) {
                    // Game already ended, just acknowledge
                    try {
                        if (interaction.deferred || interaction.replied) {
                            return; // Already handled
                        }
                        await interaction.reply({ content: '❌ Game sudah berakhir.', flags: [MessageFlags.Ephemeral] });
                    } catch (e) {
                        // Ignore errors if interaction expired
                    }
                    return;
                }

                if (state.userId !== interaction.user.id) {
                    // Not the game owner, just acknowledge
                    try {
                        if (interaction.deferred || interaction.replied) {
                            return; // Already handled
                        }
                        await interaction.reply({ content: '❌ Bukan game kamu!', flags: [MessageFlags.Ephemeral] });
                    } catch (e) {
                        // Ignore errors if interaction expired
                    }
                    return;
                }

                // Stop current reel
                const reelNumber = state.currentReel + 1;
                state.currentReel = reelNumber;
                if (state.currentReel >= 3) {
                    state.stopped = true;
                }

                // Update the original message to show stop status
                // Don't use editReply, just acknowledge with update
                try {
                    if (interaction.deferred || interaction.replied) {
                        // Already deferred, just return - the game loop will handle the update
                        return;
                    }
                    // Acknowledge the interaction
                    await interaction.update({ content: null }); // Clear any content, let the game loop update the embed
                } catch (e) {
                    // If update fails, try reply
                    try {
                        await interaction.reply({ content: `🛑 Reel ${reelNumber} dihentikan!`, flags: [MessageFlags.Ephemeral] });
                    } catch (e2) {
                        // Ignore if interaction expired
                    }
                }
            }
        } catch (error) {
            console.error('[SLOT BUTTON ERROR]', error);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: '❌ **Error:** Gagal memproses. Silakan coba lagi.' });
                } else {
                    await interaction.reply({ content: '❌ **Error:** Gagal memproses. Silakan coba lagi.', flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) {
                console.error('[SLOT ERROR HANDLING FAILED]', e);
            }
        }
    }
};
