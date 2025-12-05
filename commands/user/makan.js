const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');
const { MENU_KANTIN, handleEat } = require('../../handlers/kantinHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('makan')
        .setDescription('Makan makanan dari tas kamu untuk dapat buff!'),

    async execute(interaction) {
        const userId = interaction.user.id;

        // 1. AMBIL INVENTARIS MAKANAN & ROKOK
        const inventory = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jumlah > 0').all(userId);

        // Filter item yang ada di MENU_KANTIN atau MENU_WARUNG
        const { MENU_WARUNG } = require('../../handlers/warungHandler.js');

        const foodItems = inventory.filter(item => MENU_KANTIN[item.jenis_tiket] || MENU_WARUNG[item.jenis_tiket]);

        if (foodItems.length === 0) {
            return interaction.reply({
                content: '❌ **Tas kamu kosong!** (Gak ada makanan/rokok)\nBeli dulu di `/kantin` atau `/warung`.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        // 2. BUAT MENU PILIHAN
        const options = foodItems.map(item => {
            let menu = MENU_KANTIN[item.jenis_tiket];
            if (!menu) menu = MENU_WARUNG[item.jenis_tiket];

            return {
                label: `${menu.label} (${item.jumlah})`,
                description: menu.desc.substring(0, 50), // Truncate desc if too long
                value: item.jenis_tiket,
                emoji: menu.emoji
            };
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('makan_menu')
                    .setPlaceholder('Pilih makanan yang mau dimakan...')
                    .addOptions(options)
            );

        await interaction.reply({ content: '🍽️ **Mau makan apa?**', components: [row], flags: [MessageFlags.Ephemeral] });
    }
};
