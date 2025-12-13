const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');
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
    },
    '!ngerjainpr': {
        min: 10000,
        max: 25000,
        reply: [
            "Kamu jokiin PR Matematika si Budi. Otak ngebul tapi dompet tebal!",
            "Kamu ngerjain tugas Sejarah satu kelas. Guru curiga tapi aman.",
            "Kamu buatin makalah PPKn buat kakak kelas. Easy money!"
        ]
    },
    '!parkir': {
        min: 2000,
        max: 50000,
        reply: [
            "Priiit! Mundur... mundur... Yak sip! (Dikasih receh 2000 perak).",
            "Jagain motor guru, dikasih tips lumayan.",
            "Hoki! Ada alumni bawa mobil sport, dikasih tips gede!"
        ]
    },
    '!jualanpulsa': {
        min: 5000,
        max: 15000,
        reply: [
            "Ada yang beli pulsa 10k. Untung dikit yang penting lancar.",
            "Jualan kuota data laris manis hari ini.",
            "Token listrik tetangga habis, kamu yang talangin dulu."
        ]
    },
    '!jagawarnet': {
        min: 15000,
        max: 30000,
        reply: [
            "Bocah toxic teriak-teriak main PB. Pusing kepala!",
            "Ada yang lupa logout billing, lumayan sisa waktunya.",
            "Shift malam di warnet. Mata sepet tapi dompet tebal."
        ],
        stress_add: 15
    },
    '!mulung': {
        min: 3000,
        max: 8000,
        reply: [
            "Nemu botol plastik bekas.",
            "Kardus bekas lumayan buat dijual.",
            "Dapet kaleng bekas minuman."
        ],
        has_drop: true
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

        // --- 0. ADMIN TESTALL ---
        if (content === '!testall') {
            const isAdmin = db.prepare('SELECT * FROM bot_admins WHERE user_id = ?').get(userId);
            if (!isAdmin) return message.reply('❌ **Admin only!**');

            const testEmbed = new EmbedBuilder()
                .setTitle('🧪 AUTO COMMAND TESTER')
                .setDescription('Initializing...')
                .setColor('#FFA500');
            const testMsg = await message.reply({ embeds: [testEmbed] });

            const results = { working: [], broken: [] };
            let tested = 0;
            const total = 35;

            const test = async (cmd, desc) => {
                tested++;
                try {
                    const checks = {
                        '!bantujualan': () => JOBS['!bantujualan'],
                        '!nyapulapangan': () => JOBS['!nyapulapangan'],
                        '!pungutsampah': () => JOBS['!pungutsampah'],
                        '!ngerjainpr': () => JOBS['!ngerjainpr'],
                        '!parkir': () => JOBS['!parkir'],
                        '!jualanpulsa': () => JOBS['!jualanpulsa'],
                        '!saldo': () => db.getBalance(userId),
                        '!ngemis': () => true,
                        '!palak': () => gameHandler,
                        '!rps': () => gameHandler,
                        '!doaujang': () => gamblingHandler,
                        '!cf': () => gamblingHandler,
                        '!slots': () => gamblingHandler,
                        '!bs': () => gamblingHandler,
                        '!math': () => gamblingHandler,
                        '!crash': () => require('../handlers/crashHandler.js'),
                        '!mine': () => require('../handlers/minesweeperHandler.js'),
                        '!bj': () => require('../handlers/blackjackHandler.js'),
                        '!uno': () => require('../handlers/unoHandler.js'),
                        '!tawuran': () => require('../handlers/tawuranHandler.js'),
                        '!khodam': () => require('../handlers/khodamHandler.js'),
                        '!beri': () => true,
                        '!lb': () => require('../handlers/leaderboardHandler.js'),
                        '!eskul': () => require('../handlers/eskulHandler.js'),
                        '!mission': () => require('../handlers/missionHandler.js'),
                        '!pasar': () => require('../handlers/blackMarketHandler.js'),
                        '!event': () => require('../handlers/eventHandler.js'),
                        '/cekstatus': () => client.commands.get('cekstatus'),
                        '/kantin': () => client.commands.get('kantin'),
                        '/warung': () => client.commands.get('warung'),
                        '/makan': () => client.commands.get('makan'),
                        '/merokok': () => client.commands.get('merokok'),
                        '/mabok': () => client.commands.get('mabok'),
                        '/leaderboard': () => client.commands.get('leaderboard'),
                        '/mission': () => client.commands.get('mission'),
                        '/patchnote': () => client.commands.get('patchnote')
                    };
                    if (checks[cmd]) {
                        checks[cmd]();
                        results.working.push(`${cmd} - ${desc}`);
                    } else {
                        results.broken.push(`${cmd} - Not found`);
                    }
                } catch (e) {
                    results.broken.push(`${cmd} - ${e.message}`);
                }

                // Update embed after each test
                const progressEmbed = new EmbedBuilder()
                    .setTitle('🧪 AUTO COMMAND TESTER')
                    .setDescription(`Testing: **${cmd}** (${desc})\n\nProgress: ${tested}/${total}`)
                    .setColor('#FFA500');

                if (results.working.length > 0) {
                    const displayWorking = results.working.slice(-10).map(r => `✅ ${r}`).join('\n');
                    progressEmbed.addFields({ name: `Working (${results.working.length})`, value: displayWorking });
                }
                if (results.broken.length > 0) {
                    const displayBroken = results.broken.slice(-5).map(r => `❌ ${r}`).join('\n');
                    progressEmbed.addFields({ name: `Broken (${results.broken.length})`, value: displayBroken });
                }

                await testMsg.edit({ embeds: [progressEmbed] });
                await new Promise(resolve => setTimeout(resolve, 300)); // Delay for visibility
            };

            await test('!bantujualan', 'Work');
            await test('!nyapulapangan', 'Work');
            await test('!pungutsampah', 'Work');
            await test('!ngerjainpr', 'Work');
            await test('!parkir', 'Work');
            await test('!jualanpulsa', 'Work');
            await test('!saldo', 'Economy');
            await test('!ngemis', 'Social');
            await test('!beri', 'Transfer');
            await test('!palak', 'Game');
            await test('!rps', 'Game');
            await test('!doaujang', 'Gambling');
            await test('!cf', 'Gambling');
            await test('!slots', 'Gambling');
            await test('!bs', 'Gambling');
            await test('!math', 'Gambling');
            await test('!crash', 'Gambling');
            await test('!mine', 'Gambling');
            await test('!bj', 'Gambling');
            await test('!uno', 'Game');
            await test('!tawuran', 'Game');
            await test('!khodam', 'Fun');
            await test('!lb', 'Social');
            await test('!eskul', 'School');
            await test('!mission', 'Missions');
            await test('!pasar', 'Black Market');
            await test('!event', 'Events');
            await test('/cekstatus', 'Status');
            await test('/kantin', 'Shop');
            await test('/warung', 'Shop');
            await test('/makan', 'Action');
            await test('/merokok', 'Action');
            await test('/mabok', 'Action');
            await test('/leaderboard', 'Social');
            await test('/mission', 'Missions');
            await test('/patchnote', 'Info');

            const report = new EmbedBuilder()
                .setTitle('🧪 COMMAND TEST COMPLETE')
                .setDescription(`✅ **${results.working.length}** Working\n❌ **${results.broken.length}** Broken`)
                .setColor(results.broken.length === 0 ? '#00FF00' : '#FFA500')
                .setTimestamp()
                .setFooter({ text: `Total: ${results.working.length + results.broken.length} commands tested` });

            if (results.working.length > 0) {
                report.addFields({ name: `✅ All Working Commands`, value: results.working.map(r => `• ${r}`).join('\n').substring(0, 1024) });
            }
            if (results.broken.length > 0) {
                report.addFields({ name: `❌ Broken Commands`, value: results.broken.map(r => `• ${r}`).join('\n').substring(0, 1024) });
            }

            await testMsg.edit({ embeds: [report] });
            return;
        }

        // --- 0. CEK PENJARA ---
        // --- 0. CEK PENJARA ---
        const jail = db.isJailed(userId);
        if (jail && content.startsWith('!')) {
            return message.reply(`🔒 **KAMU DIPENJARA!**\nAlasan: ${jail.reason}\nBebas dalam: <t:${Math.ceil(jail.release_time / 1000)}:R>.\n\n*Jangan nakal lagi ya!*`);
        }

        // 1. CEK DOMPET
        if (content === '!cekdompet') {
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            const saldo = user ? user.uang_jajan : 0;
            return message.reply(`💰 **Dompet ${message.author.username}:**\nRp ${formatMoney(saldo)}`);
        }

        // 1.5 CEK GLOBAL JACKPOT
        if (content === '!jackpot') {
            const jackpotPool = db.getJackpot();
            const embed = new EmbedBuilder()
                .setTitle('🎰 GLOBAL JACKPOT POOL')
                .setDescription(`**Rp ${formatMoney(jackpotPool)}**`)
                .setColor('#FFD700')
                .addFields(
                    { name: '💡 Info', value: '• 2% dari setiap bet masuk ke pool\n• Chance menang: 0.0001% (1 in 1,000,000)\n• Auto masuk ke dompet utama kalau menang!' }
                )
                .setFooter({ text: 'Semoga hokimu datang! 🍀' })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
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

            // CEK ESKUL BUFF
            const userEskul = db.getEskul(userId);
            let limitBonus = 0;
            let hungerRed = 10;
            let thirstRed = 15;
            let stressRed = (job.stress_add || 5);

            if (userEskul && userEskul.eskul_name === 'futsal') limitBonus = 5;
            if (userEskul && userEskul.eskul_name === 'pramuka') { hungerRed = 5; thirstRed = 7; } // 50% Reduction
            if (userEskul && userEskul.eskul_name === 'pmr') stressRed = Math.ceil(stressRed / 2); // 50% Reduction

            // Cek Limit (Updated with Bonus)
            const maxJobs = MAX_JOBS_PER_HOUR + limitBonus;
            if (user.last_work_count >= maxJobs) {
                const resetTime = user.last_work_time + COOLDOWN_TIME;
                return message.reply(`🛑 **Capek bang!** Istirahat dulu.\nKamu cuma bisa kerja ${maxJobs}x per jam (Buff Eskul: +${limitBonus}).\nCoba lagi <t:${Math.ceil(resetTime / 1000)}:R>.`);
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

            // LOGIKA DROP ITEM (Mulung)
            let dropMsg = '';
            if (job.has_drop) {
                const chance = Math.random();
                let itemDrop = null;
                let itemName = '';

                if (chance < 0.1) { // 10% Rare
                    itemDrop = 'pod_bekas';
                    itemName = 'Pod Bekas';
                } else if (chance < 0.3) { // 20% Uncommon
                    itemDrop = 'roti_bakar';
                    itemName = 'Roti Bakar Sisa';
                } else if (chance < 0.6) { // 30% Common
                    itemDrop = 'korek_gas';
                    itemName = 'Korek Gas Bekas';
                }

                if (itemDrop) {
                    const cekInv = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(userId, itemDrop);
                    if (cekInv) {
                        db.prepare('UPDATE inventaris SET jumlah = jumlah + 1 WHERE user_id = ? AND jenis_tiket = ?').run(userId, itemDrop);
                    } else {
                        db.prepare('INSERT INTO inventaris (user_id, jenis_tiket, jumlah) VALUES (?, ?, 1)').run(userId, itemDrop);
                    }
                    dropMsg = `\n🎁 **Nemu Barang:** Kamu menemukan **${itemName}**!`;
                }
            }

            // UPDATE DB (Gaji + Stats Increase)
            db.prepare(`
                UPDATE user_economy SET 
                uang_jajan = uang_jajan + ?, 
                last_work_count = last_work_count + 1,
                hunger = MIN(100, hunger + ?),
                thirst = MIN(100, thirst + ?),
                stress = MIN(100, stress + ?)
                WHERE user_id = ?
            `).run(gaji, hungerRed, thirstRed, stressRed, userId);
            
            // Track Mission - Do Work
            const missionHandler = require('../handlers/missionHandler.js');
            missionHandler.trackMission(userId, 'do_work');

            return message.reply(`✅ **${text}**\nUpah: +Rp ${formatMoney(gaji)}${dropMsg}\nSisa Tenaga: ${maxJobs - (user.last_work_count + 1)}/${maxJobs} kali lagi jam ini.\n\n*Efek Kerja: Lapar +${hungerRed}, Haus +${thirstRed}, Stress +${stressRed}*`);
        }

        // --- 2.5 FITUR NAKAL (DELINQUENT) ---

        // !bolos (Bolos Sekolah)
        if (content === '!bolos') {
            const chance = Math.random();
            // 30% Chance Caught
            if (chance < 0.3) {
                const jailTime = 10 * 60 * 1000; // 10 Menit
                db.jailUser(userId, jailTime, 'Bolos Sekolah (Ketahuan Guru BK)');
                return message.reply('🚨 **WEEET! MAU KEMANA KAMU?!**\n\n*Guru BK menangkapmu saat mau loncat pagar.*\n**HUKUMAN:** Masuk Penjara (Detention) selama 10 menit!');
            } else {
                // Success: Stress -50
                db.prepare('UPDATE user_economy SET stress = MAX(0, stress - 50) WHERE user_id = ?').run(userId);
                return message.reply('🏃 **Berhasil Kabur!**\n\n*Kamu nongkrong di warkop sambil ngerokok.*\nEfek: **Stress Berkurang Drastis (-50)**.');
            }
        }

        // !contek (Nyontek Ujian)
        if (content === '!contek') {
            const chance = Math.random();
            // 40% Chance Caught
            if (chance < 0.4) {
                const denda = 25000;
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ?, stress = MIN(100, stress + 20) WHERE user_id = ?').run(denda, userId);
                return message.reply(`📝 **KETAHUAN!**\n\n*Pengawas ujian merobek kertas jawabanmu.*\n**Sanksi:** Denda Rp ${formatMoney(denda)} & Stress +20.`);
            } else {
                // Success: Money 20k - 50k
                const reward = Math.floor(Math.random() * (50000 - 20000 + 1)) + 20000;
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(reward, userId);
                return message.reply(`✅ **Mulus...**\n\n*Kamu berhasil nyalin jawaban si pintar.*\n**Hasil:** Nilai Bagus (Dapat Beasiswa Rp ${formatMoney(reward)})!`);
            }
        }

        // !tawuran
        if (content === '!tawuran') {
            const tawuranHandler = require('../handlers/tawuranHandler.js');
            await tawuranHandler.startTawuran(message);
            return;
        }

        // !eskul
        if (content.startsWith('!eskul')) {
            const eskulHandler = require('../handlers/eskulHandler.js');
            await eskulHandler.handleEskul(message, content.split(' '));
            return;
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
                .setDescription(`Kamu yakin mau kirim **Rp ${formatMoney(amount)}** ke ${targetUser}?`)
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
                    const currentSender = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
                    if (!currentSender || currentSender.uang_jajan < amount) {
                        return i.update({ content: '❌ Uang sudah tidak cukup!', embeds: [], components: [] });
                    }

                    // --- LIMIT TRANSFER CHECK ---
                    const LIMIT_HARIAN = 100000000; // 100 Juta
                    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

                    // Reset limit if new day
                    if (currentSender.last_transfer_day !== today) {
                        db.prepare('UPDATE user_economy SET daily_transfer_total = 0, last_transfer_day = ? WHERE user_id = ?').run(today, userId);
                        currentSender.daily_transfer_total = 0;
                    }

                    if ((currentSender.daily_transfer_total + amount) > LIMIT_HARIAN) {
                        const sisaLimit = LIMIT_HARIAN - currentSender.daily_transfer_total;
                        return i.update({
                            content: `🚫 **Limit Transfer Harian Tercapai!**\nSisa limit kamu hari ini: Rp ${formatMoney(sisaLimit)}\nKamu mencoba kirim: Rp ${formatMoney(amount)}`,
                            embeds: [],
                            components: []
                        });
                    }

                    // Cek jika target adalah admin - admin tidak bisa menerima transfer
                    if (db.isAdmin(targetUser.id)) {
                        return i.update({ 
                            content: `❌ **Transfer Gagal!**\nAdmin tidak bisa menerima transfer dari user lain.`, 
                            embeds: [], 
                            components: [] 
                        });
                    }

                    // Execute Transfer
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ?, daily_transfer_total = daily_transfer_total + ? WHERE user_id = ?').run(amount, amount, userId);

                    // Add amount to receiver
                    const receiver = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(targetUser.id);
                    if (!receiver) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(targetUser.id);
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, targetUser.id);

                    const finalMessage = `✅ **Transfer Berhasil!**\nKamu mengirim Rp ${formatMoney(amount)} ke ${targetUser}.\n*Sisa limit hari ini: Rp ${formatMoney(LIMIT_HARIAN - (currentSender.daily_transfer_total + amount))}*`;

                    await i.update({ content: finalMessage, embeds: [], components: [] });
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

            // --- CEK TAGIHAN ESKUL (MINGGUAN) ---
            const eskulData = db.getEskul(userId);
            if (eskulData) {
                const oneWeek = 7 * 24 * 60 * 60 * 1000;
                const lastPay = eskulData.last_payment || eskulData.joined_at; // Fallback for old data

                if (now - lastPay >= oneWeek) {
                    const eskulHandler = require('../handlers/eskulHandler.js');
                    const eskulInfo = eskulHandler.ESKUL_LIST[eskulData.eskul_name];

                    if (eskulInfo) {
                        const userBal = db.getBalance(userId);
                        if (userBal >= eskulInfo.cost) {
                            // Auto Pay
                            db.updateBalance(userId, -eskulInfo.cost);
                            db.prepare('UPDATE user_eskul SET last_payment = ? WHERE user_id = ?').run(now, userId);
                            message.channel.send(`💸 **Tagihan Eskul Terbayar!**\nKamu membayar Rp ${formatMoney(eskulInfo.cost)} untuk perpanjang masa aktif **${eskulInfo.label}**.`);
                        } else {
                            // Kick
                            db.prepare('DELETE FROM user_eskul WHERE user_id = ?').run(userId);
                            message.channel.send(`⚠️ **GAGAL BAYAR ESKUL!**\nUangmu kurang untuk bayar tagihan mingguan **${eskulInfo.label}** (Rp ${formatMoney(eskulInfo.cost)}).\nKamu telah **dikeluarkan** dari ekskul. Join lagi kalau udah punya duit!`);
                        }
                    }
                }
            }

            if (lastDaily && (now - lastDaily) < cooldown) {
                const remaining = cooldown - (now - lastDaily);
                const hours = Math.floor(remaining / (60 * 60 * 1000));
                const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                return message.reply(`⏳ **Sabar!** Kamu bisa ambil daily lagi dalam ${hours} jam ${minutes} menit.`);
            }

            let reward = 15000; // Base Reward
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
                    bonusMsg = `\n👻 **Khodam Bonus:** +Rp ${formatMoney(bonus)} (${khodam.name})`;
                }
            }

            db.addSaldo(userId, reward);
            db.setCooldown(userId, 'daily', now);
            return message.reply(`💰 **DAILY REWARD**\nKamu menerima **Rp ${formatMoney(reward)}**!${bonusMsg}`);
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
                return message.reply(`🥺 **Dikasih kasihan...**\nKamu dapet Rp ${formatMoney(amount)}${bonusMsg}.`);
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

        // --- 9.5 BANKING SYSTEM (Money Sink) ---
        if (content.startsWith('!bank')) {
            const bankingHandler = require('../handlers/bankingHandler.js');
            const args = content.split(' ');
            const command = args[0];
            await bankingHandler.handleBanking(message, command, args);
        }

        // --- 9.5 BLACK MARKET ---
        if (content.startsWith('!bm')) {
            const blackMarketHandler = require('../handlers/blackMarketHandler.js');
            const args = content.split(' ');
            const command = args[0];
            await blackMarketHandler.handleBlackMarket(message, command, args);
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

            // 2. CEK COOLDOWN
            const lastPalak = db.getCooldown(userId, 'palak');
            const cooldown = 10 * 60 * 1000; // 10 Menit
            if (lastPalak && (Date.now() - lastPalak) < cooldown) {
                const remaining = Math.ceil((cooldown - (Date.now() - lastPalak)) / 60000);
                return message.reply(`⏳ **Sabar Preman!** Tunggu ${remaining} menit lagi sebelum malak lagi.`);
            }

            // 3. CEK UANG KEDUANYA
            const challengerData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            const targetData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(targetUser.id);

            if (!challengerData || challengerData.uang_jajan < amount) {
                return message.reply('💸 **Uangmu kurang!** Kalau kalah mau bayar pake apa?');
            }
            if (!targetData || targetData.uang_jajan < amount) {
                return message.reply('💸 **Target miskin!** Gak punya uang segitu.');
            }

            // 4. START DUEL REQUEST
            await gameHandler.handlePalakRequest(message, targetUser, amount);
            db.setCooldown(userId, 'palak'); // Set cooldown after request sent
        }

        // --- 5. ADMIN COMMANDS ---

        // !adminhelp - Show all admin commands
        if (content === '!adminhelp' || content === '!admin') {
            const isAdmin = db.isAdmin(userId);
            if (!isAdmin) {
                return message.reply('❌ **Admin only!** Command ini hanya untuk admin bot.');
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ **ADMIN COMMAND LIST**')
                .setDescription('Berikut adalah daftar lengkap command khusus Admin Bot:')
                .setColor('#FF0000')
                .addFields(
                    {
                        name: '👤 **User Management**',
                        value: '`!tambahsaldo @user <jumlah>` - Tambah saldo user\n' +
                               '`!setmoney @user <jumlah>` - Set saldo user (absolute)\n' +
                               '`!resetmoney confirm` - Reset semua saldo user ke 0\n' +
                               '`!blacklist @user` - Blacklist user dari leaderboard\n' +
                               '`!unblacklist @user` - Unblacklist user dari leaderboard\n' +
                               '`!setleaderboardrole <rank> <role_id>` - Set role untuk leaderboard'
                    },
                    {
                        name: '💬 **Bot Control**',
                        value: '`!say <pesan>` - Kirim pesan sebagai bot\n' +
                               '`!mangujang <pesan>` - Alias untuk !say'
                    },
                    {
                        name: '🧪 **Testing & Debug**',
                        value: '`!testall` - Test semua command bot'
                    },
                    {
                        name: '📋 **Slash Commands (Discord)**',
                        value: '`/add-admin` - Tambah admin baru\n' +
                               '`/remove-admin` - Hapus admin\n' +
                               '`/list-admins` - Lihat daftar admin\n' +
                               '`/admin-panel` - Panel admin (Role & Stok)\n' +
                               '`/set-luck` - Set luck penalty user\n' +
                               '`/config-penalty` - Atur batas auto-penalty\n' +
                               '`/give-ticket` - Kirim tiket ke user\n' +
                               '`/check-all` - Cek seluruh inventaris user\n' +
                               '`/create-flashsale` - Buat flash sale\n' +
                               '`/giveaway start` - Mulai giveaway\n' +
                               '`/giveaway reroll` - Reroll pemenang giveaway\n' +
                               '`/setup-panel` - Pasang panel role manager\n' +
                               '`/setup-shop` - Pasang panel shop\n' +
                               '`/test-welcome` - Simulasi welcome message'
                    },
                    {
                        name: '🌐 **Web Dashboard**',
                        value: 'Akses dashboard admin di: `http://47.129.58.40:3000/admin`\n' +
                               '**Fitur dashboard:**\n' +
                               '• Economy Management\n' +
                               '• User Management\n' +
                               '• Moderation Tools\n' +
                               '• Leaderboard Management\n' +
                               '• Event Management\n' +
                               '• Analytics & Statistics\n' +
                               '• Limiter & Max Bet Management\n' +
                               '• Say Message (Bot Message Sender)\n' +
                               '• Dan banyak lagi...'
                    }
                )
                .setFooter({ text: 'Hanya Admin Bot yang bisa menggunakan command ini.' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // !say <message> (Admin Chat)
        if (content.startsWith('!say ') || content.startsWith('!mangujang ')) {
            if (!message.member.permissions.has('Administrator')) return;

            const text = message.content.split(' ').slice(1).join(' ');
            if (!text) return;

            try {
                await message.delete();
            } catch (e) { }

            return message.channel.send(text);
        }

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

            return message.reply(`✅ **Berhasil!**\nSaldo ${targetUser} ditambah **Rp ${formatMoney(amount)}**.`);
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

            return message.reply(`✅ **Berhasil!**\nSaldo ${targetUser} di-set menjadi **Rp ${formatMoney(amount)}**.`);
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

        // --- 6. EVENT SYSTEM ---
        if (content.startsWith('!event')) {
            const eventHandler = require('../handlers/eventHandler.js');
            const args = content.split(' ');
            const command = args[0];
            await eventHandler.handleEvent(message, command, args);
            return;
        }

        // --- 7. LEADERBOARD ---
        if (content.startsWith('!leaderboard') || content.startsWith('!lb') || content.startsWith('!top')) {
            const leaderboardHandler = require('../handlers/leaderboardHandler.js');
            const args = content.split(' ');
            const typeArg = args[1] ? args[1].toLowerCase() : 'global';

            let type = 'global';
            if (typeArg === 'server' || typeArg === 'local') type = 'server';
            if (typeArg === 'event') type = 'event';

            await leaderboardHandler.showLeaderboard(message, db, type);
            return;
        }

        // --- 7. HEIST ---
        if (content === '!heist') {
            const heistHandler = require('../handlers/heistHandler.js');
            await heistHandler.startHeist(message);
            return;
        }

        // --- 8. BLACKLIST LEADERBOARD (ADMIN) ---
        if (content.startsWith('!blacklist ')) {
            if (!message.member.permissions.has('Administrator')) return message.reply('❌ Admin Only!');
            const target = message.mentions.users.first();
            if (!target) return message.reply('❌ Tag user yang mau di-blacklist.');

            if (db.blacklistUser(target.id)) {
                message.reply(`✅ **${target.username}** berhasil di-blacklist dari leaderboard.`);
            } else {
                message.reply('❌ Gagal mem-blacklist user.');
            }
            return;
        }

        if (content.startsWith('!unblacklist ')) {
            if (!message.member.permissions.has('Administrator')) return message.reply('❌ Admin Only!');
            const target = message.mentions.users.first();
            if (!target) return message.reply('❌ Tag user yang mau di-unblacklist.');

            if (db.unblacklistUser(target.id)) {
                message.reply(`✅ **${target.username}** dihapus dari blacklist.`);
            } else {
                message.reply('❌ Gagal unblacklist user.');
            }
            return;
        }

        // !setleaderboardrole <rank> <role_id>
        if (content.startsWith('!setleaderboardrole ')) {
            if (!message.member.permissions.has('Administrator')) return message.reply('❌ Admin Only!');
            const args = content.split(' ');
            const rank = parseInt(args[1]);
            const roleId = args[2];

            if (![1, 2, 3].includes(rank) || !roleId) {
                return message.reply('❌ Format: `!setleaderboardrole <1/2/3> <role_id>`');
            }

            db.setSystemVar(`lb_role_${rank}`, roleId);
            return message.reply(`✅ **Role Rank ${rank}** diset ke ID: \`${roleId}\`.`);
        }

        // --- 9. PATCHNOTE ---
        if (content === '!patchnote' || content === '!changelog') {
            const patchnoteCommand = require('../commands/user/patchnote.js');
            // Mock interaction object for compatibility
            const mockInteraction = {
                deferReply: async () => { },
                editReply: async (response) => {
                    if (response.embeds) {
                        return message.reply({ embeds: response.embeds });
                    }
                    return message.reply(response);
                },
                user: message.author,
                guild: message.guild
            };
            await patchnoteCommand.execute(mockInteraction);
            return;
        }

        // --- 10. HELP COMMAND ---
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
                            name: '💰 CARI UANG (KERJA)',
                            value:
                                '`!cekdompet` - Cek saldo.\n' +
                                '`!daily` - Ambil gaji harian.\n' +
                                '`!bantujualan` - Kerja santai (5k-10k).\n' +
                                '`!nyapulapangan` - Kerja sedang (3k-7k).\n' +
                                '`!pungutsampah` - Kerja ringan (2k-5k).\n' +
                                '`!ngerjainpr` - Joki PR (10k-25k).\n' +
                                '`!parkir` - Jaga Parkir (2k-50k).\n' +
                                '`!jualanpulsa` - Bisnis Pulsa (5k-15k).\n' +
                                '`!jagawarnet` - Jaga Warnet (15k-30k, Stress++).\n' +
                                '`!mulung` - Cari rongsok (Dapet Item!).'
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

                // PAGE 3: COIN UJANG & FITUR SEKOLAH
                new EmbedBuilder()
                    .setTitle('💎 COIN UJANG & FITUR SEKOLAH (3/3)')
                    .setColor('#A020F0')
                    .setDescription('Fitur premium dan kehidupan sekolah.')
                    .addFields(
                        {
                            name: '🏫 KEHIDUPAN SEKOLAH (BARU!)',
                            value:
                                '`!tawuran` - Ajak teman lawan sekolah sebelah.\n' +
                                '`!eskul` - Join ekskul buat dapet buff.\n' +
                                '`!bolos` - Kabur dari sekolah (Turunin Stress).\n' +
                                '`!contek` - Nyontek ujian (Duit Gede/Denda).'
                        },
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
