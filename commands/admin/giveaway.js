const { 
    SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, 
    ButtonStyle, ComponentType, PermissionFlagsBits, MessageFlags 
} = require('discord.js');
const db = require('../../database.js');
const { TIKET_CONFIG } = require('../../utils/helpers.js');

// Ambil daftar tiket dari config untuk dropdown pilihan
const choices = Object.keys(TIKET_CONFIG).map(k => ({ name: TIKET_CONFIG[k].label, value: k }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Kelola giveaway (Buat Baru atau Reroll).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // SUBCOMMAND 1: START
        .addSubcommand(sub => 
            sub.setName('start')
                .setDescription('Mulai giveaway baru.')
                .addStringOption(o => o.setName('hadiah').setDescription('Tiket Hadiah').setRequired(true).addChoices(...choices))
                .addIntegerOption(o => o.setName('waktu').setDescription('Durasi (Menit)').setRequired(true).setMinValue(1))
                .addIntegerOption(o => o.setName('pemenang').setDescription('Jumlah Pemenang').setRequired(true).setMinValue(1))
                .addBooleanOption(o => o.setName('tag_everyone').setDescription('Tag @everyone?').setRequired(false))
        )
        // SUBCOMMAND 2: REROLL
        .addSubcommand(sub => 
            sub.setName('reroll')
                .setDescription('Pilih pemenang baru dari giveaway lama.')
                .addStringOption(o => o.setName('message_id').setDescription('ID Pesan Giveaway').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // ====================================================
        // LOGIKA REROLL
        // ====================================================
        if (subcommand === 'reroll') {
            await interaction.deferReply();
            const msgId = interaction.options.getString('message_id');

            // 1. Cek Data Giveaway
            const giveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(msgId);
            if (!giveaway) return interaction.editReply('❌ Data giveaway tidak ditemukan di database.');

            // 2. Ambil Peserta
            const participants = db.prepare('SELECT user_id FROM giveaway_participants WHERE message_id = ?').all(msgId);
            if (participants.length === 0) return interaction.editReply('❌ Tidak ada peserta.');

            // 3. Pilih Pemenang Baru
            const randomIndex = Math.floor(Math.random() * participants.length);
            const winnerId = participants[randomIndex].user_id;
            const tiketKey = giveaway.prize_ticket;
            const tiketLabel = TIKET_CONFIG[tiketKey]?.label || tiketKey;

            // 4. Kirim Hadiah (Auto)
            db.prepare(`
                INSERT INTO inventaris (user_id, jenis_tiket, jumlah) 
                VALUES (?, ?, 1) 
                ON CONFLICT(user_id, jenis_tiket) DO UPDATE SET jumlah = jumlah + 1
            `).run(winnerId, tiketKey);

            // 5. Umumkan
            await interaction.editReply(`🎉 **REROLL SUKSES!**\nPemenang baru: <@${winnerId}>\nHadiah: **${tiketLabel}** (Terkirim).`);
            await interaction.channel.send(`🎉 **REROLL PEMENANG!**\nSelamat kepada <@${winnerId}>! Kamu mendapatkan **${tiketLabel}**! 🥳`);
            return;
        }

        // ====================================================
        // LOGIKA START GIVEAWAY
        // ====================================================
        if (subcommand === 'start') {
            // 1. Ambil Input Admin
            const tiketKey = interaction.options.getString('hadiah');
            const durationMinutes = interaction.options.getInteger('waktu');
            const winnerCount = interaction.options.getInteger('pemenang');
            const doTag = interaction.options.getBoolean('tag_everyone') || false;

            const tiketLabel = TIKET_CONFIG[tiketKey].label;
            const endTime = Date.now() + (durationMinutes * 60 * 1000);

            // 2. Balas Admin
            await interaction.reply({ content: `✅ Giveaway **${tiketLabel}** dimulai!`, flags: [MessageFlags.Ephemeral] });

            // 3. Siapkan Embed & Tombol
            const embed = new EmbedBuilder()
                .setTitle('🎉 GIVEAWAY TIKET SPESIAL! 🎉')
                .setDescription(
                    `**Hadiah:** ${tiketLabel}\n` +
                    `**Pemenang:** ${winnerCount} Orang\n` +
                    `**Berakhir:** <t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:f>)\n\n` +
                    `Klik tombol **JOIN** di bawah untuk ikutan!`
                )
                .setColor('Gold')
                .setFooter({ text: 'Sponsored by Admin' })
                .setTimestamp(endTime);

            const btn = new ButtonBuilder()
                .setCustomId('join_gw')
                .setLabel('Ikutan Giveaway')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(btn);

            // 4. Kirim Pesan
            const content = doTag ? '@everyone 🎉 **GIVEAWAY ALERT!**' : '🎉 **GIVEAWAY ALERT!**';
            const msg = await interaction.channel.send({ content: content, embeds: [embed], components: [row] });

            // --- SIMPAN DATA KE DATABASE (PENTING UNTUK REROLL) ---
            db.prepare('INSERT INTO giveaways (message_id, channel_id, prize_ticket, created_at) VALUES (?, ?, ?, ?)').run(msg.id, interaction.channel.id, tiketKey, Date.now());

            // 5. Sistem Kolektor
            const participants = new Set();
            const collector = msg.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: durationMinutes * 60 * 1000 
            });

            collector.on('collect', async i => {
                if (i.customId === 'join_gw') {
                    // Cek DB (Persistance)
                    const exist = db.prepare('SELECT 1 FROM giveaway_participants WHERE message_id = ? AND user_id = ?').get(msg.id, i.user.id);
                    
                    if (exist || participants.has(i.user.id)) {
                        await i.reply({ content: '⚠️ Kamu sudah terdaftar!', flags: [MessageFlags.Ephemeral] });
                    } else {
                        participants.add(i.user.id);
                        // Simpan Peserta ke DB
                        db.prepare('INSERT INTO giveaway_participants (message_id, user_id) VALUES (?, ?)').run(msg.id, i.user.id);
                        
                        // Hitung Total Real
                        const count = db.prepare('SELECT count(*) as c FROM giveaway_participants WHERE message_id = ?').get(msg.id);
                        await i.reply({ content: `✅ Berhasil join! Total peserta: **${count.c}**`, flags: [MessageFlags.Ephemeral] });
                    }
                }
            });

            collector.on('end', async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(btn).setDisabled(true).setLabel('Giveaway Berakhir').setStyle(ButtonStyle.Secondary)
                );

                // Ambil peserta final dari DB (Lebih akurat jika bot restart)
                const allParticipants = db.prepare('SELECT user_id FROM giveaway_participants WHERE message_id = ?').all(msg.id);

                if (allParticipants.length === 0) {
                    embed.setDescription('🔴 **Giveaway Batal.** Tidak ada peserta yang join.');
                    embed.setColor('Red');
                    await msg.edit({ embeds: [embed], components: [disabledRow] });
                    return;
                }

                // Acak Pemenang
                const winners = [];
                const pool = [...allParticipants];
                for (let i = 0; i < winnerCount; i++) {
                    if (pool.length === 0) break;
                    const index = Math.floor(Math.random() * pool.length);
                    winners.push(pool.splice(index, 1)[0].user_id);
                }

                // Kirim Hadiah
                const trx = db.transaction(() => {
                    for (const uid of winners) {
                        db.prepare(`
                            INSERT INTO inventaris (user_id, jenis_tiket, jumlah) 
                            VALUES (?, ?, 1) 
                            ON CONFLICT(user_id, jenis_tiket) DO UPDATE SET jumlah = jumlah + 1
                        `).run(uid, tiketKey);
                    }
                });
                trx();

                // Update Embed
                const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
                embed.setTitle('🎊 GIVEAWAY SELESAI! 🎊');
                embed.setColor('Green');
                embed.setDescription(
                    `**Hadiah:** ${tiketLabel}\n` +
                    `**Total Peserta:** ${allParticipants.length}\n\n` +
                    `🏆 **PEMENANG:**\n${winnerMentions}\n\n` +
                    `*Hadiah terkirim otomatis!*`
                );
                embed.setFooter({ text: `Message ID: ${msg.id} (Gunakan ID ini untuk /giveaway reroll)` });

                await msg.edit({ embeds: [embed], components: [disabledRow] });
                await interaction.channel.send(`Selamat kepada pemenang! 🥳\n${winnerMentions}\n\nTiket **${tiketLabel}** sudah masuk ke tas kalian!`);
            });
        }
    }
};