const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ChannelType, PermissionFlagsBits 
} = require('discord.js');
const db = require('../database.js');

module.exports = {
    async handleFlashButton(interaction, client) {
        const { customId, user, guild, message } = interaction;

        // --- A. TOMBOL BELI ---
        if (customId === 'btn_flash_buy') {
            await interaction.deferReply({ ephemeral: true });

            // 1. Cek Data Sale dari DB
            const sale = db.prepare('SELECT * FROM flash_sales WHERE message_id = ?').get(message.id);
            
            if (!sale || sale.is_active === 0) {
                return interaction.editReply('❌ Event Flash Sale ini sudah berakhir atau data hilang.');
            }

            // 2. Cek Apakah User Sudah Beli (Anti-Hoarding)
            const buyer = db.prepare('SELECT * FROM flash_buyers WHERE message_id = ? AND user_id = ?').get(message.id, user.id);
            if (buyer) {
                // Cek apakah channelnya masih ada
                const existingChannel = guild.channels.cache.get(buyer.channel_id);
                if (existingChannel) {
                    return interaction.editReply(`⚠️ Kamu sudah punya tiket! Cek di sini: ${existingChannel}`);
                } else {
                    // Kalau channel udah dihapus tapi data masih ada, kita izinkan bikin lagi (opsional, tapi aman begini)
                }
            }

            // 3. Cek Stok (Race Condition Check)
            if (sale.claimed >= sale.max_slots) {
                return interaction.editReply('🔴 **SOLD OUT!** Maaf, kamu terlambat, slot sudah habis.');
            }

            // --- PROSES TRANSAKSI ---
            
            // 4. Update Database (Tambah Claimed)
            db.prepare('UPDATE flash_sales SET claimed = claimed + 1 WHERE message_id = ?').run(message.id);
            const updatedSale = db.prepare('SELECT * FROM flash_sales WHERE message_id = ?').get(message.id);

            // 5. Update Tampilan Embed (Sisa Slot Berkurang)
            const oldEmbed = EmbedBuilder.from(message.embeds[0]);
            const sisa = updatedSale.max_slots - updatedSale.claimed;
            
            oldEmbed.setFooter({ text: `Sisa Slot: ${sisa}/${updatedSale.max_slots}` });
            
            // Jika habis, ubah warna dan matikan tombol
            let rows = message.components;
            if (sisa <= 0) {
                oldEmbed.setColor('Grey');
                oldEmbed.setTitle(`[SOLD OUT] ${sale.item_name}`);
                
                const disabledBtn = ButtonBuilder.from(message.components[0].components[0]).setDisabled(true).setLabel('HABIS TERJUAL');
                rows = [new ActionRowBuilder().addComponents(disabledBtn)];
            }
            
            await message.edit({ embeds: [oldEmbed], components: rows });

            // 6. BUAT CHANNEL TICKET (TEMPORARY)
            const ticketOptions = {
                name: `ticket-${user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel], // Gak bisa liat
                    },
                    {
                        id: user.id, // Buyer
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], // Bisa liat & chat
                    },
                    {
                        id: client.user.id, // Bot
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                    }
                    // Tambahkan Role Admin disini jika perlu
                ],
            };
            
            // Add parent category if configured
            if (TICKET_CATEGORY_ID) {
                ticketOptions.parent = TICKET_CATEGORY_ID;
            }
            
            const ticketChannel = await guild.channels.create(ticketOptions);

            // 7. Simpan data Buyer
            db.prepare('INSERT OR REPLACE INTO flash_buyers (message_id, user_id, channel_id) VALUES (?, ?, ?)').run(message.id, user.id, ticketChannel.id);

            // 8. Kirim Pesan di Channel Baru
            const ticketEmbed = new EmbedBuilder()
                .setTitle(`🛒 Transaksi: ${sale.item_name}`)
                .setDescription(
                    `Halo ${user}! Kamu berhasil mengamankan slot.\n` +
                    `**Item:** ${sale.item_name}\n` +
                    `**Harga:** ${sale.price}\n\n` +
                    `Silakan lakukan pembayaran atau tunggu instruksi Admin di sini.\n` +
                    `Klik tombol di bawah jika transaksi selesai/batal.`
                )
                .setColor('Green');

            const closeBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_close_ticket').setLabel('Tutup Ticket').setStyle(ButtonStyle.Secondary).setEmoji('🔒')
            );

            await ticketChannel.send({ content: `${user}`, embeds: [ticketEmbed], components: [closeBtn] });

            return interaction.editReply(`✅ Berhasil! Lanjut ke channel tiket kamu: ${ticketChannel}`);
        }

        // --- B. TOMBOL TUTUP TICKET ---
        if (customId === 'btn_close_ticket') {
            await interaction.reply('🔒 Channel akan dihapus dalam 5 detik...');
            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 5000);
        }
    }
};