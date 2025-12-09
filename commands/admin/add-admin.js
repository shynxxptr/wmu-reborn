const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-admin')
        .setDescription('Menambahkan user sebagai Admin Bot.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan dijadikan admin')
                .setRequired(true)),
    async execute(interaction) {
        // Check if executor is admin or guild owner
        const isBotAdmin = db.isAdmin(interaction.user.id);
        const isGuildOwner = interaction.user.id === interaction.guild.ownerId;

        if (!isBotAdmin && !isGuildOwner) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');

        if (db.isAdmin(targetUser.id)) {
            return interaction.reply({ content: '⚠️ User tersebut sudah menjadi admin.', ephemeral: true });
        }

        const success = db.addAdmin(targetUser.id, interaction.user.tag);
        if (success) {
            return interaction.reply({ content: `✅ Berhasil menambahkan **${targetUser.tag}** sebagai Admin Bot.` });
        } else {
            return interaction.reply({ content: '❌ Gagal menambahkan admin (Database Error).', ephemeral: true });
        }
    }
};
