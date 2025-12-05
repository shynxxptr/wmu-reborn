const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const db = require('../database.js');
const { TIKET_CONFIG } = require('../utils/helpers.js');

module.exports = {
    async handleShopInteraction(interaction, client) {
        const { customId, user, guild } = interaction;

        try {
            // --- A. SAAT USER PILIH MENU (BELI) ---
            if (customId === 'shop_buy_menu') {
                // 1. LANGSUNG DEFER (Supaya tidak Interaction Failed)
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

                const jenis = interaction.values[0]; // Jenis tiket yang dipilih

                // --- GACHA HANDLER ---
                if (jenis === 'ticket_box') {
                    return this.handleGacha(interaction, user);
                }

                // 2. Cek Stok di Database
                const stock = db.prepare('SELECT * FROM ticket_stock WHERE jenis_tiket = ?').get(jenis);
                const sisa = stock ? stock.max_stock - stock.sold : 0;

                if (sisa <= 0) {
                    return interaction.editReply('🔴 **Maaf, stok baru saja habis!** Silakan hubungi admin.');
                }

                // 3. Cek Duplikat Channel (Anti-Spam)
                // Cari channel yang topiknya berisi ID User ini
                const existingChannel = guild.channels.cache.find(c => c.name.startsWith('beli-') && c.topic === user.id);

                if (existingChannel) {
                    return interaction.editReply(`⚠️ Kamu sudah punya tiket terbuka! Cek di sini: <#${existingChannel.id}>`);
                }

                // 4. Buat Channel Private
                const ticketName = `beli-${user.username.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}`; // Nama bersih

                let ticketChannel;
                try {
                    ticketChannel = await guild.channels.create({
                        name: ticketName,
                        type: ChannelType.GuildText,
                        parent: '1444702371111374888', // Kategori Transaksi
                        topic: user.id, // Simpan ID user di deskripsi channel (PENTING)
                        permissionOverwrites: [
                            {
                                id: guild.id, // @everyone
                                deny: [PermissionFlagsBits.ViewChannel],
                            },
                            {
                                id: user.id, // Pembeli
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
                            },
                            {
                                id: client.user.id, // Bot
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
                            }
                            // Tips: Tambahkan ID Role Admin disini jika ingin admin otomatis lihat
                        ],
                    });
                } catch (err) {
                    console.error('[Create Ticket Error]', err);
                    return interaction.editReply('❌ **Gagal membuat channel!** Bot mungkin kurang izin `Manage Channels`.');
                }

                // 5. Kirim Instruksi di Channel Baru
                const config = TIKET_CONFIG[jenis];
                const labelBarang = config ? config.label : jenis;

                const embed = new EmbedBuilder()
                    .setTitle(`🍱 Pesanan: ${labelBarang}`)
                    .setDescription(
                        `Halo ${user}! Pesananmu sedang disiapkan Ibu Kantin.\n\n` +
                        `**Detail Jajanan:**\n` +
                        `🎟️ **Menu:** ${labelBarang}\n` +
                        `💰 **Harga:** ${stock.price_text}\n\n` +
                        `**Langkah Selanjutnya:**\n` +
                        `1. Silakan kirim bukti pembayaran di sini ya.\n` +
                        `2. Tunggu sebentar, Admin akan segera memproses tiketmu.\n` +
                        `3. Kalau mau batal, klik tombol di bawah.`
                    )
                    .setColor('Orange')
                    .setFooter({ text: 'Terima kasih sudah jajan!' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_close_shop')
                        .setLabel('Tutup Tiket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

                await ticketChannel.send({ content: `Halo ${user}, Admin akan segera melayani Anda.`, embeds: [embed], components: [row] });

                // 6. Konfirmasi Sukses di Menu Awal
                await interaction.editReply(`✅ **Tiket Dibuat!** Silakan lanjutkan transaksi di ${ticketChannel}`);
            }

            // --- B. TOMBOL TUTUP TIKET ---
            if (customId === 'btn_close_shop') {
                // Langsung reply agar tombol tidak loading terus
                await interaction.reply('🔒 Tiket akan dihapus dalam 5 detik...');

                const channelId = interaction.channelId;
                setTimeout(async () => {
                    // Fetch ulang channel untuk memastikan masih ada sebelum delete
                    const ch = guild.channels.cache.get(channelId);
                    if (ch) await ch.delete().catch(() => { });
                }, 5000);
            }

        } catch (error) {
            console.error('[Shop Handler Error]', error);
            // Safety reply jika error fatal
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '❌ **Terjadi kesalahan pada sistem.** Silakan coba lagi nanti.' }).catch(() => { });
            } else {
                await interaction.reply({ content: '❌ **Terjadi kesalahan pada sistem.**', flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }
        }
    },

    async handleGacha(interaction, user) {
        // 1. Cek Uang
        const price = 15000;
        const userData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(user.id);
        const uangUser = userData ? userData.uang_jajan : 0;

        if (uangUser < price) {
            return interaction.editReply(`💸 **Uang Kurang!**\nButuh: Rp ${price.toLocaleString('id-ID')}\nUangmu: Rp ${uangUser.toLocaleString('id-ID')}`);
        }

        // 2. Potong Uang
        db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(price, user.id);

        // 3. Gacha Logic (RNG)
        const roll = Math.random() * 100; // 0 - 100
        let reward = null;
        let type = 'zonk'; // zonk, money, ticket

        // Loot Table:
        // 1% Jackpot (30d) -> 0 - 1
        // 5% Rare (7d) -> 1 - 6
        // 15% Uncommon (3d) -> 6 - 21
        // 45% Common (1d) -> 21 - 66
        // 34% Zonk -> 66 - 100

        if (roll < 1) {
            reward = { label: '🔥 JACKPOT: Tiket 30 Hari', item: '30d', type: 'ticket' };
        } else if (roll < 6) {
            reward = { label: '✨ Rare: Tiket 7 Hari', item: '7d', type: 'ticket' };
        } else if (roll < 21) {
            reward = { label: '🎫 Uncommon: Tiket 3 Hari', item: '3d', type: 'ticket' };
        } else if (roll < 66) {
            reward = { label: '🎫 Common: Tiket 1 Hari', item: '1d', type: 'ticket' };
        } else {
            // Zonk / Trash
            type = 'zonk';
        }

        // 4. Process Reward
        const embed = new EmbedBuilder().setTitle('📦 Ticket Box Gacha').setTimestamp();

        if (type === 'zonk') {
            embed.setColor('Red')
                .setDescription('💩 **ZONK!** Isinya cuma angin dan penyesalan.')
                .setFooter({ text: `Sisa Uang: Rp ${(uangUser - price).toLocaleString('id-ID')}` });
        } else if (reward.type === 'ticket') {
            // Add to Inventory
            db.prepare(`
                INSERT INTO inventaris (user_id, jenis_tiket, jumlah) VALUES (?, ?, 1)
                ON CONFLICT(user_id, jenis_tiket) DO UPDATE SET jumlah = jumlah + 1
            `).run(user.id, reward.item);

            embed.setColor('Gold')
                .setDescription(`🎉 **SELAMAT!** Kamu mendapatkan:\n# ${reward.label}\n\nItem sudah masuk ke inventory (/tas).`)
                .setFooter({ text: `Sisa Uang: Rp ${(uangUser - price).toLocaleString('id-ID')}` });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};