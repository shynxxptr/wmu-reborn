const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../../database.js');
const { TIKET_CONFIG } = require('../../utils/helpers.js');
const { updateLiveReport } = require('../../handlers/adminHandler.js');

// Bikin opsi dropdown otomatis dari config
const choices = Object.keys(TIKET_CONFIG).map(k => ({ name: TIKET_CONFIG[k].label, value: k }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give-ticket')
        .setDescription('Kirim tiket ke user (Mengurangi Stok).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
        .addStringOption(o => o.setName('jenis').setDescription('Tipe Tiket').setRequired(true).addChoices(...choices))
        .addIntegerOption(o => o.setName('jumlah').setDescription('Jml').setMinValue(1)),

    async execute(interaction, client) { // Note: db sudah di-require di atas, tapi param client butuh untuk live report
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        
        const user = interaction.options.getUser('user');
        const jenis = interaction.options.getString('jenis');
        const qty = interaction.options.getInteger('jumlah') || 1;

        if (user.bot) return interaction.editReply('❌ Bot tidak butuh tiket.');

        // 1. Cek Stok di Database
        const stockData = db.prepare('SELECT * FROM ticket_stock WHERE jenis_tiket = ?').get(jenis);
        const sisa = stockData ? stockData.max_stock - stockData.sold : 0;

        if (sisa < qty) {
            return interaction.editReply(`❌ **Gagal!** Stok tidak cukup.\nStok Tersedia: **${sisa}**\nSilakan restock dulu di Admin Panel.`);
        }

        // 2. Transaksi (Kurangi Stok & Tambah Inventaris User)
        const trx = db.transaction(() => {
            // Update Sold Count
            db.prepare('UPDATE ticket_stock SET sold = sold + ? WHERE jenis_tiket = ?').run(qty, jenis);
            
            // Masukkan ke Tas User
            db.prepare(`
                INSERT INTO inventaris (user_id, jenis_tiket, jumlah) VALUES (?, ?, ?)
                ON CONFLICT(user_id, jenis_tiket) DO UPDATE SET jumlah = jumlah + ?
            `).run(user.id, jenis, qty, qty);
        });
        trx();

        // 3. Update Live Report Channel
        await updateLiveReport(client);

        await interaction.editReply(`✅ Berhasil mengirim **${qty}x ${TIKET_CONFIG[jenis].label}** ke ${user}.\n(Stok server berkurang).`);
    }
};