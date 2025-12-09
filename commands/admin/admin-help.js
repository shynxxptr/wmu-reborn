const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-help')
        .setDescription('Menampilkan daftar command khusus Admin.'),
    async execute(interaction) {
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin admin.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Admin Command List')
            .setColor('#FF0000')
            .setDescription('Berikut adalah daftar command yang hanya bisa diakses oleh Admin Bot:')
            .addFields(
                { name: '👤 User Management', value: '`/add-admin` - Tambah admin baru\n`/remove-admin` - Hapus admin\n`/list-admins` - Lihat daftar admin' },
                { name: '🔧 Game & Economy', value: '`/set-luck` - Set penalti luck user\n`/config-penalty` - Atur batas auto-penalty\n`/admin-panel` - Panel stok & role' },
                { name: '📦 Inventory & Sales', value: '`/give-ticket` - Kirim tiket ke user\n`/check-all` - Cek seluruh inventaris user\n`/create-flashsale` - Buat flash sale' },
                { name: '⚙️ System', value: '`/test-welcome` - Simulasi welcome message' }
            )
            .setFooter({ text: 'Hanya Admin yang bisa melihat pesan ini.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
};
