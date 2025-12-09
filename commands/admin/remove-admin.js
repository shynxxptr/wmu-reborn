const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-admin')
        .setDescription('Menghapus user dari Admin Bot.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan dihapus dari admin')
                .setRequired(true)),
    async execute(interaction) {
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');

        if (!db.isAdmin(targetUser.id)) {
            return interaction.reply({ content: '⚠️ User tersebut bukan admin.', ephemeral: true });
        }

        // Prevent removing self (optional, but good practice to avoid accidental lockout)
        // But we allow it if they really want to resign

        const success = db.removeAdmin(targetUser.id);
        if (success) {
            return interaction.reply({ content: `✅ Berhasil menghapus **${targetUser.tag}** dari Admin Bot.` });
        } else {
            return interaction.reply({ content: '❌ Gagal menghapus admin (Database Error).', ephemeral: true });
        }
    }
};
