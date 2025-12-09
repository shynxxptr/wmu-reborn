const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database.js');
const { TIKET_CONFIG } = require('../../utils/helpers.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-check-inventory')
        .setDescription('Audit: Lihat semua tiket yang beredar.'),

    async execute(interaction) {
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin admin.', ephemeral: true });
        }
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Ambil semua data inventaris yang > 0
        const allItems = db.prepare('SELECT * FROM inventaris WHERE jumlah > 0 ORDER BY jenis_tiket').all();

        if (allItems.length === 0) return interaction.editReply('Gudang kosong. Belum ada user punya tiket.');

        // Group by Ticket Type
        let report = {};
        for (const item of allItems) {
            if (!report[item.jenis_tiket]) report[item.jenis_tiket] = [];
            report[item.jenis_tiket].push(`<@${item.user_id}>: **${item.jumlah}**`);
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Laporan Inventaris Global')
            .setColor('Gold')
            .setTimestamp();

        // Limit display biar ga error message too long (Basic pagination logic or slice)
        for (const [type, holders] of Object.entries(report)) {
            const label = TIKET_CONFIG[type]?.label || type;
            // Tampilkan max 10 holder per tiket biar ga spam
            const displayList = holders.slice(0, 10).join('\n');
            const sisa = holders.length > 10 ? `\n...dan ${holders.length - 10} lainnya.` : '';

            embed.addFields({
                name: `${label} (Total User: ${holders.length})`,
                value: displayList + sisa || 'N/A'
            });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};