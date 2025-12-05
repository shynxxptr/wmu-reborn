const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { MENU_WARUNG } = require('../../handlers/warungHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warung')
        .setDescription('Buka warung rahasia (Sstt... jangan bilang guru).'),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
            .setTitle('🏚️ WARUNG RAHASIA')
            .setDescription('Mau cari apa, dek? Jangan berisik ya, nanti ketahuan guru BK.')
            .setColor('#2F3136')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1086/1086581.png'); // Cigarette Icon

        const options = Object.keys(MENU_WARUNG).map(key => ({
            label: MENU_WARUNG[key].label,
            description: MENU_WARUNG[key].desc,
            value: key,
            emoji: MENU_WARUNG[key].emoji
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('warung_menu')
                    .setPlaceholder('Pilih rokok...')
                    .addOptions(options)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};
