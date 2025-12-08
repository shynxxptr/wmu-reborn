const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Canvas = require('canvas');

async function showLeaderboard(source, db) {
    // Determine if source is Interaction or Message
    const isInteraction = source.commandName !== undefined;
    const user = isInteraction ? source.user : source.author;
    const channel = source.channel;

    // Initial Reply/Defer
    let msg;
    if (isInteraction) {
        // Assumes deferReply() was called in the command file, or we call it here if not?
        // Let's assume the caller handles deferral or we check.
        if (!source.deferred && !source.replied) await source.deferReply();
    } else {
        // For message, we send a placeholder or just wait
        // msg = await source.reply('🔄 Memuat leaderboard...');
    }

    // 1. Fetch Top 100 Users
    const topUsers = db.getTopBalances(100);
    if (topUsers.length === 0) {
        const text = 'Belum ada data ekonomi yang tercatat.';
        if (isInteraction) return source.editReply(text);
        else return source.reply(text);
    }

    const USERS_PER_PAGE = 10;
    const totalPages = Math.ceil(topUsers.length / USERS_PER_PAGE);
    let currentPage = 0;

    // Helper to generate image
    const generateLeaderboardImage = async (pageIndex) => {
        const canvas = Canvas.createCanvas(700, 800); // Width x Height
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#23272A'; // Discord Dark Mode BG
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText("🏆 Top Sultan Mang Ujang", 30, 50);

        // Subtitle
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(`Halaman ${pageIndex + 1} dari ${totalPages}`, 30, 80);

        // Line Separator
        ctx.strokeStyle = '#00AAFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(30, 90);
        ctx.lineTo(670, 90);
        ctx.stroke();

        const start = pageIndex * USERS_PER_PAGE;
        const end = start + USERS_PER_PAGE;
        const pageUsers = topUsers.slice(start, end);

        // Global Top Balance for Progress Bar Scale
        const maxBalance = topUsers[0].uang_jajan || 1;

        let y = 140;
        for (let i = 0; i < pageUsers.length; i++) {
            const u = pageUsers[i];
            const rank = start + i + 1;

            // Fetch User Data
            let username = 'Unknown User';
            let avatarUrl = null;

            try {
                // Use client from source
                const client = source.client;
                const discordUser = await client.users.fetch(u.user_id).catch(() => null);
                if (discordUser) {
                    username = discordUser.username;
                    avatarUrl = discordUser.displayAvatarURL({ extension: 'png', size: 64 });
                }
            } catch (e) { }

            // Draw Rank
            ctx.fillStyle = rank <= 3 ? '#FFD700' : '#FFFFFF'; // Gold for top 3
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText(`#${rank}`, 30, y + 30);

            // Draw Avatar
            if (avatarUrl) {
                try {
                    const avatar = await Canvas.loadImage(avatarUrl);
                    // Circular Avatar
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(110, y + 20, 25, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(avatar, 85, y - 5, 50, 50);
                    ctx.restore();
                } catch (e) {
                    // Fallback circle
                    ctx.fillStyle = '#555555';
                    ctx.beginPath();
                    ctx.arc(110, y + 20, 25, 0, Math.PI * 2, true);
                    ctx.fill();
                }
            }

            // Draw Username
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText(username, 150, y + 15);

            // Draw Balance
            ctx.fillStyle = '#00FF00'; // Green money
            ctx.font = '20px sans-serif';
            ctx.fillText(`Rp ${u.uang_jajan.toLocaleString('id-ID')}`, 150, y + 45);

            // Draw Progress Bar Background
            ctx.fillStyle = '#444444';
            ctx.fillRect(400, y + 15, 250, 15);

            // Draw Progress Bar Fill
            const percentage = Math.min(1, Math.max(0, u.uang_jajan / maxBalance));
            ctx.fillStyle = '#00AAFF';
            ctx.fillRect(400, y + 15, 250 * percentage, 15);

            y += 65; // Next Row
        }

        return canvas.toBuffer();
    };

    // Initial Send
    const buffer = await generateLeaderboardImage(currentPage);
    const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });

    const getRow = (page) => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lb_prev')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('lb_next')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages - 1)
        );
    };

    let sentMessage;
    const payload = { files: [attachment], components: [getRow(currentPage)] };

    if (isInteraction) {
        sentMessage = await source.editReply(payload);
    } else {
        sentMessage = await source.reply(payload);
    }

    // Collector
    const collector = sentMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 }); // 2 Mins

    collector.on('collect', async i => {
        if (i.user.id !== user.id) {
            return i.reply({ content: '❌ Bikin leaderboard sendiri dong!', flags: [4096] }); // Ephemeral
        }

        await i.deferUpdate();

        if (i.customId === 'lb_prev') currentPage--;
        else if (i.customId === 'lb_next') currentPage++;

        const newBuffer = await generateLeaderboardImage(currentPage);
        const newAttachment = new AttachmentBuilder(newBuffer, { name: 'leaderboard.png' });

        await i.editReply({ files: [newAttachment], components: [getRow(currentPage)] });
    });

    collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lb_prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('lb_next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        sentMessage.edit({ components: [disabledRow] }).catch(() => { });
    });
}

module.exports = { showLeaderboard };
