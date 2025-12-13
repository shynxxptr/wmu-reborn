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
// Cooldown Map for Math
const mathCooldowns = new Map();
const coinflipCooldowns = new Map();
const slotsCooldowns = new Map();

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

        // Helper to get effective luck (Base + Penalty + Wealth Limiter)
        const getEffectiveLuck = (uid) => {
            // 1. Base Luck from Doa Ujang
            let luck = 0;
            const u = db.prepare('SELECT luck_boost, luck_expiration FROM user_economy WHERE user_id = ?').get(uid);
            if (u && u.luck_expiration > Date.now()) {
                luck = u.luck_boost;
            }

            // 2. Manual Penalty
            const penalty = db.getPenalty(uid);
            luck += penalty;

            // 3. DYNAMIC WEALTH LIMITER (Sistem Rungkad Bertingkat)
            const wealth = db.getWealthStatus(uid);
            const userBal = db.getBalance(uid);

            // Threshold Configuration
            const levels = [
                { limit: 100000000, duration: 6 * 3600 * 1000 },   // 100 Juta - 6 Jam
                { limit: 500000000, duration: 12 * 3600 * 1000 },  // 500 Juta - 12 Jam
                { limit: 1000000000, duration: 24 * 3600 * 1000 }, // 1 Milyar - 24 Jam
                { limit: 10000000000, duration: 48 * 3600 * 1000 },// 10 Milyar - 2 Hari
                { limit: 50000000000, duration: 72 * 3600 * 1000 },// 50 Milyar - 3 Hari
                { limit: 100000000000, duration: 120 * 3600 * 1000 }// 100 Milyar - 5 Hari
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

        // !coinflip <amount> <h/t>
        if (command === '!coinflip' || command === '!cf') {
            const rawAmount = args[1];
            const choice = args[2]?.toLowerCase(); // head/tail atau h/t

            if (!rawAmount || !['head', 'tail', 'h', 't'].includes(choice)) {
                return message.reply('❌ Format: `!cf <jumlah> <head/tail>`');
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

            // Jackpot Check
            handleJackpot(amount, userId);

            // Luck Logic - CHALLENGING BUT FUN
            const luck = getEffectiveLuck(userId);
            const baseChance = 0.45; // 45% base (5% house edge for challenge)
            const winChance = baseChance + (luck / 150); // Reduced luck effect (from /100 to /150)

            const isWin = Math.random() < winChance;

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
                const emoji = currentFace === 'head' ? '🪙' : '🪙'; // Same emoji but different display
                const faceText = currentFace === 'head' ? '**HEAD** ⬆️' : '**TAIL** ⬇️';
                return new EmbedBuilder()
                    .setTitle('🪙 COINFLIP 🪙')
                    .setDescription(`${emoji} ${faceText}`)
                    .setColor(currentFace === 'head' ? '#FFD700' : '#C0C0C0')
                    .addFields({ name: 'Status', value: status });
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
                const winAmount = amount * 2;
                db.updateBalance(userId, winAmount);
                missionHandler.trackMission(userId, 'win_coinflip');
                const luckMsg = luck > 0 ? ` (🍀 Luck +${luck}%)` : '';
                await msg.edit({
                    embeds: [createFlipEmbed(result, `✅ **MENANG!** +Rp ${formatMoney(winAmount)}${luckMsg}\n*${walletType}*`)],
                    content: null
                });
            } else {
                // Already deducted
                await msg.edit({
                    embeds: [createFlipEmbed(result, `❌ **KALAH!** -Rp ${formatMoney(amount)}\n*${walletType}*`)],
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
                return new EmbedBuilder()
                    .setTitle('🎰 WARUNG SLOTS 🎰')
                    .setDescription(grid)
                    .setColor(color)
                    .addFields({ name: 'Status', value: status });
            };

            const msg = await message.reply({ embeds: [createEmbed(spinning, spinning, spinning, 'Spinning...')] });

            // Animation Sequence
            // Reel 1 Stop
            await delay(1000);
            await msg.edit({ embeds: [createEmbed(r1, spinning, spinning, 'Spinning...')] });

            // Reel 2 Stop
            await delay(1000);
            await msg.edit({ embeds: [createEmbed(r1, r2, spinning, 'Spinning...')] });

            // Reel 3 Stop (Final Result)
            await delay(1000);

            let winMultiplier = 0;
            if (r1 === r2 && r2 === r3) winMultiplier = 8; // Jackpot (increased from 5)
            else if (r1 === r2 || r2 === r3 || r1 === r3) winMultiplier = 3; // Small Win (increased from 2)

            const winAmount = amount * winMultiplier;
            if (winMultiplier > 0) {
                db.updateBalance(userId, winAmount); // Add win (original bet already deducted)
            }

            let resultText = winMultiplier > 0 ? `🎉 **WIN!** (+Rp ${formatMoney(winAmount)})` : '📉 **LOSE**';
            if (winMultiplier === 5) resultText = `🚨 **JACKPOT!!!** (+Rp ${formatMoney(winAmount)})`;
            if (luck > 0) resultText += ` 🍀`;
            resultText += `\n*${walletType}*`;

            const finalColor = winMultiplier > 0 ? '#00ff00' : '#ff0000';
            await msg.edit({ embeds: [createEmbed(r1, r2, r3, resultText, finalColor)] });
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

            await message.reply(`🧠 **MATH GAME** (${difficulty.toUpperCase()})\nSoal: **${q}**\nJawab dalam ${timeLimit / 1000} detik!`);

            const filter = m => m.author.id === userId;
            const collector = message.channel.createMessageCollector({ filter, time: timeLimit, max: 1 });

            collector.on('collect', m => {
                const ans = parseFloat(m.content);
                if (ans === a) {
                    const winAmount = Math.floor(amount * multiplier);
                    db.updateBalance(userId, winAmount);
                    m.reply(`✅ **BENAR!** Kamu menang Rp ${formatMoney(winAmount)}! 🎉\n*${walletType}*`);
                } else {
                    m.reply(`❌ **SALAH!** Jawabannya adalah **${a}**. Kamu kehilangan Rp ${formatMoney(amount)}.\n*${walletType}*`);
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    message.reply(`⏰ **WAKTU HABIS!** Jawabannya adalah **${a}**. Kamu kehilangan Rp ${formatMoney(amount)}.\n*${walletType}*`);
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

            if (args[argsIdx]?.toLowerCase() === 'buy') {
                isBuy = true;
                argsIdx++;
            }

            const rawAmount = args[argsIdx];
            if (!rawAmount) return message.reply(`❌ Format: \`!bs [buy] <bet> [auto/turbo] [count]\`\nContoh: \`!bs 10000 auto 20\``);

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
                return grid;
            };

            // ASCII Helper
            // Embed Helper
            const renderEmbed = (gridRows, bet, status, resultText, logs, color = 'Blue') => {
                const gridString = gridRows.map(row => `║ ${row.join('  ')} ║`).join('\n');
                const borderTop = '╔══════════════════════════════════╗';
                const borderBot = '╚══════════════════════════════════╝';
                const fullGrid = `\`\`\`\n${borderTop}\n${gridString}\n${borderBot}\n\`\`\``;

                const embed = new EmbedBuilder()
                    .setTitle('🎰 WARUNG SLOTS (Gates of Mang Ujang) 🎰')
                    .setColor(color)
                    .setDescription(fullGrid)
                    .addFields(
                        { name: '💰 Bet', value: `Rp ${formatMoney(bet)}`, inline: true },
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
                let grid = generateGrid(isFreeSpin);

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
                        roundWin += amount * pay;
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
            const summaryEmbed = new EmbedBuilder()
                .setTitle('🎰 SESSION ENDED')
                .setColor(net >= 0 ? '#00FF00' : '#FF0000')
                .addFields(
                    { name: 'Total Spins', value: `${spinIndex}`, inline: true },
                    { name: 'Total Spent', value: `Rp ${formatMoney(totalSpent)}`, inline: true },
                    { name: 'Total Won', value: `Rp ${formatMoney(totalWon)}`, inline: true },
                    { name: 'Net Profit', value: `Rp ${formatMoney(net)}`, inline: false },
                    { name: 'Wallet', value: walletType || 'Unknown', inline: false }
                );

            if (isMaxWinReached) {
                summaryEmbed.setDescription(`🚨 **MAX WIN REACHED!** (5000x Bet = Rp ${formatMoney(amount * 5000)})\nSesi dihentikan otomatis untuk mencegah exploit.`);
            }

            await message.channel.send({ embeds: [summaryEmbed] });
            activeSlots.delete(msg.id);
        }
    },

    // Handle Button Interactions for Slot Stop
    async handleSlotButton(interaction) {
        if (interaction.customId === 'slot_stop') {
            const state = activeSlots.get(interaction.message.id);
            if (!state) return interaction.reply({ content: '❌ Sesi tidak ditemukan.', flags: [MessageFlags.Ephemeral] });

            if (state.userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ Bukan sesi kamu!', flags: [MessageFlags.Ephemeral] });
            }

            state.stopped = true;
            await interaction.reply({ content: '🛑 Menghentikan auto spin...', flags: [MessageFlags.Ephemeral] });
        }
    }
};
