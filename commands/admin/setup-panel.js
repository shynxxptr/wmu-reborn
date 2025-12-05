const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-panel')
        .setDescription('Pasang panel role manager.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
            .setTitle('💎 Role Manager Panel')
            .setDescription(
                'Selamat datang di layanan Custom Role.\n' +
                'Silakan gunakan tombol di bawah untuk mengelola role kamu.\n\n' +
                '**Fitur Tersedia:**\n' +
                '🎨 **Kelola Role** - Buat role baru, Edit, Share, atau Request Gradasi.\n' +
                '👤 **Cek Status** - Lihat Role Aktif & Isi Tas Tiket.\n' +
                '📜 **Rules** - Baca aturan penggunaan role.'
            )
            .setColor('Blurple')
            .setFooter({ text: 'Sistem Otomatis 24/7' });

        const row = new ActionRowBuilder().addComponents(
            // ID: panel_menu_role -> Masuk ke roleHandler.js
            new ButtonBuilder()
                .setCustomId('panel_menu_role')
                .setLabel('Mulai Kelola Role')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎨'),
            
            // ID: panel_cek_status -> Masuk ke userHandler.js
            new ButtonBuilder()
                .setCustomId('panel_cek_status') 
                .setLabel('Cek Status & Tiket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👤'),

            // ID: panel_rules -> Masuk ke interactionCreate.js (Embed Rules)
            new ButtonBuilder()
                .setCustomId('panel_rules')
                .setLabel('Rules')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📜')
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.editReply('✅ Panel berhasil dipasang.');
    }
};