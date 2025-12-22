const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
let Canvas;
try {
    Canvas = require('canvas');
} catch (e) {
    console.error('[LEADERBOARD] Canvas module not available:', e.message);
    Canvas = null;
}
const db = require('../database.js');

async function showLeaderboard(source, db, type = 'global', eventId = null) {
    try {
        // Determine if source is Interaction or Message
        const isInteraction = source.commandName !== undefined;
        const user = isInteraction ? source.user : source.author;
        const channel = source.channel;
        const guild = source.guild;

        // Initial Reply/Defer
        if (isInteraction) {
            if (!source.deferred && !source.replied) await source.deferReply();
        }

    // 1. Fetch Data based on Type
    let topUsers = [];
    let title = '🏆 Top Sultan Warung Mang Ujang : Reborn';
    let subTitlePrefix = 'Global Leaderboard';

    // Debug: Check if database has any users
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM user_economy').get();
        const usersWithBalance = db.prepare('SELECT COUNT(*) as count FROM user_economy WHERE uang_jajan > 0').get();
        console.log(`[LEADERBOARD DEBUG] Total users: ${totalUsers?.count || 0}, Users with balance: ${usersWithBalance?.count || 0}`);
    } catch (e) {
        console.error('[LEADERBOARD DEBUG] Error checking database:', e);
    }

    if (type === 'event') {
        if (!eventId) {
            const activeEvent = db.getActiveEvent();
            if (activeEvent) eventId = activeEvent.id;
        }

        if (!eventId) {
            const text = '❌ Tidak ada event aktif.';
            return isInteraction ? source.editReply(text) : source.reply(text);
        }

        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
        topUsers = db.getEventLeaderboard(eventId);
        title = `🏆 ${event ? event.name : 'Event Leaderboard'}`;
        subTitlePrefix = 'Event Rank';
    } else if (type === 'server') {
        // Fetch more global users then filter by guild
        // Note: This is inefficient for huge DBs, but fine for now.
        // Better approach: Add guild_id to user_economy or fetch all guild members first.
        // Given current structure, we fetch top 500 global and filter.
        const globalTop = db.getTopBalances(500);

        // We need to ensure guild members are cached
        if (guild) {
            await guild.members.fetch();
            topUsers = globalTop.filter(u => guild.members.cache.has(u.user_id));
        } else {
            topUsers = globalTop; // Fallback if no guild context
        }
        title = `🏆 Top Sultan ${guild ? guild.name : 'Server'}`;
        subTitlePrefix = 'Server Leaderboard';
    } else {
        // Global
        topUsers = db.getTopBalances(100);
    }

    // Debug logging
    console.log(`[LEADERBOARD] Type: ${type}, Found ${topUsers.length} users`);
    if (topUsers.length > 0) {
        console.log(`[LEADERBOARD] Top user: ${topUsers[0].user_id} with ${topUsers[0].uang_jajan}`);
    }

    if (topUsers.length === 0) {
        const text = '❌ Belum ada data leaderboard yang tercatat.\n\n**Kemungkinan penyebab:**\n• Belum ada user yang memiliki saldo\n• Semua user ter-blacklist atau admin\n• Database kosong';
        return isInteraction ? source.editReply(text) : source.reply(text);
    }

    const USERS_PER_PAGE = 10;
    const totalPages = Math.ceil(topUsers.length / USERS_PER_PAGE);
    let currentPage = 0;

    // Helper to generate image
    const generateLeaderboardImage = async (pageIndex) => {
        if (!Canvas) {
            throw new Error('Canvas module not available');
        }
        
        const canvas = Canvas.createCanvas(700, 800); // Width x Height
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#23272A'; // Discord Dark Mode BG
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(title, 30, 50);

        // Subtitle
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(`${subTitlePrefix} • Halaman ${pageIndex + 1} dari ${totalPages}`, 30, 80);

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
            ctx.fillStyle = type === 'event' ? '#00FFFF' : '#00FF00'; // Cyan for Event, Green for Money
            ctx.font = '20px sans-serif';
            const { formatMoneyShort } = require('../utils/helpers.js');
            ctx.fillText(`Rp ${formatMoneyShort(u.uang_jajan)}`, 150, y + 45);

            // Draw Progress Bar Background
            ctx.fillStyle = '#444444';
            ctx.fillRect(400, y + 15, 250, 15);

            // Draw Progress Bar Fill
            const percentage = Math.min(1, Math.max(0, u.uang_jajan / maxBalance));
            ctx.fillStyle = type === 'event' ? '#FF00FF' : '#00AAFF'; // Magenta for Event, Blue for Money
            ctx.fillRect(400, y + 15, 250 * percentage, 15);

            y += 65; // Next Row
        }

        return canvas.toBuffer();
    };

    // Helper to generate embed (fallback)
    const generateLeaderboardEmbed = (pageIndex) => {
        const start = pageIndex * USERS_PER_PAGE;
        const end = start + USERS_PER_PAGE;
        const pageUsers = topUsers.slice(start, end);
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`${subTitlePrefix} • Halaman ${pageIndex + 1} dari ${totalPages}`)
            .setColor('#00AAFF')
            .setTimestamp();
        
        const fields = [];
        for (let i = 0; i < pageUsers.length; i++) {
            const u = pageUsers[i];
            const rank = start + i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`#${rank}\``;
            fields.push({
                name: `${medal} Rank ${rank}`,
                value: `<@${u.user_id}> - **Rp ${u.uang_jajan.toLocaleString('id-ID')}**`,
                inline: false
            });
        }
        
        embed.addFields(fields);
        return embed;
    };

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
    let useImage = true;
    
    try {
        // Try to generate image
        if (!Canvas) {
            throw new Error('Canvas not available');
        }
        
        const buffer = await generateLeaderboardImage(currentPage);
        const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });
        const payload = { files: [attachment], components: [getRow(currentPage)] };

        if (isInteraction) {
            sentMessage = await source.editReply(payload);
        } else {
            sentMessage = await source.reply(payload);
        }
    } catch (imageError) {
        console.error('[LEADERBOARD IMAGE ERROR]', imageError);
        useImage = false;
        
        // Fallback to embed
        const embed = generateLeaderboardEmbed(currentPage);
        const payload = { embeds: [embed], components: [getRow(currentPage)] };

        if (isInteraction) {
            sentMessage = await source.editReply(payload);
        } else {
            sentMessage = await source.reply(payload);
        }
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

        try {
            if (useImage && Canvas) {
                const newBuffer = await generateLeaderboardImage(currentPage);
                const newAttachment = new AttachmentBuilder(newBuffer, { name: 'leaderboard.png' });
                await i.editReply({ files: [newAttachment], components: [getRow(currentPage)] });
            } else {
                const embed = generateLeaderboardEmbed(currentPage);
                await i.editReply({ embeds: [embed], components: [getRow(currentPage)] });
            }
        } catch (e) {
            console.error('[LEADERBOARD UPDATE ERROR]', e);
            // Fallback to embed if image fails
            const embed = generateLeaderboardEmbed(currentPage);
            await i.editReply({ embeds: [embed], components: [getRow(currentPage)] });
        }
    });

    collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lb_prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('lb_next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        sentMessage.edit({ components: [disabledRow] }).catch(() => { });
    });
    } catch (error) {
        console.error('[LEADERBOARD ERROR]', error);
        const isInteraction = source.commandName !== undefined;
        const errorText = '❌ **Error:** Gagal menampilkan leaderboard. Silakan coba lagi nanti.';
        try {
            if (isInteraction) {
                if (source.deferred || source.replied) {
                    await source.editReply(errorText);
                } else {
                    await source.reply(errorText);
                }
            } else {
                await source.reply(errorText);
            }
        } catch (e) {
            console.error('[LEADERBOARD ERROR HANDLING FAILED]', e);
        }
    }
}

async function updateLeaderboardRoles(client) {
    // 1. Get Role IDs from DB
    const role1 = db.getSystemVar('lb_role_1');
    const role2 = db.getSystemVar('lb_role_2');
    const role3 = db.getSystemVar('lb_role_3');

    if (!role1 && !role2 && !role3) return; // No roles configured

    // 2. Get Top 3 Users
    const topUsers = db.getTopBalances(3);
    const topIds = topUsers.map(u => u.user_id);

    // 3. Iterate all guilds (usually just one)
    for (const guild of client.guilds.cache.values()) {
        try {
            await guild.members.fetch(); // Cache all members

            // Helper to handle role
            const handleRole = async (rank, roleId) => {
                if (!roleId) return;
                const role = guild.roles.cache.get(roleId);
                if (!role) return;

                // Target User for this rank
                const targetId = topIds[rank - 1]; // rank 1 -> index 0

                // Remove role from everyone EXCEPT target
                for (const [memberId, member] of guild.members.cache) {
                    if (member.roles.cache.has(roleId) && memberId !== targetId) {
                        await member.roles.remove(role).catch(() => { });
                    }
                }

                // Add role to target
                if (targetId) {
                    const member = guild.members.cache.get(targetId);
                    if (member && !member.roles.cache.has(roleId)) {
                        await member.roles.add(role).catch(() => { });
                    }
                }
            };

            await handleRole(1, role1);
            await handleRole(2, role2);
            await handleRole(3, role3);

        } catch (e) {
            console.error(`[LB ROLES] Error in guild ${guild.name}:`, e);
        }
    }
}

module.exports = { showLeaderboard, updateLeaderboardRoles };
