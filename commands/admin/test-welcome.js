const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-welcome')
        .setDescription('Simulasi member baru masuk (Test Welcome Message).'),

    async execute(interaction, client) {
        const db = require('../../database.js');
        if (!db.isAdmin(interaction.user.id)) {
            return interaction.reply({ content: '❌ Kamu tidak memiliki izin admin.', ephemeral: true });
        }
        // 1. Balas dulu biar admin tau command jalan
        await interaction.reply({
            content: '🔄 Menjalankan simulasi welcome...',
            flags: [MessageFlags.Ephemeral]
        });

        try {
            // 2. Ambil Event Handler 'guildMemberAdd' secara manual
            // Kita cari file event yang sudah kita load di index.js
            // Tapi karena sulit akses file event langsung dari sini, kita panggil manual saja logic-nya
            // Cara paling gampang: Emit event palsu ke Client

            // Member palsu = diri sendiri (Admin yang ngetik command)
            const fakeMember = interaction.member;

            // 3. Picu Event 'guildMemberAdd' secara paksa
            client.emit('guildMemberAdd', fakeMember);

            await interaction.editReply('✅ Simulasi berhasil dikirim ke channel welcome!');

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Gagal menjalankan simulasi.');
        }
    }
};