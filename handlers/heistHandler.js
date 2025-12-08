const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../database.js');

let activeHeist = null;

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
        if (activeHeist) return message.reply('⚠️ **Heist sedang berlangsung!** Tunggu sampai selesai.');

        const userId = message.author.id;

        // Check Cooldown
        const lastHeist = db.getCooldown(userId, 'heist');
        const cooldown = 2 * 60 * 60 * 1000; // 2 Jam
        if (lastHeist && (Date.now() - lastHeist) < cooldown) {
            const remaining = Math.ceil((cooldown - (Date.now() - lastHeist)) / 60000);
            return message.reply(`⏳ **Sabar Bos!** Polisi masih patroli. Tunggu ${remaining} menit lagi.`);
        }

        activeHeist = {
            leader: userId,
            participants: [userId],
            channelId: message.channel.id,
            stage: 'lobby'
        };

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
            if (activeHeist.participants.includes(m.author.id)) {
                return m.reply('Lu udah join bang!');
            }
            if (activeHeist.participants.length >= 5) {
                return m.reply('Tim penuh!');
            }

            // Check Jail/Cooldown for joiners
            const jail = db.isJailed(m.author.id);
            if (jail) return m.reply(`🔒 **Lu lagi dipenjara!** Bebas dalam <t:${Math.ceil(jail.release_time / 1000)}:R>.`);

            const lastJoin = db.getCooldown(m.author.id, 'heist');
            if (lastJoin && (Date.now() - lastJoin) < cooldown) {
                return m.reply('⏳ Lu masih cooldown heist!');
            }

            activeHeist.participants.push(m.author.id);
            m.reply(`✅ **${m.author.username}** bergabung! (${activeHeist.participants.length}/5)`);
        });

        collector.on('end', async () => {
            if (activeHeist.participants.length < 2) { // Changed min to 2 for easier testing, plan said 3 but user might be alone testing
                activeHeist = null;
                return message.channel.send('❌ **Heist Dibatalkan!** Kurang orang (Minimal 2).');
            }

            await message.channel.send('🔫 **TIM BERGERAK!** Masuk ke dalam bank...');
            await this.minigame1_SafeCrack(message.channel);
        });
    },

    async minigame1_SafeCrack(channel) {
        activeHeist.stage = 'safe_crack';
        const code = SAFE_CODES[Math.floor(Math.random() * SAFE_CODES.length)];

        const msg = await channel.send(`🔐 **BOBOL BRANKAS!**\nHafalkan kode ini dalam 5 detik:\n\n# **${code}**`);

        setTimeout(async () => {
            await msg.delete().catch(() => { });
            await channel.send('⌨️ **KETIK KODENYA SEKARANG!** (Waktu: 10 detik)');

            const filter = m => activeHeist.participants.includes(m.author.id);
            const collector = channel.createMessageCollector({ filter, time: 10000, max: 1 });

            collector.on('collect', async m => {
                if (m.content.trim() === code) {
                    await channel.send('✅ **BRANKAS TERBUKA!** Lanjut ke tahap berikutnya!');
                    this.minigame2_WireCut(channel);
                } else {
                    this.failHeist(channel, 'Salah kode! Alarm bunyi 🚨');
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    this.failHeist(channel, 'Kelamaan! Polisi keburu dateng 🚨');
                }
            });
        }, 5000);
    },

    async minigame2_WireCut(channel) {
        activeHeist.stage = 'wire_cut';

        // Logic: Pick a safe wire, give clue NOT to cut others or hint at safe one
        // Simple Logic: 1 Safe, 3 Boom
        const safeWireIndex = Math.floor(Math.random() * WIRES.length);
        const safeWire = WIRES[safeWireIndex];

        // Generate Clue (Reverse logic: Hint at the safe one indirectly)
        // Or simpler: "Potong yang warna [Hint]"
        // Let's use the predefined clues.
        // If safe is Red, clue should imply Red is safe OR others are dangerous.
        // Let's make it random chance for now to keep it simple but fun.
        // Actually, let's make it a voting game.

        const row = new ActionRowBuilder();
        WIRES.forEach((wire, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`wire_${index}`)
                    .setLabel(wire)
                    .setStyle(ButtonStyle.Secondary) // Grey initially
            );
        });

        const embed = new EmbedBuilder()
            .setTitle('💣 JINAKKAN BOM!')
            .setDescription(`Ada bom di brankas! Potong kabel yang benar.\n**CLUE:** "Felling gw sih... ${WIRE_CLUES[safeWire][Math.floor(Math.random() * 2)]}"\n\nKalian punya 15 detik untuk memotong satu kabel!`)
            .setColor('#FFFF00');

        const msg = await channel.send({ embeds: [embed], components: [row] });

        const filter = i => activeHeist.participants.includes(i.user.id);
        const collector = msg.createMessageComponentCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const choiceIndex = parseInt(i.customId.split('_')[1]);

            if (choiceIndex === safeWireIndex) {
                await channel.send(`✅ **${i.user.username}** memotong kabel ${WIRES[choiceIndex]}... **AMAN!** Bom mati.`);
                this.minigame3_Getaway(channel);
            } else {
                await channel.send(`💥 **${i.user.username}** memotong kabel ${WIRES[choiceIndex]}... **DUARRRR!!!**`);
                this.failHeist(channel, 'Bom meledak!');
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                this.failHeist(channel, 'Waktu habis! Bom meledak 💥');
            }
        });
    },

    async minigame3_Getaway(channel) {
        activeHeist.stage = 'getaway';
        await channel.send('🏃 **LARI!!!** Polisi mengepung pintu keluar!');

        // Random delay 2-5 seconds
        const delay = Math.floor(Math.random() * 3000) + 2000;

        setTimeout(async () => {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('run_button')
                    .setLabel('LARI SEKARANG! 🏃')
                    .setStyle(ButtonStyle.Success)
            );

            const msg = await channel.send({ content: '🚨 **POLISI DATANG! TEKAN TOMBOL!**', components: [row] });
            const startTime = Date.now();

            const filter = i => activeHeist.participants.includes(i.user.id);
            const collector = msg.createMessageComponentCollector({ filter, time: 2000 }); // 2 Seconds window

            const escaped = new Set();

            collector.on('collect', async i => {
                await i.deferUpdate();
                escaped.add(i.user.id);
            });

            collector.on('end', async () => {
                // Calculate Results
                const survivors = activeHeist.participants.filter(id => escaped.has(id));
                const caught = activeHeist.participants.filter(id => !escaped.has(id));

                if (survivors.length === 0) {
                    this.failHeist(channel, 'Semua ketangkep polisi! 👮');
                } else {
                    this.successHeist(channel, survivors, caught);
                }
            });
        }, delay);
    },

    async successHeist(channel, survivors, caught) {
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
            .setDescription(`Total Jarahan: **Rp ${totalLoot.toLocaleString('id-ID')}**\n\n🏃 **Lolos (${survivors.length}):**\nDapat masing-masing **Rp ${share.toLocaleString('id-ID')}**\n\n👮 **Ketangkep (${caught.length}):**\nMasuk penjara 15 menit!`)
            .setColor('#00FF00');

        await channel.send({ embeds: [embed] });
        activeHeist = null;
    },

    async failHeist(channel, reason) {
        // All participants jailed
        activeHeist.participants.forEach(id => {
            db.jailUser(id, 10 * 60 * 1000, 'Gagal Heist'); // 10 Mins Jail
            db.setCooldown(id, 'heist');
        });

        const embed = new EmbedBuilder()
            .setTitle('❌ HEIST GAGAL!')
            .setDescription(`**Penyebab:** ${reason}\n\nSemua anggota tim ditangkap polisi dan dipenjara selama 10 menit.`)
            .setColor('#000000');

        await channel.send({ embeds: [embed] });
        activeHeist = null;
    }
};
