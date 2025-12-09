const {
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits
} = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-flashsale')
        .setDescription('Buka Ticket Box Flash Sale (Limited Slot).')
        .addStringOption(o => o.setName('barang').setDescription('Nama Barang/Tiket').setRequired(true))
        .addStringOption(o => o.setName('harga').setDescription('Harga (Contoh: 50.000 / 100k)').setRequired(true))
        .addIntegerOption(o => o.setName('slot').setDescription('Jumlah Slot Tersedia').setMinValue(1).setRequired(true))
        .addStringOption(o => o.setName('deskripsi').setDescription('Keterangan tambahan').setRequired(false)),

    async execute(interaction) {
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin admin.', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true }); // Balas admin diam-diam

        const item = interaction.options.getString('barang');
        const price = interaction.options.getString('harga');
        const slot = interaction.options.getInteger('slot');
        const desc = interaction.options.getString('deskripsi') || 'Siapa cepat dia dapat!';

        // 1. Buat Embed Public
        const embed = new EmbedBuilder()
            .setTitle(`🔥 FLASH SALE: ${item}`)
            .setDescription(
                `**Harga:** ${price}\n` +
                `**Ketersediaan:** ${slot} Slot\n\n` +
                `📝 *${desc}*\n\n` +
                `👇 **Klik tombol di bawah untuk mengamankan slot kamu!**`
            )
            .setColor('Red')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3600/3600499.png') // Ikon Api/Sale
            .setFooter({ text: `Sisa Slot: ${slot}/${slot}` })
            .setTimestamp();

        // 2. Buat Tombol
        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_flash_buy') // ID Button generik, nanti kita link via database
                .setLabel(`BELI SEKARANG (${price})`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🛒')
        );

        // 3. Kirim ke Channel
        const msg = await interaction.channel.send({ embeds: [embed], components: [btn] });

        // 4. Simpan Data Sale ke Database (Kunci pakai ID Pesan)
        db.prepare(`
            INSERT INTO flash_sales (message_id, item_name, price, max_slots, claimed, is_active) 
            VALUES (?, ?, ?, ?, 0, 1)
        `).run(msg.id, item, price, slot);

        await interaction.editReply('✅ Flash Sale berhasil diposting!');
    }
};