const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');
const { formatMoney } = require('../../utils/helpers.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bansos')
        .setDescription('Bagikan Bansos (Uang Jajan) ke SEMUA user.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Jumlah uang per user')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Pesan/Alasan Bansos')
                .setRequired(false)),
    async execute(interaction) {
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin admin.', ephemeral: true });
        }

        const amount = interaction.options.getInteger('amount');
        const message = interaction.options.getString('message') || 'Bantuan Sosial Mang Ujang';

        if (amount <= 0) {
            return interaction.reply({ content: '❌ Jumlah harus lebih dari 0.', ephemeral: true });
        }

        await interaction.deferReply();

        const result = db.distributeBansos(amount);

        if (result.success) {
            const embed = new EmbedBuilder()
                .setTitle('💸 BANSOS CAIR! 💸')
                .setColor('#00FF00')
                .setDescription(`Sukses membagikan bansos kepada **${result.changes}** warga!`)
                .addFields(
                    { name: '💰 Nominal', value: `Rp ${formatMoney(amount)} / orang`, inline: true },
                    { name: '📝 Pesan', value: message, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({ content: '❌ Gagal membagikan bansos (Database Error).' });
        }
    }
};
