const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

const activeHeists = new Map();

const SAFE_CODES = ['1337', '8008', '6969', '4200', '1234', '9999', '2025', '0000'];
const WIRES = ['Merah', 'Biru', 'Hijau', 'Kuning'];
const WIRE_CLUES = {
    'Merah': ['Jangan potong warna darah!', 'Langit itu biru, rumput itu hijau.'],
    'Biru': ['Laut itu dalam.', 'Api itu panas, matahari itu silau.'],
    'Hijau': ['Rumput tetangga lebih hijau.', 'Darah itu merah, laut itu biru.'],
    'Kuning': ['Matahari bersinar terang.', 'Jangan potong warna pisang!']
};

module.exports = {
    async startHeist(message) {
        const channelId = message.channel.id;
        if (activeHeists.has(channelId)) return message.reply('⚠️ **Heist sedang berlangsung di sini!** Tunggu sampai selesai.');

        const userId = message.author.id;

        // Check Cooldown
        const lastHeist = db.getCooldown(userId, 'heist');
        const cooldown = 2 * 60 * 60 * 1000; // 2 Jam
        if (lastHeist && (Date.now() - lastHeist) < cooldown) {
            const remaining = Math.ceil((cooldown - (Date.now() - lastHeist)) / 60000);
            return message.reply(`⏳ **Sabar Bos!** Polisi masih patroli. Tunggu ${remaining} menit lagi.`);
        }

        const session = {
            leader: userId,
            participants: [userId],
            channelId: channelId,
            stage: 'lobby'
        };
        activeHeists.set(channelId, session);

        const embed = new EmbedBuilder()
            .setTitle('💰 HEIST DIMULAI!')
            .setDescription(`**${message.author.username}** mengajak merampok bank!\n\nKetik \`!join\` untuk bergabung.\nMinimal 2 orang, Maksimal 5 orang.\nWaktu tunggu: 60 detik.`)
            .setColor('#FF0000')
            .setFooter({ text: 'Siapkan mental kalian!' });

        const lobbyMsg = await message.channel.send({ embeds: [embed] });

        // Lobby Collector
        const filter = m => m.content.toLowerCase() === '!join' && !m.author.bot;
        const collector = message.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', m => {
            const currentSession = activeHeists.get(channelId);
            if (!currentSession) return;

            if (currentSession.participants.includes(m.author.id)) {
                return m.reply('Lu udah join bang!');
            }
            if (currentSession.participants.length >= 5) {
                return m.reply('Tim penuh!');
            }

            // Check Jail/Cooldown for joiners
            const jail = db.isJailed(m.author.id);
            if (jail) return m.reply(`🔒 **Lu lagi dipenjara!** Bebas dalam <t:${Math.ceil(jail.release_time / 1000)}:R>.`);

            const lastJoin = db.getCooldown(m.author.id, 'heist');
            if (lastJoin && (Date.now() - lastJoin) < cooldown) {
                return m.reply('⏳ Lu masih cooldown heist!');
            }

            currentSession.participants.push(m.author.id);
            m.reply(`✅ **${m.author.username}** bergabung! (${currentSession.participants.length}/5)`);
        });

        collector.on('end', async () => {
            const currentSession = activeHeists.get(channelId);
            if (!currentSession) return;

            if (currentSession.participants.length < 2) {
                activeHeists.delete(channelId);
                return message.channel.send('❌ **Heist Dibatalkan!** Kurang orang (Minimal 2).');
            }

            await message.channel.send('🔫 **TIM BERGERAK!** Masuk ke dalam bank...');
            await this.minigame1_SafeCrack(message.channel, channelId);
        });
    },

    async minigame1_SafeCrack(channel, channelId) {
        const session = activeHeists.get(channelId);
        if (!session) return;

        session.stage = 'safe_crack';
        const code = SAFE_CODES[Math.floor(Math.random() * SAFE_CODES.length)];

        const msg = await channel.send(`🔐 **BOBOL BRANKAS!**\nHafalkan kode ini dalam 5 detik:\n\n# **${code}**`);

        setTimeout(async () => {
            await msg.delete().catch(() => { });
            await channel.send('⌨️ **KETIK KODENYA SEKARANG!** (Waktu: 10 detik)');

            const filter = m => {
                const s = activeHeists.get(channelId);
                return s && s.participants.includes(m.author.id);
            };
            const collector = channel.createMessageCollector({ filter, time: 10000, max: 1 });

            collector.on('collect', async m => {
                if (m.content.trim() === code) {
                    await channel.send('✅ **BRANKAS TERBUKA!** Lanjut ke tahap berikutnya!');
                    this.minigame2_WireCut(channel, channelId);
                } else {
                    this.failHeist(channel, 'Salah kode! Alarm bunyi 🚨', channelId);
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    this.failHeist(channel, 'Kelamaan! Polisi keburu dateng 🚨', channelId);
                }
            });
        }, 5000);
    },

    async minigame2_WireCut(channel, channelId) {
        const session = activeHeists.get(channelId);
        if (!session) return;

        session.stage = 'wire_cut';

        const safeWireIndex = Math.floor(Math.random() * WIRES.length);
        const safeWire = WIRES[safeWireIndex];

        const row = new ActionRowBuilder();
        WIRES.forEach((wire, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`wire_${index}`)
                    .setLabel(wire)
                    .setStyle(ButtonStyle.Secondary)
            );
        });

        const embed = new EmbedBuilder()
            .setTitle('💣 JINAKKAN BOM!')
            .setDescription(`Ada bom di brankas! Potong kabel yang benar.\n**CLUE:** "Felling gw sih... ${WIRE_CLUES[safeWire][Math.floor(Math.random() * 2)]}"\n\nKalian punya 15 detik untuk memotong satu kabel!`)
            .setColor('#FFFF00');

        const msg = await channel.send({ embeds: [embed], components: [row] });

        const filter = i => {
            const s = activeHeists.get(channelId);
            return s && s.participants.includes(i.user.id);
        };
        const collector = msg.createMessageComponentCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const choiceIndex = parseInt(i.customId.split('_')[1]);

            if (choiceIndex === safeWireIndex) {
                await channel.send(`✅ **${i.user.username}** memotong kabel ${WIRES[choiceIndex]}... **AMAN!** Bom mati.`);
                this.minigame3_Getaway(channel, channelId);
            } else {
                await channel.send(`💥 **${i.user.username}** memotong kabel ${WIRES[choiceIndex]}... **DUARRRR!!!**`);
                this.failHeist(channel, 'Bom meledak!', channelId);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                this.failHeist(channel, 'Waktu habis! Bom meledak 💥', channelId);
            }
        });
    },

    async minigame3_Getaway(channel, channelId) {
        const session = activeHeists.get(channelId);
        if (!session) return;

        session.stage = 'getaway';
        await channel.send('🏃 **LARI!!!** Polisi mengepung pintu keluar!');

        const delay = Math.floor(Math.random() * 3000) + 2000;

        setTimeout(async () => {
            // Re-check session existence after timeout
            if (!activeHeists.has(channelId)) return;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('run_button')
                    .setLabel('LARI SEKARANG! 🏃')
                    .setStyle(ButtonStyle.Success)
            );

            const msg = await channel.send({ content: '🚨 **POLISI DATANG! TEKAN TOMBOL!**', components: [row] });

            const filter = i => {
                const s = activeHeists.get(channelId);
                return s && s.participants.includes(i.user.id);
            };
            const collector = msg.createMessageComponentCollector({ filter, time: 2000 });

            const escaped = new Set();

            collector.on('collect', async i => {
                await i.deferUpdate();
                escaped.add(i.user.id);
            });

            collector.on('end', async () => {
                const currentSession = activeHeists.get(channelId);
                if (!currentSession) return;

                const survivors = currentSession.participants.filter(id => escaped.has(id));
                const caught = currentSession.participants.filter(id => !escaped.has(id));

                if (survivors.length === 0) {
                    this.failHeist(channel, 'Semua ketangkep polisi! 👮', channelId);
                } else {
                    this.successHeist(channel, survivors, caught, channelId);
                }
            });
        }, delay);
    },

    async successHeist(channel, survivors, caught, channelId) {
        const totalLoot = Math.floor(Math.random() * 500000) + 100000; // 100k - 600k
        const share = Math.floor(totalLoot / survivors.length);

        survivors.forEach(id => {
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(share, id);
            db.setCooldown(id, 'heist');
        });

        caught.forEach(id => {
            db.jailUser(id, 15 * 60 * 1000, 'Gagal Kabur Heist'); // 15 Mins Jail
            db.setCooldown(id, 'heist');
        });

        const embed = new EmbedBuilder()
            .setTitle('💰 HEIST SUKSES!')
            .setDescription(`Total Jarahan: **Rp ${formatMoney(totalLoot)}**\n\n🏃 **Lolos (${survivors.length}):**\nDapat masing-masing **Rp ${formatMoney(share)}**\n\n👮 **Ketangkep (${caught.length}):**\nMasuk penjara 15 menit!`)
            .setColor('#00FF00');

        await channel.send({ embeds: [embed] });
        activeHeists.delete(channelId);
    },

    async failHeist(channel, reason, channelId) {
        const session = activeHeists.get(channelId);
        if (!session) return;

        // All participants jailed
        session.participants.forEach(id => {
            db.jailUser(id, 10 * 60 * 1000, 'Gagal Heist'); // 10 Mins Jail
            db.setCooldown(id, 'heist');
        });

        const embed = new EmbedBuilder()
            .setTitle('❌ HEIST GAGAL!')
            .setDescription(`**Penyebab:** ${reason}\n\nSemua anggota tim ditangkap polisi dan dipenjara selama 10 menit.`)
            .setColor('#000000');

        await channel.send({ embeds: [embed] });
        activeHeists.delete(channelId);
    }
};
