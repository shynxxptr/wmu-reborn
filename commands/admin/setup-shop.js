const {
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    PermissionFlagsBits, MessageFlags
} = require('discord.js');
const db = require('../../database.js');
const { TIKET_CONFIG } = require('../../utils/helpers.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-shop')
        .setDescription('Pasang Panel Toko (General Sales).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Gunakan try-catch agar bot tidak mati jika ada error tak terduga
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            // 1. Ambil Data Stok
            const stocks = db.prepare('SELECT * FROM ticket_stock').all();

            // 2. Buat Embed Daftar Harga
            const embed = new EmbedBuilder()
                .setTitle('🏪 KANTIN SEKOLAH (24/7)')
                .setDescription(
                    'Halo Sobat Sekolah! Mau jajan tiket role?\n' +
                    'Silakan pilih menu di bawah ini ya!\n\n' +
                    '**Cara Pesan:**\n' +
                    '1️⃣ Pilih Tiket di Menu.\n' +
                    '2️⃣ Tunggu Ibu Kantin buka channel private.\n' +
                    '3️⃣ Bayar & Konfirmasi.'
                )
                .setColor('Orange')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2829/2829818.png') // Ikon Kantin/Makanan
                .setFooter({ text: 'Jajan yang banyak ya!' });

            // 3. Isi Deskripsi Embed dengan Daftar Harga
            const order = ['30d', '10d', '7d', '3d', '1d', 'tiket_gradasi', 'kartu_ubah', 'ticket_box'];
            const options = [];

            order.forEach(jenis => {
                const s = stocks.find(x => x.jenis_tiket === jenis);
                if (s) {
                    const label = TIKET_CONFIG[jenis]?.label || jenis;
                    const sisa = s.max_stock - s.sold;

                    let statusText = "";
                    if (sisa <= 0) statusText = "\n🔴 **HABIS**";

                    // Info di Embed
                    embed.addFields({
                        name: label,
                        value: `🏷️ **${s.price_text}**${statusText}`,
                        inline: true
                    });

                    // Opsi Dropdown (Hanya jika stok ada)
                    if (sisa > 0) {
                        options.push({
                            label: `Beli: ${label}`,
                            description: `Harga: ${s.price_text}`,
                            value: jenis,
                            emoji: '🎫'
                        });
                    }
                }
            });

            // 4. Buat Dropdown
            const row = new ActionRowBuilder();
            if (options.length > 0) {
                row.addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('shop_buy_menu')
                        .setPlaceholder('Pilih tiket yang mau dibeli...')
                        .addOptions(options)
                );
            } else {
                // Jika semua habis
                embed.setColor('Red').setFooter({ text: 'Semua stok habis saat ini.' });
                return interaction.editReply({ embeds: [embed], content: '⚠️ Semua stok habis, menu tidak dibuat.' });
            }

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply('✅ Toko berhasil dipasang!');

        } catch (error) {
            console.error('[Setup Shop Error]', error);
            await interaction.editReply('❌ Terjadi kesalahan sistem saat memasang toko.').catch(() => { });
        }
    }
};