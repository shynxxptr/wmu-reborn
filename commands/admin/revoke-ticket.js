const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../../database.js');
const { TIKET_CONFIG } = require('../../utils/helpers.js');

const choices = Object.keys(TIKET_CONFIG).map(k => ({ name: TIKET_CONFIG[k].label, value: k }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('revoke-ticket') // <--- Pastikan namanya ini
        .setDescription('Tarik kembali (hapus) tiket dari user.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
        .addStringOption(o => o.setName('jenis').setDescription('Tipe Tiket').setRequired(true).addChoices(...choices))
        .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah yang ditarik').setMinValue(1)),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const user = interaction.options.getUser('user');
        const jenis = interaction.options.getString('jenis');
        const qty = interaction.options.getInteger('jumlah') || 1;

        const current = db.prepare('SELECT jumlah FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, jenis);
        
        if (!current || current.jumlah < qty) {
            return interaction.editReply(`❌ Gagal. User cuma punya **${current ? current.jumlah : 0}** tiket tipe ini.`);
        }

        db.prepare('UPDATE inventaris SET jumlah = jumlah - ? WHERE user_id = ? AND jenis_tiket = ?').run(qty, user.id, jenis);
        
        await interaction.editReply(`✅ Berhasil menarik **${qty}x ${TIKET_CONFIG[jenis].label}** dari ${user.username}.`);
    }
};