const db = require('../database.js');

// Cooldown Map for Doa Ujang
const doaCooldowns = new Map();

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

            // 0.05% Chance (1 in 2000)
            if (Math.random() < 0.0005) {
                const jackpotPool = db.getJackpot();
                if (jackpotPool > 0) {
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(jackpotPool, user);
                    db.resetJackpot();
                    message.channel.send(`🚨 **GLOBAL JACKPOT ALERT** 🚨\n🎉 <@${user}> BARUSAN JEBOL JACKPOT SEBESAR **Rp ${jackpotPool.toLocaleString('id-ID')}**! 🎉\n*Sultan mendadak!* 💸`);
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

            // Jackpot Check
            handleJackpot(amount, userId);

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

            // Jackpot Check
            handleJackpot(amount, userId);

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
                    m.reply(`✅ **BENAR!** Kamu menang Rp ${winAmount.toLocaleString('id-ID')}! 🎉`);
                } else {
                    m.reply(`❌ **SALAH!** Jawabannya adalah **${a}**. Kamu kehilangan Rp ${amount.toLocaleString('id-ID')}.`);
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    message.reply(`⏰ **WAKTU HABIS!** Jawabannya adalah **${a}**. Kamu kehilangan Rp ${amount.toLocaleString('id-ID')}.`);
                }
            });
        }

        // !bs / !bigslot (Gates of Mang Ujang)
        if (command === '!bs' || command === '!bigslot') {
            const isBuy = args[1]?.toLowerCase() === 'buy';
            const rawAmount = isBuy ? args[2] : args[1];

            if (!rawAmount) return message.reply(`❌ Format: \`!bs <bet>\` atau \`!bs buy <bet>\``);

            // Parse amount
            let amount = 0;
            const lowerAmount = rawAmount.toLowerCase();
            if (lowerAmount.endsWith('k')) amount = parseFloat(lowerAmount) * 1000;
            else if (lowerAmount.endsWith('m') || lowerAmount.endsWith('jt')) amount = parseFloat(lowerAmount) * 1000000;
            else amount = parseInt(rawAmount);

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');

            const cost = isBuy ? amount * 100 : amount;
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);

            if (!user || user.uang_jajan < cost) {
                return message.reply(`💸 **Uang gak cukup!** Butuh Rp ${cost.toLocaleString('id-ID')}${isBuy ? ' (Biaya Buy Spin 100x)' : ''}.`);
            }

            // Deduct cost
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(cost, userId);

            // Jackpot Check (Only for normal spins, or maybe buy too? Let's say both)
            handleJackpot(cost, userId);

            // Symbols
            const symbols = {
                low: ['🍌', '🍇', '🍉', '🍊', '🍎'],
                high: ['🍜', '🍗', '🍔', '🍰'],
                scatter: '🍭',
                multi: '💣'
            };

            // Payouts (Base Multipliers)
            const getPayout = (symbol, count) => {
                if (count < 8) return 0;
                if (symbols.low.includes(symbol)) {
                    if (count >= 12) return 10;
                    if (count >= 10) return 3;
                    return 1.5;
                }
                if (symbols.high.includes(symbol)) {
                    if (count >= 12) return 50;
                    if (count >= 10) return 10;
                    return 3;
                }
                return 0;
            };

            // Generate Grid 6x5
            const generateGrid = () => {
                const grid = [];
                for (let i = 0; i < 5; i++) {
                    const row = [];
                    for (let j = 0; j < 6; j++) {
                        const r = Math.random();
                        if (r < 0.02) row.push(symbols.scatter); // 2% Scatter
                        else if (r < 0.03) row.push(symbols.multi); // 1% Multiplier
                        else if (r < 0.45) row.push(symbols.high[Math.floor(Math.random() * symbols.high.length)]);
                        else row.push(symbols.low[Math.floor(Math.random() * symbols.low.length)]);
                    }
                    grid.push(row);
                }
                return grid;
            };

            // Force Scatters for Buy Feature
            let grid = generateGrid();
            if (isBuy) {
                // Ensure at least 4 scatters
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

            // Tumble Logic (Simplified for text response)
            // We will simulate the whole round and return the result
            let totalWin = 0;
            let totalMulti = 0;
            let log = [];
            let round = 1;

            // Check Scatters first
            let scatterCount = 0;
            for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) if (grid[r][c] === symbols.scatter) scatterCount++;

            if (scatterCount >= 4) {
                log.push(`✨ **FREE SPINS TRIGGERED!** (${scatterCount} Scatters)`);
                // Simulate Free Spins (e.g., 15 spins)
                // For brevity, we'll just give a massive multiplier boost or run a few simulated spins
                // Let's run 5 "High Potential" spins
                for (let i = 0; i < 5; i++) {
                    // ... Logic for free spins ...
                    // To keep it simple and not timeout, we'll just add a flat bonus based on bet
                    totalWin += amount * (Math.random() * 50 + 10); // 10x - 60x bonus per spin
                }
                log.push(`🎰 **Free Spins Result:** Massive Win!`);
            }

            // Standard Tumble (One round for now)
            const countSymbols = (g) => {
                const counts = {};
                for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
                    const s = g[r][c];
                    counts[s] = (counts[s] || 0) + 1;
                }
                return counts;
            };

            const counts = countSymbols(grid);
            let roundWin = 0;

            for (const [sym, count] of Object.entries(counts)) {
                if (sym === symbols.scatter || sym === symbols.multi) continue;
                const pay = getPayout(sym, count);
                if (pay > 0) {
                    const win = amount * pay;
                    roundWin += win;
                    log.push(`✅ ${sym} x${count} -> Rp ${win.toLocaleString('id-ID')}`);
                }
            }

            // Check Multipliers
            let roundMulti = 0;
            for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
                if (grid[r][c] === symbols.multi) {
                    const m = [2, 5, 10, 25, 50, 100, 500][Math.floor(Math.random() * 7)];
                    roundMulti += m;
                }
            }

            if (roundWin > 0) {
                if (roundMulti > 0) {
                    log.push(`💣 **Multiplier!** Total x${roundMulti}`);
                    totalWin += roundWin * roundMulti;
                } else {
                    totalWin += roundWin;
                }
            }

            // Final Payout
            if (totalWin > 0) {
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(totalWin, userId);
                const embed = `⚡ **GATES OF MANG UJANG** ⚡\n` +
                    `Bet: Rp ${amount.toLocaleString('id-ID')}\n\n` +
                    grid.map(row => row.join(' ')).join('\n') +
                    `\n\n${log.join('\n')}\n` +
                    `💰 **TOTAL WIN: Rp ${totalWin.toLocaleString('id-ID')}**`;
                message.reply(embed);
            } else {
                message.reply(`⚡ **GATES OF MANG UJANG** ⚡\n` +
                    `Bet: Rp ${amount.toLocaleString('id-ID')}\n\n` +
                    grid.map(row => row.join(' ')).join('\n') +
                    `\n\n📉 **Rungkad!** Coba lagi.`);
            }
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
                    return message.reply(`�️ **Sukses!** Kamu membeli **${count}** tiket raffle seharga Rp ${(count * price).toLocaleString('id-ID')}.`);
                } else {
                    return message.reply(`❌ **Gagal:** ${res.error}`);
                }
            }

            if (sub === 'info') {
                const data = db.getRaffleData();
                const userTickets = db.prepare("SELECT ticket_count FROM raffle_participants WHERE user_id = ?").get(userId)?.ticket_count || 0;

                return message.reply(`🎟️ **RAFFLE INFO** 🎟️\n💰 **Total Pot:** Rp ${data.pot.toLocaleString('id-ID')}\n🎫 **Total Tiket:** ${data.totalTickets}\n👤 **Tiket Kamu:** ${userTickets}\n\n*Beli tiket dengan \`!raffle buy <jumlah>\` (Rp 5.000/tiket)*`);
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

                    return message.channel.send(`🎉 **RAFFLE DRAW** 🎉\nSelamat kepada <@${winnerId}> yang memenangkan POT sebesar **Rp ${data.pot.toLocaleString('id-ID')}**! 🥳💸`);
                } else {
                    return message.reply('❌ Terjadi kesalahan saat mengundi.');
                }
            }

            return message.reply('❌ Command: `!raffle buy <n>`, `!raffle info`, `!raffle draw`');
        }
    }
};
