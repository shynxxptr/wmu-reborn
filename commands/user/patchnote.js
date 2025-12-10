const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('patchnote')
        .setDescription('Melihat catatan update (changelog) bot.'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const changelogPath = path.join(__dirname, '../../CHANGELOG.md');

            if (!fs.existsSync(changelogPath)) {
                return interaction.editReply('❌ **File Changelog tidak ditemukan!**');
            }

            const content = fs.readFileSync(changelogPath, 'utf8');

            // Simple parser to get the latest version
            // Assumes format: ## [Version] - Date
            const versions = content.split('## [');

            // versions[0] is header, versions[1] is latest
            if (versions.length < 2) {
                return interaction.editReply('❌ **Format Changelog tidak valid!**');
            }

            const latestRaw = versions[1];
            const endOfLine = latestRaw.indexOf('\n');
            const versionTitle = latestRaw.substring(0, endOfLine).replace(']', ''); // "1.0.0 - 2025-12-10"
            const versionBody = latestRaw.substring(endOfLine).trim();

            const embed = new EmbedBuilder()
                .setTitle(`📜 Patch Notes: v${versionTitle}`)
                .setColor('#00FF00')
                .setDescription(versionBody)
                .setFooter({ text: 'Mang Ujang Bot Updates' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[Patchnote Error]', error);
            await interaction.editReply('❌ Terjadi kesalahan saat membaca patchnote.');
        }
    }
};
