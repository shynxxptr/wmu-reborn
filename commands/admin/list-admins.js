const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-admins')
        .setDescription('Melihat daftar Admin Bot.'),
    async execute(interaction) {
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.', ephemeral: true });
        }

        const admins = db.getAdmins();

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Daftar Admin Bot')
            .setColor('#FF0000')
            .setTimestamp();

        if (admins.length === 0) {
            embed.setDescription('Belum ada admin yang terdaftar.');
        } else {
            const list = admins.map((a, index) => {
                return `${index + 1}. <@${a.user_id}> (Added by: ${a.added_by})`;
            }).join('\n');
            embed.setDescription(list);
        }

        return interaction.reply({ embeds: [embed] });
    }
};
