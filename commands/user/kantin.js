const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { MENU_KANTIN } = require('../../handlers/kantinHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kantin')
        .setDescription('Buka menu kantin sekolah (Just for fun!).'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🍽️ MENU KANTIN SEKOLAH')
            .setDescription('Lapar? Haus? Atau butuh asupan kesigmaan?\nPilih menu di bawah ini untuk memesan!')
            .setColor('#FFD700')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1046/1046784.png'); // Ikon Makanan

        const options = Object.keys(MENU_KANTIN).map(key => ({
            label: MENU_KANTIN[key].label,
            description: MENU_KANTIN[key].desc,
            value: key,
            emoji: MENU_KANTIN[key].emoji
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('kantin_menu')
                    .setPlaceholder('Mau pesan apa hari ini?')
                    .addOptions(options)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
