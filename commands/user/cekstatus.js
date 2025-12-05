const { SlashCommandBuilder } = require('discord.js');
const userHandler = require('../../handlers/userHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekstatus')
        .setDescription('Cek status profil, role, dan survival stats kamu.'),

    async execute(interaction, client, db) {
        // Re-use logic from userHandler
        // Note: userHandler.handleCekStatus handles the reply/defer logic internally?
        // Let's check userHandler again. It expects (interaction, db).
        // It uses editReply, so we should defer first if not already deferred.
        // But wait, interactionCreate.js defers it for buttons.
        // For slash command, we should defer here.

        await interaction.deferReply();
        await userHandler.handleCekStatus(interaction, db);
    }
};
