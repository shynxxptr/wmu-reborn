const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database.js');
const { formatMoney } = require('../../utils/helpers.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config-penalty')
        .setDescription('Atur batas saldo untuk penalti otomatis.')
        .addStringOption(option =>
            option.setName('threshold')
                .setDescription('Batas Saldo (Contoh: 1m, 100jt, 1000000)')
                .setRequired(true)),
    async execute(interaction) {
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin admin.', ephemeral: true });
        }

        const rawThreshold = interaction.options.getString('threshold');
        let threshold = 0;
        const lower = rawThreshold.toLowerCase();

        if (lower.endsWith('k')) threshold = parseFloat(lower) * 1000;
        else if (lower.endsWith('m') || lower.endsWith('jt')) threshold = parseFloat(lower) * 1000000;
        else if (lower.endsWith('b') || lower.endsWith('milyar')) threshold = parseFloat(lower) * 1000000000;
        else threshold = parseInt(rawThreshold);

        if (isNaN(threshold) || threshold <= 0) {
            return interaction.reply({ content: '❌ Format angka tidak valid.', ephemeral: true });
        }

        const success = db.setSystemVar('auto_penalty_threshold', threshold);

        if (success) {
            return interaction.reply({ content: `✅ Batas penalti otomatis diubah menjadi **Rp ${formatMoney(threshold)}**.` });
        } else {
            return interaction.reply({ content: '❌ Gagal update config (Database Error).', ephemeral: true });
        }
    }
};
