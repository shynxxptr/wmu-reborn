const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');
const gameHandler = require('../handlers/gameHandler.js');
const gamblingHandler = require('../handlers/gamblingHandler.js');
const coinHandler = require('../handlers/coinHandler.js');

// KONFIGURASI JOB
const JOBS = {
    '!bantujualan': {
        min: 5000,
        max: 10000,
        reply: [
            "Kamu bantu Mang Ujang jualan bakwan. Laris manis!",
            "Kamu teriak 'Tahu Bulat Digoreng Dadakan' keliling sekolah.",
            "Kamu bantu cuci piring di kantin. Bersih kinclong!"
        ]
    },
    '!nyapulapangan': {
        min: 3000,
        max: 7000,
        reply: [
            "Kamu nyapu lapangan upacara sampai bersih.",
            "Kamu bersihin daun kering di taman sekolah.",
            "Kamu ngepel koridor sekolah yang becek."
        ]
    },
    '!pungutsampah': {
        min: 2000,
        max: 5000,
        reply: [
            "Kamu mungut sampah plastik di kantin. Go Green!",
            "Kamu bersihin kolong meja kelas dari sampah bekas jajan.",
            "Kamu misahin sampah organik dan anorganik. Rajin!"
        ]
    }
};

const MAX_JOBS_PER_HOUR = 5;
const COOLDOWN_TIME = 60 * 60 * 1000; // 1 Jam dalam ms

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const client = message.client;
        const content = message.content.toLowerCase().trim();
        const userId = message.author.id;

        // --- 0. CEK PENJARA ---
        const jail = db.isJailed(userId);
        if (jail) {
            return message.reply(`🔒 **KAMU DIPENJARA!**\nAlasan: ${jail.reason}\nBebas dalam: <t:${Math.ceil(jail.release_time / 1000)}:R>.\n\n*Jangan nakal lagi ya!*`);
        }

        // 1. CEK DOMPET
        if (content === '!cekdompet') {
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            const saldo = user ? user.uang_jajan : 0;
            return message.reply(`💰 **Dompet ${message.author.username}:**\nRp ${saldo.toLocaleString('id-ID')}`);
        }

        // 2. CEK APAKAH INI COMMAND JOB
        if (JOBS[content]) {
            const job = JOBS[content];
            const now = Date.now();

            // Ambil Data User
            let user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);

            // Jika user belum ada, buat baru
            if (!user) {
                db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(userId);
                user = { user_id: userId, uang_jajan: 0, last_work_count: 0, last_work_time: 0 };
            }

            // LOGIKA COOLDOWN
            // Jika sudah lewat 1 jam dari pekerjaan pertama di sesi ini, reset
            if (now - user.last_work_time > COOLDOWN_TIME) {
                db.prepare('UPDATE user_economy SET last_work_count = 0, last_work_time = ? WHERE user_id = ?').run(now, userId);
                user.last_work_count = 0;
                user.last_work_time = now;
            }

            // Cek Limit
            if (user.last_work_count >= MAX_JOBS_PER_HOUR) {
                const resetTime = user.last_work_time + COOLDOWN_TIME;
                return message.reply(`🛑 **Capek bang!** Istirahat dulu.\nKamu cuma bisa kerja ${MAX_JOBS_PER_HOUR}x per jam.\nCoba lagi <t:${Math.ceil(resetTime / 1000)}:R>.`);
            }

            // CEK STATUS FISIK (Lapar/Haus/Stress)
            const hunger = user.hunger || 0;
            const thirst = user.thirst || 0;
            const stress = user.stress || 0;

            if (hunger >= 80 || thirst >= 80 || stress >= 80) {
                return message.reply(`⚠️ **Kondisi Fisik Buruk!**\nLapar: ${hunger}%\nHaus: ${thirst}%\nStress: ${stress}%\n\nKamu terlalu lelah/stress untuk bekerja. Makan, minum, atau ngerokok dulu sana!`);
            }

            // HITUNG GAJI (Random)
            const gaji = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
            const text = job.reply[Math.floor(Math.random() * job.reply.length)];

            // UPDATE DB (Gaji + Stats Increase)
            // Work increases: Hunger +10, Thirst +15, Stress +5
            db.prepare(`
                UPDATE user_economy SET 
                uang_jajan = uang_jajan + ?, 
                last_work_count = last_work_count + 1,
                hunger = MIN(100, hunger + 10),
                thirst = MIN(100, thirst + 15),
                stress = MIN(100, stress + 5)
                WHERE user_id = ?
            `).run(gaji, userId);

            return message.reply(`✅ **${text}**\nUpah: +Rp ${gaji.toLocaleString('id-ID')}\nSisa Tenaga: ${MAX_JOBS_PER_HOUR - (user.last_work_count + 1)}/${MAX_JOBS_PER_HOUR} kali lagi jam ini.\n\n*Efek Kerja: Lapar +10, Haus +15, Stress +5*`);
        }

        // --- 3. SOCIAL ECONOMY ---

        // !beri <@user> <amount>
        if (content.startsWith('!beri ')) {
            const args = content.split(' ');
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[2]);

            if (!targetUser || isNaN(amount) || amount <= 0) {
                return message.reply('❌ Format salah! Gunakan: `!beri @user <jumlah>`');
            }
            if (targetUser.id === userId) return message.reply('❌ Gak bisa kirim ke diri sendiri.');
            if (targetUser.bot) return message.reply('❌ Bot tidak butuh uang.');

            const sender = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            if (!sender || sender.uang_jajan < amount) {
                return message.reply('💸 **Uang tidak cukup!** Kerja dulu sana.');
            }

            // Confirmation Embed
            const confirmEmbed = new EmbedBuilder()
                .setTitle('💸 Konfirmasi Transfer')
                .setDescription(`Kamu yakin mau kirim **Rp ${amount.toLocaleString('id-ID')}** ke ${targetUser}?`)
                .setColor('#ffff00');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_transfer')
                        .setLabel('YA, Kirim!')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancel_transfer')
                        .setLabel('Batal')
                        .setStyle(ButtonStyle.Danger)
                );

            const reply = await message.reply({ embeds: [confirmEmbed], components: [row] });

            const filter = i => i.user.id === userId;
            const collector = reply.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async i => {
                if (i.customId === 'confirm_transfer') {
                    // Re-check balance just in case
                    const currentSender = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
                    if (!currentSender || currentSender.uang_jajan < amount) {
                        return i.update({ content: '❌ Uang sudah tidak cukup!', embeds: [], components: [] });
                    }

                    // Execute Transfer
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(amount, userId);

                    const receiver = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(targetUser.id);
                    if (!receiver) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(targetUser.id);
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, targetUser.id);

                    await i.update({ content: `✅ **Transfer Berhasil!**\nKamu mengirim Rp ${amount.toLocaleString('id-ID')} ke ${targetUser}.`, embeds: [], components: [] });
                } else {
                    await i.update({ content: '❌ **Transfer Dibatalkan.**', embeds: [], components: [] });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    reply.edit({ content: '⏱️ **Waktu Habis!** Transfer dibatalkan.', embeds: [], components: [] });
                }
            });
            return;
        }

        // !daily
        if (content === '!daily') {
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000; // 24 Hours
            const lastDaily = db.getCooldown(userId, 'daily');

            if (lastDaily && (now - lastDaily) < cooldown) {
                const remaining = cooldown - (now - lastDaily);
                const hours = Math.floor(remaining / (60 * 60 * 1000));
                const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                return message.reply(`⏳ **Sabar!** Kamu bisa ambil daily lagi dalam ${hours} jam ${minutes} menit.`);
            }

            let reward = 5000; // Base Reward
            let bonusMsg = '';

            // Check Khodam Effect
            const khodamHandler = require('../handlers/khodamHandler.js');
            const khodam = khodamHandler.getKhodamEffect(userId);
            if (khodam) {
                const parts = khodam.effect.split('_');
                if (parts[0] === 'daily' || khodam.effect === 'all_20') {
                    const val = (khodam.effect === 'all_20') ? 20 : parseInt(parts[1]);
                    const bonus = Math.floor(reward * (val / 100));
                    reward += bonus;
                    bonusMsg = `\n👻 **Khodam Bonus:** +Rp ${bonus.toLocaleString('id-ID')} (${khodam.name})`;
                }
            }

            db.addSaldo(userId, reward);
            db.setCooldown(userId, 'daily', now);
            return message.reply(`💰 **DAILY REWARD**\nKamu menerima **Rp ${reward.toLocaleString('id-ID')}**!${bonusMsg}`);
        }

        // !minta (Beg)
        if (content === '!minta' || content === '!beg') {
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            const now = Date.now();

            if (!client.begCooldowns) client.begCooldowns = new Map();

            const lastBeg = client.begCooldowns.get(userId) || 0;
            const cooldown = 5 * 60 * 1000; // 5 Menit (Updated from 2 hours for better gameplay loop)

            if (now - lastBeg < cooldown) {
                const remaining = Math.ceil((cooldown - (now - lastBeg)) / 1000);
                return message.reply(`⏳ **Jangan ngemis terus!** Tunggu ${remaining} detik lagi.`);
            }

            // RNG Success
            const success = Math.random() > 0.3; // 70% Success
            if (success) {
                let amount = Math.floor(Math.random() * 1500) + 500; // 500 - 2000
                let bonusMsg = '';

                // Check Khodam Effect
                const khodamHandler = require('../handlers/khodamHandler.js');
                const khodam = khodamHandler.getKhodamEffect(userId);
                if (khodam) {
                    const parts = khodam.effect.split('_');
                    if (parts[0] === 'daily' || khodam.effect === 'all_20') {
                        const val = (khodam.effect === 'all_20') ? 20 : parseInt(parts[1]);
                        const bonus = Math.floor(amount * (val / 100));
                        amount += bonus;
                        bonusMsg = ` (+Rp ${bonus} dari Khodam)`;
                    }
                }

                if (!user) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(userId);
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, userId);
                client.begCooldowns.set(userId, now);
                return message.reply(`🥺 **Dikasih kasihan...**\nKamu dapet Rp ${amount.toLocaleString('id-ID')}${bonusMsg}.`);
            } else {
                client.begCooldowns.set(userId, now);
                const fails = [
                    "Pergi sana! Kerja woy!",
                    "Maaf, gak ada receh.",
                    "Dih, bau. Mandi dulu sana."
                ];
                return message.reply(`❌ **${fails[Math.floor(Math.random() * fails.length)]}**`);
            }
        }

        // --- 4. GAMBLING ---

        // --- 4. GAMBLING ---
        if (content.startsWith('!coinflip') || content.startsWith('!cf') || content.startsWith('!slots') || content.startsWith('!doaujang') || content.startsWith('!raffle') || content.startsWith('!bs') || content.startsWith('!bigslot') || content.startsWith('!math') || content.startsWith('!duelslot') || content.startsWith('!accept')) {
            const args = content.split(' ');
            const command = args[0];
            await gamblingHandler.handleGambling(message, command, args);
        }

        // --- 5. UNO GAME ---
        if (content.startsWith('!uno')) {
            const unoHandler = require('../handlers/unoHandler.js');
            const args = content.split(' ');
            const command = args[0];
            await unoHandler.handleUno(message, command, args);
        }

        // --- 6. MINESWEEPER ---
        if (content.startsWith('!bom') || content.startsWith('!mines')) {
            const minesHandler = require('../handlers/minesweeperHandler.js');
            const args = content.split(' ');
            const command = args[0];
            await minesHandler.handleMines(message, command, args);
        }

        // --- 7. CRASH (SAHAM) ---
        if (content.startsWith('!saham') || content.startsWith('!crash')) {
            const crashHandler = require('../handlers/crashHandler.js');
            const args = content.split(' ');
            const command = args[0];
            await crashHandler.handleCrash(message, command, args);
        }

        // --- 8. BLACKJACK ---
        if (content.startsWith('!bj') || content.startsWith('!blackjack')) {
            const bjHandler = require('../handlers/blackjackHandler.js');
            const args = content.split(' ');
            const command = args[0];
            await bjHandler.handleBlackjack(message, command, args);
        }

        // --- 9. COIN UJANG & SHOP ---
        if (content.startsWith('!coin') || content.startsWith('!tukar') || content.startsWith('!shoprole') || content.startsWith('!belirole')) {
            const args = content.split(' ');
            const command = args[0];
            await coinHandler.handleCoin(message, command, args);
        }

        // !palak <@user> <amount>
        if (content.startsWith('!palak ')) {
            const args = content.split(' ');
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[2]);

            if (!targetUser || isNaN(amount) || amount <= 0) {
                return message.reply('❌ Format: `!palak @user <jumlah>`');
            }
            if (targetUser.id === userId) return message.reply('❌ Gak bisa malak diri sendiri.');
            if (targetUser.bot) return message.reply('❌ Jangan malak bot, kualat.');

            // 1. CEK ONLINE STATUS
            const member = message.guild.members.cache.get(targetUser.id);
            if (!member || !member.presence || member.presence.status === 'offline') {
                return message.reply('❌ Target sedang **OFFLINE**. Syarat malak: Target harus online!');
            }

            // 2. CEK UANG KEDUANYA
            const challengerData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            const targetData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(targetUser.id);

            if (!challengerData || challengerData.uang_jajan < amount) {
                return message.reply('💸 **Uangmu kurang!** Kalau kalah mau bayar pake apa?');
            }
            if (!targetData || targetData.uang_jajan < amount) {
                return message.reply('💸 **Target miskin!** Gak punya uang segitu.');
            }

            // 3. START DUEL REQUEST
            await gameHandler.handlePalakRequest(message, targetUser, amount);
        }

        // --- 5. ADMIN COMMANDS ---

        // !tambahsaldo @user <amount>
        if (content.startsWith('!tambahsaldo ')) {
            // Cek Permission Admin
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ **Akses Ditolak!** Kamu bukan Admin.');
            }

            const args = content.split(' ');
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[2]);

            if (!targetUser || isNaN(amount)) {
                return message.reply('❌ Format: `!tambahsaldo @user <jumlah>`');
            }

            // Update DB
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(targetUser.id);
            if (!user) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(targetUser.id);

            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, targetUser.id);

            return message.reply(`✅ **Berhasil!**\nSaldo ${targetUser} ditambah **Rp ${amount.toLocaleString('id-ID')}**.`);
        }

        // !setmoney @user <amount>
        if (content.startsWith('!setmoney ')) {
            // Cek Permission Admin
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ **Akses Ditolak!** Kamu bukan Admin.');
            }

            const args = content.split(' ');
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[2]);

            if (!targetUser || isNaN(amount)) {
                return message.reply('❌ Format: `!setmoney @user <jumlah>`');
            }

            // Update DB
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(targetUser.id);
            if (!user) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(targetUser.id);

            db.prepare('UPDATE user_economy SET uang_jajan = ? WHERE user_id = ?').run(amount, targetUser.id);

            return message.reply(`✅ **Berhasil!**\nSaldo ${targetUser} di-set menjadi **Rp ${amount.toLocaleString('id-ID')}**.`);
        }

        // !resetmoney confirm
        if (content.startsWith('!resetmoney')) {
            // Cek Permission Admin
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ **Akses Ditolak!** Kamu bukan Admin.');
            }

            const args = content.split(' ');
            const confirm = args[1];

            if (confirm !== 'confirm') {
                return message.reply('⚠️ **PERINGATAN KERAS!**\nCommand ini akan **MENGHAPUS SEMUA UANG** (Uang Jajan & Coin Ujang) dari seluruh user di database.\n\nKetik `!resetmoney confirm` jika kamu yakin 100%.');
            }

            // Execute Reset
            db.prepare('UPDATE user_economy SET uang_jajan = 0, coin_ujang = 0').run();
            return message.reply('✅ **RESET BERHASIL!**\nSemua uang user telah di-reset menjadi 0. Miskin berjamaah dimulai!');
        }

        // --- 6. LEADERBOARD ---
        if (content.startsWith('!leaderboard') || content.startsWith('!lb') || content.startsWith('!top')) {
            const leaderboardHandler = require('../handlers/leaderboardHandler.js');
            await leaderboardHandler.showLeaderboard(message, db);
            return;
        }

        // --- 7. HEIST ---
        if (content === '!heist') {
            const heistHandler = require('../handlers/heistHandler.js');
            await heistHandler.startHeist(message);
            return;
        }

        // --- 8. HELP COMMAND ---
        if (content === '!kantin help' || content === '!kantinhelp' || content === '!help') {
            const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

            const pages = [
                // PAGE 1: KANTIN & EKONOMI
                new EmbedBuilder()
                    .setTitle('📚 KANTIN SEKOLAH - MENU UTAMA (1/3)')
                    .setColor('#00AAFF')
                    .setDescription('Selamat datang di Warung Mang Ujang! Berikut panduan lengkapnya:')
                    .addFields(
                        {
                            name: '🏪 KANTIN & WARUNG',
                            value:
                                '`/kantin` - Buka menu makanan & minuman.\n' +
                                '`/warung` - Warung Rahasia (Rokok & Alkohol).\n' +
                                '`/makan` - Konsumsi item dari tas.'
                        },
                        {
                            name: '💰 CARI UANG',
                            value:
                                '`!cekdompet` - Cek saldo.\n' +
                                '`!bantujualan` - Kerja santai (Rp 5k-10k).\n' +
                                '`!nyapulapangan` - Kerja sedang (Rp 3k-7k).\n' +
                                '`!pungutsampah` - Kerja ringan (Rp 2k-5k).'
                        },
                        {
                            name: '🤝 SOSIAL',
                            value:
                                '`!beri @user <jumlah>` - Transfer uang.\n' +
                                '`!minta` - Ngemis (Hoki-hokian).\n' +
                                '`!palak @user <jumlah>` - Duel Batu Gunting Kertas.'
                        }
                    )
                    .setFooter({ text: 'Halaman 1 dari 3 • Klik tombol di bawah untuk ganti halaman.' }),

                // PAGE 2: GAMBLING & MINIGAMES
                new EmbedBuilder()
                    .setTitle('🎰 GAME & JUDI (2/3)')
                    .setColor('#FFA500')
                    .setDescription('Mau kaya mendadak atau miskin mendadak? Di sini tempatnya!')
                    .addFields(
                        {
                            name: '🎲 CLASSIC',
                            value:
                                '`!cf <bet> <h/t>` - Coinflip (x2).\n' +
                                '`!slots <bet>` - Slot Machine (x2 / x5).\n' +
                                '`!math <bet>` - Judi Matematika (Brain Rot).'
                        },
                        {
                            name: '🔥 HIGH STAKES',
                            value:
                                '`!bs <bet>` - Gates of Mang Ujang (Slot 6x5).\n' +
                                '`!bom <bet>` - Tebak Bom / Minesweeper.\n' +
                                '`!saham <bet>` - Saham Gorengan (Crash).'
                        },
                        {
                            name: '⚔️ PVP & MULTIPLAYER',
                            value:
                                '`!duelslot @user <bet>` - Duel Slot 1vs1.\n' +
                                '`!uno create <prize>` - Bikin Room UNO Berduit.\n' +
                                '`!raffle buy <n>` - Beli tiket undian server.\n' +
                                '`!heist` - Ajak temen rampok bank (Minigame).'
                        },
                        {
                            name: '🏆 LEADERBOARD',
                            value:
                                '`!leaderboard` - Cek Top 100 Sultan.\n' +
                                '`!lb` / `!top` - Alias untuk leaderboard.'
                        }
                    )
                    .setFooter({ text: 'Halaman 2 dari 3 • Gunakan "all" untuk all-in (Contoh: !cf all h).' }),

                // PAGE 3: COIN UJANG & LAINNYA
                new EmbedBuilder()
                    .setTitle('💎 COIN UJANG & FITUR LAIN (3/3)')
                    .setColor('#A020F0')
                    .setDescription('Mata uang premium untuk sultan.')
                    .addFields(
                        {
                            name: '🪙 COIN UJANG',
                            value:
                                '`!tukar <jumlah>` - Tukar Saldo ke Coin (1 Coin = 10jt).\n' +
                                '`!coin` - Cek saldo Coin Ujang.\n' +
                                '`!shoprole` - Beli Custom Role pakai Coin.'
                        },
                        {
                            name: '📊 STATUS KARAKTER',
                            value:
                                '`/cekstatus` - Cek Lapar, Haus, Stress.\n' +
                                '*Tips: Jangan sampai stat 100% atau gak bisa kerja!*'
                        },
                        {
                            name: '👮 ADMIN',
                            value: '`!tambahsaldo @user <jumlah>` - Cheat money (Admin Only).'
                        }
                    )
                    .setFooter({ text: 'Halaman 3 dari 3 • Bot by Antigravity' })
            ];

            const getRow = (pageIndex) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_prev')
                        .setLabel('⬅️ Sebelumnya')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId('help_next')
                        .setLabel('Selanjutnya ➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pageIndex === pages.length - 1)
                );
            };

            const msg = await message.reply({ embeds: [pages[0]], components: [getRow(0)] });

            // Collector
            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
            let currentPage = 0;

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: '❌ Bikin menu sendiri dong!', flags: [MessageFlags.Ephemeral] });
                }

                if (i.customId === 'help_prev') currentPage--;
                else if (i.customId === 'help_next') currentPage++;

                await i.update({ embeds: [pages[currentPage]], components: [getRow(currentPage)] });
            });

            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('help_prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('help_next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );
                msg.edit({ components: [disabledRow] }).catch(() => { });
            });
            return;
        }
    },
};
