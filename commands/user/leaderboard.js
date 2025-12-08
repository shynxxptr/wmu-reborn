const { SlashCommandBuilder } = require('discord.js');
const leaderboardHandler = require('../../handlers/leaderboardHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Lihat 100 orang paling kaya di Warung Mang Ujang!'),

    async execute(interaction, client, db) {
        await interaction.deferReply();
        await leaderboardHandler.showLeaderboard(interaction, db);
    }
};
