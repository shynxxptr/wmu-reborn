const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');
const kantinHandler = require('../../handlers/kantinHandler.js');
const { MENU_WARUNG } = require('../../handlers/warungHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mabok')
        .setDescription('Minum alkohol bareng teman (Wajib ajak 2 orang!)')
        .addStringOption(option =>
            option.setName('minuman')
                .setDescription('Pilih minuman keras')
                .setRequired(true)
                .addChoices(
                    { name: 'Iceland Vodka (Rp 150k)', value: 'iceland_vodka' },
                    { name: 'Anggur Merah (Rp 120k)', value: 'anggur_merah' },
                    { name: 'Intisari (Rp 100k)', value: 'intisari' }
                ))
        .addUserOption(option =>
            option.setName('teman1')
                .setDescription('Teman minum pertama')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('teman2')
                .setDescription('Teman minum kedua')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.user;
        const itemKey = interaction.options.getString('minuman');
        const teman1 = interaction.options.getUser('teman1');
        const teman2 = interaction.options.getUser('teman2');

        // 1. VALIDASI TEMAN
        // Cek jika teman adalah bot atau diri sendiri
        if (teman1.bot || teman2.bot) {
            return interaction.editReply({ content: '🤖 **Gak asik!** Masak ngajak robot minum? Ajak manusia lah!' });
        }
        if (teman1.id === user.id || teman2.id === user.id) {
            return interaction.editReply({ content: '🪞 **Sad boy?** Minum sendiri di depan cermin? Ajak orang lain dong!' });
        }
        if (teman1.id === teman2.id) {
            return interaction.editReply({ content: '👯 **Orangnya sama!** Ajak 2 orang yang BEDA.' });
        }

        // 2. CEK ITEM & INVENTARIS
        const menu = MENU_WARUNG[itemKey];
        if (!menu) return interaction.editReply({ content: '❌ Minuman tidak valid.' });

        const item = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, itemKey);

        if (!item || item.jumlah <= 0) {
            return interaction.editReply({
                content: `❌ **Gak punya barangnya!**\nKamu gak punya **${menu.label}**. Beli dulu di \`/warung\`.`
            });
        }

        // 3. PROSES KONSUMSI
        // Kita panggil processConsume dari kantinHandler
        // Parameter: interaction, user, itemKey, menu, isWarungItem, currentStock, friendsIds
        const friendsIds = [teman1.id, teman2.id];
        await kantinHandler.processConsume(interaction, user, itemKey, menu, true, item.jumlah, friendsIds);
    }
};
