const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-luck')
        .setDescription('Set penalti keberuntungan user (Manual Target).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target User')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('value')
                .setDescription('Nilai Penalti (Contoh: -50 untuk kurangi 50% luck)')
                .setRequired(true)),
    async execute(interaction) {
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin admin.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const value = interaction.options.getInteger('value');

        const success = db.setPenalty(targetUser.id, value);

        if (success) {
            return interaction.reply({ content: `✅ Berhasil set penalti luck untuk **${targetUser.tag}** sebesar **${value}%**.` });
        } else {
            return interaction.reply({ content: '❌ Gagal set penalti (Database Error).', ephemeral: true });
        }
    }
};
