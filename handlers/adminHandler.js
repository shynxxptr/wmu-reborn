const {
    ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder
} = require('discord.js');

const db = require('../database.js');
const { sendLog, sendDM } = require('../utils/logger.js');
const { parseDuration, TIKET_CONFIG } = require('../utils/helpers.js');
const { stockChannelId } = require('../config.json');

let liveReportMsgId = null;

// --- FUNGSI UPDATE LIVE REPORT ---
async function updateLiveReport(client) {
    if (!stockChannelId) return;
    try {
        const channel = await client.channels.fetch(stockChannelId).catch(() => null);
        if (!channel) return;

        const stocks = db.prepare('SELECT * FROM ticket_stock').all();

        const embed = new EmbedBuilder()
            .setTitle('📋 MENU KANTIN')
            .setColor('#FFA500')
            .setDescription('Berikut adalah menu kantin hari ini.\nSilakan gunakan command `/shop` atau menu di bawah untuk jajan.')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2829/2829818.png');

        const order = ['30d', '10d', '7d', '3d', '1d', 'tiket_gradasi', 'kartu_ubah'];

        order.forEach(jenis => {
            const s = stocks.find(x => x.jenis_tiket === jenis);
            if (s) {
                const sisa = s.max_stock - s.sold;
                let statusInfo = `✅ **Ready**`;

                if (sisa <= 0) {
                    statusInfo = '🔴 **SOLD OUT**';
                }

                embed.addFields({
                    name: `${TIKET_CONFIG[jenis].label}`,
                    value: `🏷️ **${s.price_text}**\n${statusInfo}`,
                    inline: true
                });
            }
        });

        embed.setFooter({ text: `Update Terakhir: ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}` });

        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        let existingMsg = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (existingMsg) {
            await existingMsg.edit({ embeds: [embed] });
        } else {
            const newMsg = await channel.send({ embeds: [embed] });
            liveReportMsgId = newMsg.id;
        }

    } catch (e) { console.error('[Live Report Error]', e.message); }
}

module.exports = {
    updateLiveReport,

    async handleAdminListener(interaction, client) {
        const { customId, user, guild } = interaction;

        try {
            // --- A. HANDLE REQUEST GRADASI ---
            if (customId.startsWith('adm_req_')) {
                await interaction.deferUpdate();
                const parts = customId.split('_');
                const action = parts[2];
                const userId = parts[3];
                const type = parts[4];

                if (action === 'ok') {
                    await sendDM(client, userId, '🌈 **Request Gradasi Diterima!**\nAdmin telah memasang warna gradasi pada role kamu.');
                    await interaction.editReply({ content: `✅ Disetujui oleh ${user}.`, components: [] });
                } else {
                    let msg = '❌ **Request Gradasi Ditolak.** Silakan request ulang.';
                    if (type === 'grad' || type === 'addon') {
                        db.prepare('UPDATE inventaris SET jumlah = jumlah + 1 WHERE user_id = ? AND jenis_tiket = ?').run(userId, 'tiket_gradasi');
                        msg += '\n*(Tiket Gradasi telah dikembalikan ke tas kamu)*.';
                    }
                    await sendDM(client, userId, msg);
                    await interaction.editReply({ content: `🚫 Ditolak oleh ${user}.`, components: [] });
                }
                return;
            }

            // --- B. ADMIN MENU (Dropdown) ---

            // 1. KELOLA USER / ROLE (DETAIL WAKTU DITAMPILKAN DISINI)
            if (customId === 'adm_sel_role') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const roleId = interaction.values[0];

                // AMBIL DATA DARI DATABASE UNTUK DITAMPILKAN
                const roleData = db.prepare('SELECT * FROM role_aktif WHERE role_id = ?').get(roleId);

                let infoText = `🔧 **PANEL KONTROL USER**\nRole ID: ${roleId}`;

                if (roleData) {
                    // Format Waktu Discord: <t:TIMESTAMP:F> (Full Date) dan <t:TIMESTAMP:R> (Relative/Sisa Waktu)
                    infoText = `🔧 **PANEL KONTROL USER**\n\n` +
                        `👤 **User:** <@${roleData.user_id}>\n` +
                        `🎨 **Role:** <@&${roleId}>\n` +
                        `⏳ **Berakhir:** <t:${roleData.expires_at}:F> (<t:${roleData.expires_at}:R>)\n\n` +
                        `*Silakan pilih tindakan:*`;
                } else {
                    infoText = `⚠️ **Data Database Tidak Ditemukan!**\nRole ID: ${roleId} mungkin error/hantu. Disarankan Hapus Paksa.`;
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`adm_del_${roleId}`).setLabel('Hapus Paksa').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`adm_time_add_${roleId}`).setLabel('+ Waktu').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`adm_time_sub_${roleId}`).setLabel('- Waktu').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`adm_view_share_${roleId}`).setLabel('Lihat Teman').setStyle(ButtonStyle.Primary).setEmoji('👥')
                );

                await interaction.editReply({ content: infoText, components: [row] });
                return;
            }

            // View Shared Friends
            if (customId.startsWith('adm_view_share_')) {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const roleId = customId.split('_')[3];
                const shares = db.prepare('SELECT * FROM role_shares WHERE role_id = ?').all(roleId);

                if (!shares.length) return interaction.editReply('🔍 Role ini tidak di-share ke siapapun (0 Teman).');

                let list = `**Daftar Teman Nebeng (Role ID: ${roleId}):**\n`;
                for (const s of shares) {
                    list += `• <@${s.friend_id}> (ID: ${s.friend_id})\n`;
                }
                await interaction.editReply({ content: list });
                return;
            }

            if (customId === 'adm_sel_stok') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const jenis = interaction.values[0];
                const label = TIKET_CONFIG[jenis]?.label || jenis;
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`stk_Edit_${jenis}`).setLabel('Set Kuota').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`stk_Reset_${jenis}`).setLabel('Reset Terjual').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`stk_Price_${jenis}`).setLabel('Set Harga').setStyle(ButtonStyle.Success)
                );
                await interaction.editReply({ content: `Kelola Stok: ${label}`, components: [row] });
                return;
            }

            // --- C. TOMBOL AKSI ---

            // 1. Hapus Paksa
            if (customId.startsWith('adm_del_')) {
                await interaction.deferUpdate();
                const rid = customId.split('_')[2];
                const rData = db.prepare('SELECT * FROM role_aktif WHERE role_id = ?').get(rid);
                if (rData) {
                    const ro = guild.roles.cache.get(rid);
                    if (ro) await ro.delete('Admin Force Delete').catch(() => { });
                    db.prepare('DELETE FROM role_aktif WHERE role_id = ?').run(rid);
                    db.prepare('DELETE FROM role_shares WHERE role_id = ?').run(rid);
                    sendDM(client, rData.user_id, '⚠️ Role dihapus paksa oleh admin.');
                    sendLog(client, guild.id, 'Admin Delete', `By: ${user}\nTarget Role ID: ${rid}`, 'Red');
                    await interaction.editReply({ content: '✅ Terhapus.', components: [] });
                } else {
                    db.prepare('DELETE FROM role_shares WHERE role_id = ?').run(rid);
                    await interaction.editReply({ content: '❌ Data hantu dibersihkan.', components: [] });
                }
                return;
            }

            // 2. Trigger Modal Waktu
            if (customId.startsWith('adm_time_')) {
                const [_, __, mode, rid] = customId.split('_');
                const modal = new ModalBuilder().setCustomId(`mod_time_${mode}_${rid}`).setTitle(mode === 'add' ? '+ Waktu' : '- Waktu');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val').setLabel('Durasi (Contoh: 3d 12h)').setStyle(TextInputStyle.Short).setRequired(true)));
                await interaction.showModal(modal);
                return;
            }

            // 3. Trigger Modal Stok
            if (customId.startsWith('stk_Edit_') || customId.startsWith('stk_Price_') || customId === 'stk_Date') {
                let modal;
                if (customId.startsWith('stk_Edit_')) {
                    const j = customId.replace('stk_Edit_', '');
                    modal = new ModalBuilder().setCustomId(`mod_stk_quota_${j}`).setTitle('Set Kuota');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val').setLabel('Max Stok').setStyle(1).setRequired(true)));
                } else if (customId.startsWith('stk_Price_')) {
                    const j = customId.replace('stk_Price_', '');
                    modal = new ModalBuilder().setCustomId(`mod_stk_price_${j}`).setTitle('Set Harga');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('label').setLabel('Label (Rp 50k)').setStyle(1).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val').setLabel('Nilai Angka (50000)').setStyle(1).setRequired(true))
                    );
                } else if (customId === 'stk_Date') {
                    modal = new ModalBuilder().setCustomId(`mod_stk_date`).setTitle('Set Tanggal Restock');
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val').setLabel('Info Tanggal').setStyle(1).setRequired(true)));
                }
                if (modal) await interaction.showModal(modal);
                return;
            }

            // 4. Reset Stok
            if (customId.startsWith('stk_Reset_')) {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const j = customId.replace('stk_Reset_', '');
                db.prepare('UPDATE ticket_stock SET sold = 0 WHERE jenis_tiket = ?').run(j);
                await updateLiveReport(client);
                await interaction.editReply({ content: `✅ Stok berhasil di-reset (Restock).`, flags: [MessageFlags.Ephemeral] });
                return;
            }

            // --- D. MODAL SUBMIT ---
            if (interaction.isModalSubmit()) {
                const val = interaction.fields.getTextInputValue('val');
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                // Time Submit
                if (customId.startsWith('mod_time_')) {
                    try {
                        const [_, __, mode, rid] = customId.split('_');
                        const sec = parseDuration(val);
                        if (!sec) return interaction.editReply('❌ Format waktu salah.');
                        const rData = db.prepare('SELECT * FROM role_aktif WHERE role_id = ?').get(rid);
                        if (rData) {
                            const currentExp = parseInt(rData.expires_at, 10);
                            if (isNaN(currentExp)) throw new Error('DB_EXPIRY_CORRUPTED');

                            const newExp = mode === 'add' ? currentExp + sec : currentExp - sec;
                            db.prepare('UPDATE role_aktif SET expires_at = ? WHERE role_id = ?').run(newExp, rid);

                            await interaction.editReply(`✅ Waktu update. Baru: <t:${newExp}:F>`);
                            sendLog(client, guild.id, 'Admin Edit Waktu', `Admin: ${user}\nRole ID: ${rid}\nAksi: ${mode} ${val}`, 'Orange');
                            if (mode === 'add') sendDM(client, rData.user_id, `⏳ **Durasi Ditambah**\nAdmin menambah waktu role kamu sebesar ${val}.`);
                        } else {
                            await interaction.editReply('❌ Data role tidak ditemukan.');
                        }
                        return;
                    } catch (e) {
                        console.error('[TIME ADMIN CRASHED]', e);
                        return interaction.editReply(`❌ ERROR: ${e.message}`);
                    }
                }

                // Stock & Date Submits... (Same as before)
                else if (customId.startsWith('mod_stk_quota_')) {
                    const j = customId.replace('mod_stk_quota_', '');
                    db.prepare('UPDATE ticket_stock SET max_stock = ? WHERE jenis_tiket = ?').run(parseInt(val) || 0, j);
                    await updateLiveReport(client);
                    await interaction.editReply('✅ Kuota update.');
                    return;
                }
                else if (customId.startsWith('mod_stk_price_')) {
                    const j = customId.replace('mod_stk_price_', '');
                    const label = interaction.fields.getTextInputValue('label');
                    const num = parseInt(val) || 0;
                    const old = db.prepare('SELECT price_value FROM ticket_stock WHERE jenis_tiket = ?').get(j);
                    db.prepare('UPDATE ticket_stock SET price_text = ?, price_value = ?, last_price_value = ? WHERE jenis_tiket = ?').run(label, num, old.price_value, j);
                    await updateLiveReport(client);
                    await interaction.editReply('✅ Harga update.');
                    return;
                }
                else if (customId === 'mod_stk_date') {
                    db.prepare('UPDATE ticket_stock SET restock_date = ?').run(val);
                    await updateLiveReport(client);
                    await interaction.editReply(`✅ Tanggal update.`);
                    return;
                }
            }

        } catch (error) {
            console.error('[Admin Handler Error]', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `❌ Error Fatal: ${error.message}`, flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }
        }
    }
};