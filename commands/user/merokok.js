const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');
const { handleEat } = require('../../handlers/kantinHandler.js');
const { MENU_WARUNG } = require('../../handlers/warungHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('merokok')
        .setDescription('Sebats dulu gan... (Kurangi Stress)'),

    async execute(interaction) {
        const userId = interaction.user.id;

        // 1. AMBIL INVENTARIS ROKOK
        const inventory = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jumlah > 0').all(userId);

        // Filter item yang ada di MENU_WARUNG dan tipe 'rokok'
        const rokokItems = inventory.filter(item => MENU_WARUNG[item.jenis_tiket] && MENU_WARUNG[item.jenis_tiket].type === 'rokok');

        if (rokokItems.length === 0) {
            return interaction.reply({
                content: '❌ **Gak punya rokok!**\nBeli dulu di `/warung`.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        // 2. BUAT MENU PILIHAN
        const options = rokokItems.map(item => {
            const menu = MENU_WARUNG[item.jenis_tiket];
            return {
                label: `${menu.label} (${item.jumlah})`,
                description: menu.desc.substring(0, 50),
                value: item.jenis_tiket,
                emoji: menu.emoji
            };
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('makan_menu') // Reuse handler makan_menu karena logicnya sama (handleEat)
                    .setPlaceholder('Pilih rokok...')
                    .addOptions(options)
            );

        await interaction.reply({ content: '🚬 **Mau sebat apa?**', components: [row], flags: [MessageFlags.Ephemeral] });
    }
};
