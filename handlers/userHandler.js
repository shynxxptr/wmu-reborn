const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');
const { TIKET_CONFIG } = require('../utils/helpers.js');
const { stockChannelId } = require('../config.json');

module.exports = {
    async handleCekStatus(interaction, db) {
        // PERHATIKAN: DEFERRAL SUDAH DIAMBIL ALIH OLEH events/interactionCreate.js

        try {
            const userId = interaction.user.id;
            const { formatMoney } = require('../utils/helpers.js');

            // Fetch User Data
            let user = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
            if (!user) {
                db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(userId);
                user = { user_id: userId, uang_jajan: 0, coin_ujang: 0, last_work_count: 0, hunger: 0, thirst: 0, stress: 0 };
            }

            // Helper for Progress Bar
            const createProgressBar = (value, max = 100) => {
                const totalBars = 10;
                const filledBars = Math.round((value / max) * totalBars);
                const emptyBars = totalBars - filledBars;
                const filled = '🟩'.repeat(filledBars);
                const empty = '⬜'.repeat(emptyBars);
                return `${filled}${empty} (${value}%)`;
            };

            const embed = new EmbedBuilder()
                .setTitle(`📊 Status Karakter: ${interaction.user.username}`)
                .setColor('#00AAFF')
                .setThumbnail(interaction.user.displayAvatarURL());

            // A. KONDISI FISIK
            const hungerBar = createProgressBar(user.hunger || 0);
            const thirstBar = createProgressBar(user.thirst || 0);
            const stressBar = createProgressBar(user.stress || 0);

            embed.addFields({
                name: '🏥 Kondisi Fisik',
                value:
                    `🍖 **Lapar**: ${hungerBar}\n` +
                    `💧 **Haus**: ${thirstBar}\n` +
                    `🤯 **Stress**: ${stressBar}\n` +
                    `*Tips: Makan/Minum di Kantin jika stat > 80%!*`
            });

            // B. EKONOMI
            embed.addFields({
                name: '💰 Keuangan',
                value:
                    `💵 **Uang Jajan**: Rp ${formatMoney(user.uang_jajan)}\n` +
                    `🪙 **Coin Ujang**: ${user.coin_ujang || 0} Coin`
            });

            // C. ENERGI KERJA
            const MAX_JOBS = 5;
            const remainingJobs = MAX_JOBS - (user.last_work_count || 0);
            embed.addFields({
                name: '⚡ Energi Kerja',
                value: `Sisa Jatah Kerja: **${remainingJobs}/${MAX_JOBS}** jam ini.`
            });

            embed.setFooter({ text: 'Gunakan /kantin untuk memulihkan kondisi.' });

            // LAKUKAN EDIT REPLY (Karena sudah di-defer di router)
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[User Handler Error]', error);
            // Gunakan editReply di catch block juga
            await interaction.editReply({ content: 'Terjadi kesalahan saat memuat data.' });
        }
    }
};