const { Events } = require('discord.js');
const db = require('../database.js');
const gameHandler = require('../handlers/gameHandler.js');
const gamblingHandler = require('../handlers/gamblingHandler.js');

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

            // Transaksi
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(amount, userId);

            // Cek penerima, jika belum ada buat baru
            const receiver = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(targetUser.id);
            if (!receiver) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(targetUser.id);

            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, targetUser.id);

            return message.reply(`✅ **Transfer Berhasil!**\nKamu mengirim Rp ${amount.toLocaleString('id-ID')} ke ${targetUser}.`);
        }

        // !minta (Beg)
        if (content === '!minta') {
            const user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            const now = Date.now();

            if (!client.begCooldowns) client.begCooldowns = new Map();

            const lastBeg = client.begCooldowns.get(userId) || 0;
            const cooldown = 2 * 60 * 60 * 1000; // 2 Jam

            if (now - lastBeg < cooldown) {
                return message.reply(`🛑 **Jangan ngemis terus!**\nCoba lagi <t:${Math.ceil((lastBeg + cooldown) / 1000)}:R>.`);
            }

            // RNG Success
            const success = Math.random() > 0.3; // 70% Success
            if (success) {
                const amount = Math.floor(Math.random() * 1500) + 500; // 500 - 2000
                if (!user) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(userId);
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(amount, userId);
                client.begCooldowns.set(userId, now);
                return message.reply(`🥺 **Dikasih kasihan...**\nKamu dapet Rp ${amount.toLocaleString('id-ID')}.`);
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
        if (content.startsWith('!coinflip') || content.startsWith('!cf') || content.startsWith('!slots') || content.startsWith('!doaujang')) {
            const args = content.split(' ');
            const command = args[0];
            await gamblingHandler.handleGambling(message, command, args);
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

        // --- 6. HELP COMMAND ---
        if (content === '!kantinhelp') {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('📚 KANTIN SEKOLAH - HELP MENU')
                .setColor('#00AAFF')
                .setDescription('Berikut adalah daftar command yang tersedia di Kantin Sekolah:')
                .addFields(
                    {
                        name: '🏪 KANTIN & WARUNG',
                        value:
                            '`/kantin` - Buka menu makanan & minuman (Jual Korek juga!).\n' +
                            '`/warung` - Warung Rahasia (Jual Rokok).\n' +
                            '`/makan` - Makan/Minum/Merokok dari tas.'
                    },
                    {
                        name: '📊 STATUS & SURVIVAL',
                        value:
                            '`/cekstatus` - Cek Lapar, Haus, Stress.\n' +
                            '• **Kerja** nambah Lapar, Haus, Stress.\n' +
                            '• **Makan/Minum** kurangi Lapar/Haus.\n' +
                            '• **Merokok** kurangi Stress (Butuh Korek).'
                    },
                    {
                        name: '💰 EKONOMI (Cari Uang)',
                        value:
                            '`!cekdompet` - Cek saldo Uang Jajan.\n' +
                            '`!bantujualan` - Bantu Mang Ujang (Rp 5k-10k).\n' +
                            '`!nyapulapangan` - Sapu lapangan (Rp 3k-7k).\n' +
                            '`!pungutsampah` - Pungut sampah (Rp 2k-5k).'
                    },
                    {
                        name: '🤝 SOSIAL',
                        value:
                            '`!beri @user <jumlah>` - Transfer uang ke teman.\n' +
                            '`!minta` - Ngemis ke orang lewat (Hoki-hokian).\n' +
                            '`!palak @user <jumlah>` - Ajak duel Batu Gunting Kertas (Winner takes all).'
                    },
                    {
                        name: '🎲 GAME & JUDI',
                        value:
                            '`!coinflip <jumlah> <h/t>` - Judi koin (x2).\n' +
                            '`!slots <jumlah>` - Judi slot (x2 / x5 Jackpot).'
                    },
                    {
                        name: '👮 ADMIN ONLY',
                        value: '`!tambahsaldo @user <jumlah>` - Tambah saldo member.'
                    }
                )
                .setFooter({ text: 'Gunakan dengan bijak ya, Sobat Sekolah!' });

            return message.reply({ embeds: [embed] });
        }
    },
};
