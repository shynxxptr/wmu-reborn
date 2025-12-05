const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');
const { TIKET_CONFIG } = require('../utils/helpers.js');
const { stockChannelId } = require('../config.json');

module.exports = {
    async handleCekStatus(interaction, db) {
        // PERHATIKAN: DEFERRAL SUDAH DIAMBIL ALIH OLEH events/interactionCreate.js

        try {
            const userId = interaction.user.id;
            const roles = db.prepare('SELECT * FROM role_aktif WHERE user_id = ?').all(userId);
            const inventory = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jumlah > 0').all(userId);

            const embed = new EmbedBuilder()
                .setTitle(`👤 Dashboard: ${interaction.user.username}`)
                .setColor('Blue')
                .setThumbnail(interaction.user.displayAvatarURL());

            // A. ROLE AKTIF
            let roleListText = '';
            if (roles.length === 0) {
                roleListText = '*Belum memiliki role kustom.*';
            } else {
                roles.forEach((r, index) => {
                    const roleObj = interaction.guild.roles.cache.get(r.role_id);
                    const roleName = roleObj ? roleObj.name : '⚠️ Role Terhapus';
                    const roleColor = roleObj ? roleObj.hexColor : '#000000';
                    roleListText += `**${index + 1}. ${roleName}**\n   🎨 \`${roleColor}\` | ⏳ Hangus: <t:${r.expires_at}:R>\n`;
                });
            }
            embed.addFields({ name: `🔥 Role Aktif (${roles.length}/3 Slot)`, value: roleListText });

            // B. ISI TAS
            let invListText = '';
            if (inventory.length === 0) invListText = '*Tas kosong.*';
            else {
                const { MENU_KANTIN } = require('./kantinHandler.js');
                inventory.forEach(item => {
                    let label = item.jenis_tiket;

                    if (TIKET_CONFIG[item.jenis_tiket]) {
                        label = TIKET_CONFIG[item.jenis_tiket].label;
                    } else if (MENU_KANTIN[item.jenis_tiket]) {
                        label = `${MENU_KANTIN[item.jenis_tiket].emoji} ${MENU_KANTIN[item.jenis_tiket].label}`;
                    }

                    invListText += `• **${label}**: ${item.jumlah} buah\n`;
                });
            }
            embed.addFields({ name: '🎒 Tas Tiket', value: invListText });

            // C. LINK PASAR
            if (stockChannelId) {
                embed.addFields({ name: '📈 Info Pasar', value: `Cek stok live di <#${stockChannelId}>` });
            }

            embed.setFooter({ text: 'Gunakan tombol "Kelola Role" untuk memakai tiket.' });

            // LAKUKAN EDIT REPLY (Karena sudah di-defer di router)
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[User Handler Error]', error);
            // Gunakan editReply di catch block juga
            await interaction.editReply({ content: 'Terjadi kesalahan saat memuat data.' });
        }
    }
};