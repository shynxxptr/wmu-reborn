const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');

module.exports = {
    async sendReturnAnnouncement(channel) {
        const embed = new EmbedBuilder()
            .setTitle('🎉 **WARUNG MANG UJANG : REBORN!** 🎉')
            .setDescription('**Selamat datang kembali!** Bot sudah kembali dengan fitur-fitur baru dan perbaikan!')
            .setColor('#00FF00')
            .setThumbnail(channel.client?.user?.displayAvatarURL() || null)
            .addFields(
                {
                    name: '🔄 **APA YANG BERUBAH?**',
                    value: 
                        '• **Database Reset** - Semua data di-reset untuk fresh start\n' +
                        '• **Sistem Pajak Dihapus** - Game sekarang bebas pajak 100%!\n' +
                        '• **Wealth Limiter Extended** - Support player sampai 10 Triliun\n' +
                        '• **Visual Enhancements** - Semua game dengan visual yang lebih menarik\n' +
                        '• **Compensation System** - Kompensasi untuk semua player setia',
                    inline: false
                },
                {
                    name: '✨ **FITUR BARU**',
                    value:
                        '• 💎 **Luxury Items Shop** - Beli buffs premium\n' +
                        '• 🏫 **Geng System** - Buat geng sekolah dengan teman\n' +
                        '• 🏆 **Achievement System** - Dapat reward fantastis\n' +
                        '• 📊 **Statistics Tracking** - Track combo, streak, win rate\n' +
                        '• 🎯 **Daily Challenges** - Challenge harian dengan rewards\n' +
                        '• 🏦 **Banking System** - Simpan uang dengan bunga 0.5%/hari',
                    inline: false
                },
                {
                    name: '💰 **KOMPENSASI DATABASE RESET**',
                    value:
                        '**Semua player yang main akan dapat:**\n' +
                        '• 🏦 **100 Juta di Bank** (withdraw limit 10M/hari)\n' +
                        '• 💰 **10 Juta di Saldo Utama** (starter pack)\n' +
                        '• 🎁 **Total: 110 Juta**\n\n' +
                        '**Cara Ambil Kompensasi:**\n' +
                        '1. Ketik `!claimcompensation`\n' +
                        '2. Kompensasi akan langsung masuk ke akunmu\n' +
                        '3. Uang di bank bisa di-withdraw maksimal 10M per hari\n' +
                        '4. Gunakan `!bank withdraw 10m` untuk ambil uang',
                    inline: false
                },
                {
                    name: '⚠️ **PENTING - WITHDRAW LIMIT**',
                    value:
                        '• Limit withdraw dari bank: **10 Juta per hari**\n' +
                        '• Limit akan reset setiap hari\n' +
                        '• Bunga bank: **0.5% per hari** (max 1M deposit)\n' +
                        '• Uang di bank **TIDAK terkena wealth limiter**',
                    inline: false
                },
                {
                    name: '🎮 **GAME YANG TERSEDIA**',
                    value:
                        '• 🪙 `!cf <bet>` - Coinflip (dengan streak system)\n' +
                        '• 🎰 `!slots <bet>` - Slots (dengan timing mechanic)\n' +
                        '• 📈 `!saham <bet>` - Crash (dengan warning system)\n' +
                        '• 💣 `!bom <bet>` - Minesweeper (dengan combo system)\n' +
                        '• 🧮 `!math <bet>` - Math Game (dengan difficulty scaling)\n' +
                        '• 🎰 `!bigslot <bet>` - BigSlot (5x6 grid)\n' +
                        '• 🃏 `!bj <bet>` - Blackjack',
                    inline: false
                },
                {
                    name: '📚 **COMMANDS PENTING**',
                    value:
                        '• `!help` - Lihat semua commands\n' +
                        '• `!claimcompensation` - Ambil kompensasi\n' +
                        '• `!bank` - Cek saldo bank\n' +
                        '• `!pencapaian` - Lihat statistics & achievements\n' +
                        '• `!luxury` - Toko luxury items\n' +
                        '• `!geng create <nama>` - Buat geng',
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Warung Mang Ujang : Reborn Bot • Terima kasih sudah setia! 🎉',
                iconURL: channel.client?.user?.displayAvatarURL() || null
            })
            .setTimestamp()
            .setAuthor({
                name: 'Warung Mang Ujang : Reborn',
                iconURL: channel.client?.user?.displayAvatarURL() || null
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('announce_claim_compensation')
                    .setLabel('Ambil Kompensasi')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('announce_help')
                    .setLabel('Lihat Help')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('announce_bank')
                    .setLabel('Cek Bank')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏦')
            );

        return { embeds: [embed], components: [row] };
    },

    async sendSimpleAnnouncement(channel) {
        // Versi lebih simple tanpa buttons
        const embed = new EmbedBuilder()
            .setTitle('🎉 **WARUNG MANG UJANG : REBORN!** 🎉')
            .setDescription('**Selamat datang kembali!** Bot sudah kembali dengan fitur-fitur baru!')
            .setColor('#00FF00')
            .addFields(
                {
                    name: '💰 **KOMPENSASI DATABASE RESET**',
                    value:
                        '**Semua player dapat:**\n' +
                        '🏦 **100 Juta di Bank** (withdraw limit 10M/hari)\n' +
                        '💰 **10 Juta di Saldo Utama**\n' +
                        '🎁 **Total: 110 Juta**\n\n' +
                        '**Cara Ambil:** Ketik `!claimcompensation`',
                    inline: false
                },
                {
                    name: '🔄 **PERUBAHAN PENTING**',
                    value:
                        '✅ Sistem pajak dihapus - Game bebas pajak!\n' +
                        '✅ Visual semua game ditingkatkan\n' +
                        '✅ Fitur baru: Luxury Items, Geng, Achievements\n' +
                        '✅ Banking system dengan bunga 0.5%/hari',
                    inline: false
                },
                {
                    name: '📚 **COMMANDS**',
                    value:
                        '`!help` - Lihat semua commands\n' +
                        '`!claimcompensation` - Ambil kompensasi\n' +
                        '`!bank` - Banking system\n' +
                        '`!pencapaian` - Statistics & achievements',
                    inline: false
                }
            )
            .setFooter({ text: 'Warung Mang Ujang : Reborn Bot • Terima kasih sudah setia! 🎉' })
            .setTimestamp();

        return { embeds: [embed] };
    }
};

