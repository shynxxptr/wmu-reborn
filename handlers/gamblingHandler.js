const db = require('../database.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { formatMoney } = require('../utils/helpers.js');
const path = require('path');

// Cooldown Map for Doa Ujang
const doaCooldowns = new Map();
// Cooldown Map for BigSlot
const bigSlotCooldowns = new Map();
// Active Slots Map
const activeSlots = new Map();

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

            // 0.0001% Chance (1 in 1,000,000) - Reduced from 1 in 100,000
            if (Math.random() < 0.000001) {
                const jackpotPool = db.getJackpot();
                if (jackpotPool > 0) {
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
                return message.reply(`🛑 **Sabar!** Mang Ujang lagi wirid.\nCoba lagi <t:${Math.ceil((lastDoa + cooldownTime) / 1000)}:R>.`);
            }

            const cost = 2000;
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);

            if (!user || user.uang_jajan < cost) {
                return message.reply(`💸 **Sedekah kurang!** Butuh Rp ${formatMoney(cost)} buat beli dupa.`);
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

        // Helper to get effective luck (Base + Penalty)
        const getEffectiveLuck = (uid) => {
            // 1. Base Luck from Doa Ujang
            let luck = 0;
            const u = db.prepare('SELECT luck_boost, luck_expiration FROM user_economy WHERE user_id = ?').get(uid);
            if (u && u.luck_expiration > Date.now()) {
                luck = u.luck_boost;
            }

            // 2. Manual Penalty
            const penalty = db.getPenalty(uid);
            luck += penalty; // penalty is usually negative, e.g. -50

            // 3. Auto Penalty (High Balance)
            const userBal = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(uid);
            if (userBal) {
                const threshold = db.getSystemVar('auto_penalty_threshold', 1000000000); // Default 1Milyar
                if (userBal.uang_jajan > threshold) {
                    luck -= 90; // Massive penalty for rich people
                }
            }

            return luck;
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

            // Jackpot Check
            handleJackpot(amount, userId);

            // Luck Logic
            const luck = getEffectiveLuck(userId);
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
                return message.reply(`🪙 **${result.toUpperCase()}!** Kamu MENANG Rp ${formatMoney(amount)}! 🎉${luckMsg}`);
            } else {
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(amount, userId);
                return message.reply(`🪙 **${result.toUpperCase()}!** Kamu KALAH Rp ${formatMoney(amount)}. Sad. 📉`);
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

            // Jackpot Check
            handleJackpot(amount, userId);

            // EMOJI MAKANAN KANTIN
            const items = ['☕', '🍝', '🥣', '🍹', '🍞', '🍡'];

            // Luck Logic for Slots
            // If lucky, chance to reroll bad result
            const luck = getEffectiveLuck(userId);
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
            if (r1 === r2 && r2 === r3) winMultiplier = 5; // Jackpot
            else if (r1 === r2 || r2 === r3 || r1 === r3) winMultiplier = 2; // Small Win

            const winAmount = amount * winMultiplier;
            if (winMultiplier > 0) {
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(winAmount, userId); // Add win (original bet already deducted)
            }

            let resultText = winMultiplier > 0 ? `🎉 **WIN!** (+Rp ${formatMoney(winAmount)})` : '📉 **LOSE**';
            if (winMultiplier === 5) resultText = `🚨 **JACKPOT!!!** (+Rp ${formatMoney(winAmount)})`;
            if (luck > 0) resultText += ` 🍀`;

            const finalColor = winMultiplier > 0 ? '#00ff00' : '#ff0000';
            await msg.edit({ embeds: [createEmbed(r1, r2, r3, resultText, finalColor)] });
        }
        // !math <amount>
        if (command === '!math') {
            const rawAmount = args[1];
            if (!rawAmount) return message.reply('❌ Format: `!math <jumlah>`');

            // Parse amount with suffixes
            let amount = 0;
            const lowerAmount = rawAmount.toLowerCase();
            if (lowerAmount.endsWith('k')) {
                amount = parseFloat(lowerAmount) * 1000;
            } else if (lowerAmount.endsWith('m') || lowerAmount.endsWith('jt')) {
                amount = parseFloat(lowerAmount) * 1000000;
            } else {
                amount = parseInt(rawAmount);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
            if (amount > 100000000) return message.reply('❌ Maksimal taruhan adalah 100 Juta!');

            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            if (!user || user.uang_jajan < amount) return message.reply('💸 **Uang gak cukup!** Kerja dulu sana.');

            // Deduct bet
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(amount, userId);

            // Determine Difficulty & Multiplier
            let difficulty = 'easy';
            let multiplier = 1.5;
            let timeLimit = 10000; // 10 seconds

            if (amount >= 50000000) {
                difficulty = 'extreme';
                multiplier = 5;
            } else if (amount >= 10000000) {
                difficulty = 'hard';
                multiplier = 3;
            } else if (amount >= 1000000) {
                difficulty = 'medium';
                multiplier = 2;
            }

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
                            a = eval(q);
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
                                a = eval(q);
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
                            a = eval(q);
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
                            a = eval(q);
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
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(winAmount, userId);
                    m.reply(`✅ **BENAR!** Kamu menang Rp ${formatMoney(winAmount)}! 🎉`);
                } else {
                    m.reply(`❌ **SALAH!** Jawabannya adalah **${a}**. Kamu kehilangan Rp ${formatMoney(amount)}.`);
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    message.reply(`⏰ **WAKTU HABIS!** Jawabannya adalah **${a}**. Kamu kehilangan Rp ${formatMoney(amount)}.`);
                }
            });
        }

        // !bs / !bigslot (Gates of Mang Ujang) - AUTO/TURBO VERSION
        if (command === '!bs' || command === '!bigslot') {
            // COOLDOWN CHECK
            const bsCooldown = 10000; // 10 Detik
            const lastBs = bigSlotCooldowns.get(userId) || 0;
            if (now - lastBs < bsCooldown) {
                return message.reply(`⏳ **Sabar bang!** Tunggu <t:${Math.ceil((lastBs + bsCooldown) / 1000)}:R> lagi.`);
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
            const lowerAmount = rawAmount.toLowerCase();
            if (lowerAmount.endsWith('k')) amount = parseFloat(lowerAmount) * 1000;
            else if (lowerAmount.endsWith('m') || lowerAmount.endsWith('jt')) amount = parseFloat(lowerAmount) * 1000000;
            else amount = parseInt(rawAmount);

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');

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

            // Limit Spins
            if (requestedSpins > 100) requestedSpins = 100;
            if (requestedSpins < 1) requestedSpins = 1;

            const costPerSpin = isBuy ? amount * 100 : amount;

            // Initial Check
            const userCheck = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
            if (!userCheck || userCheck.uang_jajan < costPerSpin) {
                return message.reply(`💸 **Uang gak cukup!** Butuh Rp ${formatMoney(costPerSpin)} per spin.`);
            }

            // Symbols & Helpers
            const symbols = {
                low: ['🍌', '🍇', '🍉', '🍊', '🍎'],
                high: ['🍜', '🍗', '🍔', '🍰'],
                scatter: '🍭',
                multi: '💣'
            };

            const getPayout = (symbol, count) => {
                if (count < 8) return 0;
                if (symbols.low.includes(symbol)) {
                    if (count >= 12) return 1.5;
                    if (count >= 10) return 1;
                    return 0.5;
                }
                if (symbols.high.includes(symbol)) {
                    if (count >= 12) return 2.5;
                    if (count >= 10) return 1.5;
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
                    streakRoll = 0.1; // Force Cold range (0.05 - 0.55)
                } else if (luck >= 20) {
                    streakRoll = 0.01; // Force Hot range (< 0.05) if very lucky
                }

                let scatterChance, multiChance, highChance;

                // Boost chances slightly during Free Spins
                if (isFreeSpinMode) {
                    scatterChance = 0.03; // Higher chance to retrigger
                    multiChance = 0.08;   // More multipliers
                    highChance = 0.55;

                    // Penalty during Free Spins too
                    if (luck <= -50) {
                        scatterChance = 0.001;
                        multiChance = 0.01;
                        highChance = 0.10;
                    }

                } else if (streakRoll < 0.05) {
                    // HOT STREAK (Rare)
                    scatterChance = 0.03;
                    multiChance = 0.05;
                    highChance = 0.50;
                } else if (streakRoll < 0.55) {
                    // COLD STREAK (Common)
                    scatterChance = 0.005;
                    multiChance = 0.01;
                    highChance = 0.25;
                } else {
                    // NORMAL
                    scatterChance = 0.015;
                    multiChance = 0.02;
                    highChance = 0.40;
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
                        { name: '📊 Status', value: status, inline: true }
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
                    const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
                    if (user.uang_jajan < currentCost) {
                        await message.channel.send(`⚠️ **Stop!** Uang habis di spin ke-${spinIndex}.`);
                        break;
                    }
                    // Deduct
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(currentCost, userId);
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
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(spinWin, userId);
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
                    await delay(1500);
                }
            }

            // --- FINAL SUMMARY ---
            if (isMaxWinReached) {
                await message.channel.send({ files: [path.join(__dirname, '../assets/maxwin.png')] });
                await delay(1000);
                await message.channel.send(`🎉🎉 **MAX WIN REACHED!** 🎉🎉\nSelamat! Kamu mencapai kemenangan maksimal **5000x** (Rp ${formatMoney(MAX_WIN_CAP)})!`);
            }

            const profit = totalWon - totalSpent;


            const summaryEmbed = new EmbedBuilder()
                .setTitle('📊 HASIL SPIN 📊')
                .setColor(profit >= 0 ? '#00FF00' : '#FF0000')
                .addFields(
                    { name: 'Total Spin', value: `${spinIndex}`, inline: true },
                    { name: 'Total Modal', value: `Rp ${formatMoney(totalSpent)}`, inline: true },
                    { name: 'Total Menang', value: `Rp ${formatMoney(totalWon)}`, inline: true },
                    { name: profit >= 0 ? '📈 PROFIT' : '📉 RUGI', value: `Rp ${formatMoney(Math.abs(profit))}`, inline: false }
                );

            await message.channel.send({ embeds: [summaryEmbed] });
            activeSlots.delete(msg.id);
        }

        // !raffle
        if (command === '!raffle') {
            const sub = args[1]?.toLowerCase();

            if (sub === 'buy') {
                const count = parseInt(args[2]);
                if (isNaN(count) || count <= 0) return message.reply('❌ Format: `!raffle buy <jumlah>`');

                const price = 5000;
                const res = db.buyRaffleTicket(userId, count, price);

                if (res.success) {
                    return message.reply(`🎟️ **Sukses!** Kamu membeli **${count}** tiket raffle seharga Rp ${formatMoney(count * price)}.`);
                } else {
                    return message.reply(`❌ **Gagal:** ${res.error}`);
                }
            }

            if (sub === 'info') {
                const data = db.getRaffleData();
                const userTickets = db.prepare("SELECT ticket_count FROM raffle_participants WHERE user_id = ?").get(userId)?.ticket_count || 0;

                return message.reply(`🎟️ **RAFFLE INFO** 🎟️\n💰 **Total Pot:** Rp ${formatMoney(data.pot)}\n🎫 **Total Tiket:** ${data.totalTickets}\n👤 **Tiket Kamu:** ${userTickets}\n\n*Beli tiket dengan \`!raffle buy <jumlah>\` (Rp 5.000/tiket)*`);
            }

            if (sub === 'draw') {
                // Admin check (You might want to replace this with a real admin check)
                // For now, let's assume anyone can draw for testing, or check specific ID
                // if (userId !== 'YOUR_ADMIN_ID') return; 

                const data = db.getRaffleData();
                if (data.totalTickets === 0) return message.reply('❌ Belum ada partisipan raffle.');

                const winnerId = db.drawRaffleWinner();
                if (winnerId) {
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(data.pot, winnerId);
                    db.resetRaffle();

                    return message.channel.send(`🎉 **RAFFLE DRAW** 🎉\nSelamat kepada <@${winnerId}> yang memenangkan POT sebesar **Rp ${formatMoney(data.pot)}**! 🥳💸`);
                } else {
                    return message.reply('❌ Terjadi kesalahan saat mengundi.');
                }
            }

            return message.reply('❌ Command: `!raffle buy <n>`, `!raffle info`, `!raffle draw`');
        }
    },

    async handleSlotInteraction(interaction) {
        if (!interaction.customId.startsWith('slot_')) return;

        if (interaction.customId === 'slot_stop') {
            const game = activeSlots.get(interaction.message.id);
            if (!game) return interaction.reply({ content: '❌ Sesi spin sudah berakhir.', flags: [MessageFlags.Ephemeral] });

            if (interaction.user.id !== game.userId) {
                return interaction.reply({ content: '❌ Bukan sesi spin kamu!', flags: [MessageFlags.Ephemeral] });
            }

            game.stopped = true;
            await interaction.reply({ content: '🛑 Menghentikan auto spin...', flags: [MessageFlags.Ephemeral] });

            // Disable button
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('slot_stop')
                    .setLabel('🛑 STOPPED')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );
            await interaction.message.edit({ components: [disabledRow] });
        }
    }
};
