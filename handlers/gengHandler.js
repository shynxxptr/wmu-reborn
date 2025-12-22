const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

// GENG CONFIGURATION
const GENG_CONFIG = {
    CREATE_COST: 5_000_000,
    MAX_MEMBERS: 20,
    UPGRADE_COSTS: {
        2: 10_000_000,
        3: 20_000_000,
        4: 30_000_000,
        5: 50_000_000
    },
    WEEKLY_UPKEEP: {
        1: 100_000,
        2: 250_000,
        3: 500_000,
        4: 1_000_000,
        5: 2_000_000
    },
    MAX_LEVEL: 5
};

module.exports = {
    GENG_CONFIG,

    async handleGengCreate(message, args) {
        if (!message || !message.author) {
            return;
        }
        
        const userId = message.author.id;
        const gengName = (args && args.length > 0) ? args.join(' ').trim() : '';

        if (!gengName || gengName.length < 3) {
            return message.reply('❌ **Nama geng minimal 3 karakter!**\nFormat: `!geng create <nama>`');
        }

        if (gengName.length > 30) {
            return message.reply('❌ **Nama geng maksimal 30 karakter!**');
        }

        // 1. Cek apakah user sudah punya geng
        const userGeng = db.getUserGeng(userId);
        if (userGeng && userGeng.geng_name) {
            return message.reply(`❌ **Kamu sudah punya geng!**\nGengmu: **${userGeng.geng_name}**\nGunakan \`!geng leave\` untuk keluar dulu.`);
        }

        // 2. Cek apakah nama geng sudah ada
        const existingGeng = db.getGengByName(gengName);
        if (existingGeng) {
            return message.reply('❌ **Nama geng sudah digunakan!** Pilih nama lain.');
        }

        // 3. Cek uang
        const balance = db.getBalance(userId) || 0;
        if (balance < GENG_CONFIG.CREATE_COST) {
            return message.reply(
                `💸 **Uang tidak cukup!**\n` +
                `Butuh: ${formatMoney(GENG_CONFIG.CREATE_COST)}\n` +
                `Uangmu: ${formatMoney(balance)}`
            );
        }

        // 4. Potong uang
        try {
            db.updateBalance(userId, -GENG_CONFIG.CREATE_COST);
        } catch (e) {
            console.error('Error deducting balance:', e);
            return message.reply('❌ **Error saat memproses pembayaran!** Coba lagi nanti.');
        }

        // 5. Buat geng
        const gengId = `geng_${Date.now()}_${userId}`;
        const success = db.createGeng(gengId, gengName, userId);

        if (!success) {
            // Refund jika gagal
            try {
                db.updateBalance(userId, GENG_CONFIG.CREATE_COST);
            } catch (e) {
                console.error('Error refunding balance:', e);
            }
            return message.reply('❌ **Gagal membuat geng!** Uang sudah dikembalikan. Coba lagi nanti.');
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Geng Berhasil Dibuat!')
            .setDescription(
                `🎉 **Selamat!** Geng baru telah dibuat!\n\n` +
                `**📋 Info Geng:**\n` +
                `• Nama: **${gengName}**\n` +
                `• Leader: <@${userId}>\n` +
                `• Level: **1**/${GENG_CONFIG.MAX_LEVEL}\n` +
                `• Bank: ${formatMoney(0)}\n` +
                `• Members: 1/${GENG_CONFIG.MAX_MEMBERS}\n\n` +
                `**💡 Commands:**\n` +
                `\`!geng info\` - Info gengmu\n` +
                `\`!geng invite <user>\` - Invite member\n` +
                `\`!geng bank\` - Kelola bank geng\n` +
                `\`!geng upgrade\` - Upgrade level geng`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '🏫 Geng Sekolah' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async handleGengInfo(message) {
        const userId = message.author.id;
        const userGeng = db.getUserGeng(userId);

        if (!userGeng) {
            return message.reply(
                '❌ **Kamu belum punya geng!**\n' +
                `Buat geng dengan \`!geng create <nama>\` (${formatMoney(GENG_CONFIG.CREATE_COST)})`
            );
        }

        let members, buffs, upkeepStatus;
        try {
            members = db.getGengMembers(userGeng.geng_id) || [];
            buffs = db.getGengBuffs(userGeng.geng_id) || [];
            upkeepStatus = db.getGengUpkeepStatus(userGeng.geng_id);
        } catch (e) {
            console.error('Error fetching geng data:', e);
            return message.reply('❌ **Error saat mengambil data geng!** Coba lagi nanti.');
        }

        // Enhanced progress bars dengan emoji
        const level = userGeng.level || 1;
        const levelProgress = Math.min(100, Math.max(0, (level / GENG_CONFIG.MAX_LEVEL) * 100));
        const levelBarLength = Math.min(10, Math.max(0, Math.floor(levelProgress / 10)));
        const levelEmoji = levelProgress >= 80 ? '🟩' : levelProgress >= 50 ? '🟨' : '🟧';
        const levelBar = levelEmoji.repeat(levelBarLength) + '⬜'.repeat(10 - levelBarLength);
        
        // Progress bar untuk members dengan emoji
        const memberCount = members.length || 0;
        const memberProgress = Math.min(100, Math.max(0, (memberCount / GENG_CONFIG.MAX_MEMBERS) * 100));
        const memberBarLength = Math.min(20, Math.max(0, Math.floor(memberProgress / 5)));
        const memberEmoji = memberProgress >= 80 ? '🟩' : memberProgress >= 50 ? '🟨' : '🟧';
        const memberBar = memberEmoji.repeat(memberBarLength) + '⬜'.repeat(20 - memberBarLength);
        
        // Level stars
        const levelStars = '⭐'.repeat(Math.min(level, 5));

        // Dynamic color berdasarkan level
        const getGengColor = (level) => {
            if (level >= 5) return '#FFD700'; // Gold - Max level
            if (level >= 3) return '#00FF00'; // Green - High level
            if (level >= 2) return '#0099FF'; // Blue - Medium level
            return '#808080'; // Gray - Low level
        };
        
        const embed = new EmbedBuilder()
            .setColor(getGengColor(level))
            .setTitle(`🏫 ${userGeng.geng_name} ${levelStars}`)
            .setDescription(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `**👑 Leader:** <@${userGeng.leader_id || 'Unknown'}>\n` +
                `**📊 Level:** ${level}/${GENG_CONFIG.MAX_LEVEL} ${levelBar} **${Math.floor(levelProgress)}%**\n` +
                `**👥 Members:** ${memberCount}/${GENG_CONFIG.MAX_MEMBERS} ${memberBar}\n` +
                `**💰 Bank:** ${formatMoney(userGeng.bank_balance || 0)}\n` +
                `**📅 Dibuat:** <t:${Math.floor((userGeng.created_at || Date.now()) / 1000)}:R>\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `**🎭 Role Kamu:** ${userGeng.role === 'leader' ? '👑 **Leader**' : '👤 Member'}`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: `🏫 Geng Sekolah • Level ${level} • ${memberCount} Members` })
            .setTimestamp();

        // Add upkeep status dengan visual enhancement
        if (upkeepStatus) {
            const statusEmoji = upkeepStatus.canPay ? '✅' : '⚠️';
            const statusBadge = upkeepStatus.canPay ? '🟢 [SAFE]' : '🔴 [DANGER]';
            const daysBar = upkeepStatus.daysRemaining > 0 
                ? '🟩'.repeat(Math.min(7, upkeepStatus.daysRemaining)) + '⬜'.repeat(Math.max(0, 7 - upkeepStatus.daysRemaining))
                : '🔴🔴🔴🔴🔴🔴🔴';
            
            embed.addFields({
                name: `${statusEmoji} Weekly Upkeep ${statusBadge}`,
                value: `**💰 Biaya:** ${formatMoney(upkeepStatus.upkeepCost)}\n` +
                       `**⏰ Waktu:** ${upkeepStatus.daysRemaining} hari ${daysBar}\n` +
                       (upkeepStatus.canPay 
                           ? '✅ **Status:** Bank cukup untuk upkeep' 
                           : '⚠️ **PERINGATAN:** Bank tidak cukup! Geng akan dibubarkan jika tidak diisi.'),
                inline: false
            });
        }

        if (members && members.length > 0) {
            const memberList = members.slice(0, 15).map((m, idx) => {
                if (!m || !m.user_id) return null;
                const roleEmoji = m.role === 'leader' ? '👑' : '👤';
                const joinedAt = m.joined_at || Date.now();
                const daysAgo = Math.floor((Date.now() - joinedAt) / (1000 * 60 * 60 * 24));
                return `${idx + 1}. ${roleEmoji} <@${m.user_id}> ${daysAgo > 0 ? `(${daysAgo}d)` : ''}`;
            }).filter(item => item).join('\n');
            const moreMembers = members.length > 15 ? `\n*...dan ${members.length - 15} member lainnya*` : '';
            embed.addFields({ 
                name: `📋 Members (${members.length})`, 
                value: (memberList + moreMembers) || 'Belum ada member',
                inline: false
            });
        }

        if (buffs && buffs.length > 0) {
            const buffList = buffs.map(b => {
                if (!b || !b.expires_at) return null;
                const remaining = b.expires_at - Date.now();
                if (remaining <= 0) return null;
                const hours = Math.floor(remaining / 3600000);
                return `• ${b.buff_type || 'Unknown'}: +${b.buff_value || 0}% (${hours}j tersisa)`;
            }).filter(item => item).join('\n');
            if (buffList) {
                embed.addFields({ name: '✨ Active Buffs', value: buffList });
            }
        }

        return message.reply({ embeds: [embed] });
    },

    async handleGengInvite(message, args) {
        if (!message || !message.author) {
            return;
        }
        
        const userId = message.author.id;
        const userGeng = db.getUserGeng(userId);

        if (!userGeng) {
            return message.reply('❌ **Kamu belum punya geng!**');
        }

        if (userGeng.role !== 'leader') {
            return message.reply('❌ **Hanya leader yang bisa invite member!**');
        }

        if (!args || args.length === 0) {
            return message.reply('❌ **Format:** `!geng invite <user>`\n**Contoh:** `!geng invite @username`');
        }

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            return message.reply('❌ **Format:** `!geng invite <user>`\n**Contoh:** `!geng invite @username`');
        }

        // Cek apakah target valid
        if (targetId === userId) {
            return message.reply('❌ **Kamu tidak bisa invite dirimu sendiri!**');
        }

        // Cek apakah target sudah punya geng
        const targetGeng = db.getUserGeng(targetId);
        if (targetGeng) {
            return message.reply(`❌ **User sudah punya geng!**\nGeng mereka: **${targetGeng.geng_name}**`);
        }

        // Cek member limit
        const currentMembers = db.getGengMembers(userGeng.geng_id);
        if (currentMembers.length >= GENG_CONFIG.MAX_MEMBERS) {
            return message.reply(`❌ **Geng sudah penuh!** Max ${GENG_CONFIG.MAX_MEMBERS} members.`);
        }

        // Add member
        const success = db.addGengMember(userGeng.geng_id, targetId);
        if (!success) {
            return message.reply('❌ **Gagal menambah member!**');
        }

        // Get updated member list
        const members = db.getGengMembers(userGeng.geng_id);
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Member Ditambahkan!')
            .setDescription(
                `🎉 <@${targetId}> telah bergabung ke geng **${userGeng.geng_name}**!\n\n` +
                `**📊 Status Geng:**\n` +
                `• Members: ${members.length}/${GENG_CONFIG.MAX_MEMBERS}\n` +
                `• Level: ${userGeng.level}/${GENG_CONFIG.MAX_LEVEL}`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '🏫 Geng Sekolah' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async handleGengLeave(message) {
        const userId = message.author.id;
        const userGeng = db.getUserGeng(userId);

        if (!userGeng) {
            return message.reply('❌ **Kamu belum punya geng!**');
        }

        if (userGeng.role === 'leader') {
            return message.reply('❌ **Leader tidak bisa leave!** Transfer leadership dulu atau disband geng.');
        }

        db.removeGengMember(userGeng.geng_id, userId);

        const embed = new EmbedBuilder()
            .setColor('#FF9900')
            .setTitle('👋 Kamu Keluar dari Geng')
            .setDescription(
                `Kamu telah keluar dari geng **${userGeng.geng_name}**.\n\n` +
                `💡 **Tip:** Buat geng baru dengan \`!geng create <nama>\``
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '🏫 Geng Sekolah' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async handleGengBank(message, args) {
        if (!message || !message.author) {
            return;
        }
        
        const userId = message.author.id;
        const userGeng = db.getUserGeng(userId);

        if (!userGeng) {
            return message.reply('❌ **Kamu belum punya geng!**');
        }

        const action = (args && args.length > 0) ? args[0]?.toLowerCase() : null;

        if (!action || action === 'info') {
            const upkeepStatus = db.getGengUpkeepStatus(userGeng.geng_id);
            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`💰 Bank Geng: ${userGeng.geng_name}`)
                .setDescription(
                    `**💵 Saldo:** ${formatMoney(userGeng.bank_balance || 0)}\n\n` +
                    `**📋 Commands:**\n` +
                    `• \`!geng bank deposit <amount>\` - Deposit uang\n` +
                    `• \`!geng bank withdraw <amount>\` - Withdraw uang (leader only)\n` +
                    `• \`!geng bank info\` - Info bank`
                )
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setFooter({ text: '🏫 Geng Sekolah' })
                .setTimestamp();
            
            if (upkeepStatus) {
                embed.addFields({
                    name: '⏰ Weekly Upkeep',
                    value: `**Biaya:** ${formatMoney(upkeepStatus.upkeepCost)}\n` +
                           `**Tersisa:** ${upkeepStatus.daysRemaining} hari\n` +
                           (upkeepStatus.canPay ? '✅ Bank cukup' : '⚠️ **PERINGATAN:** Bank tidak cukup!'),
                    inline: false
                });
            }

            return message.reply({ embeds: [embed] });
        }

        if (action === 'deposit') {
            const amount = parseInt(args[1]);
            if (!amount || isNaN(amount) || amount <= 0) {
                return message.reply('❌ **Format:** `!geng bank deposit <amount>`\n**Contoh:** `!geng bank deposit 1000000`');
            }

            const balance = db.getBalance(userId) || 0;
            if (balance < amount) {
                return message.reply(
                    `💸 **Uang tidak cukup!**\n` +
                    `Butuh: ${formatMoney(amount)}\n` +
                    `Uangmu: ${formatMoney(balance)}\n` +
                    `Kurang: ${formatMoney(amount - balance)}`
                );
            }

            try {
                db.updateBalance(userId, -amount);
                db.updateGengBank(userGeng.geng_id, amount);
            } catch (e) {
                console.error('Error processing deposit:', e);
                return message.reply('❌ **Error saat memproses deposit!** Coba lagi nanti.');
            }

            const newBalance = (userGeng.bank_balance || 0) + amount;
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Deposit Berhasil!')
                .setDescription(
                    `💰 **Deposit:** ${formatMoney(amount)}\n` +
                    `💵 **Saldo Bank:** ${formatMoney(newBalance)}\n\n` +
                    `**📊 Geng:** ${userGeng.geng_name}`
                )
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setFooter({ text: '🏫 Geng Sekolah' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        if (action === 'withdraw') {
            if (userGeng.role !== 'leader') {
                return message.reply('❌ **Hanya leader yang bisa withdraw!**');
            }

            const amount = parseInt(args[1]);
            if (!amount || isNaN(amount) || amount <= 0) {
                return message.reply('❌ **Format:** `!geng bank withdraw <amount>`\n**Contoh:** `!geng bank withdraw 1000000`');
            }

            const bankBalance = userGeng.bank_balance || 0;
            if (bankBalance < amount) {
                return message.reply(
                    `💸 **Saldo bank tidak cukup!**\n` +
                    `Butuh: ${formatMoney(amount)}\n` +
                    `Saldo Bank: ${formatMoney(bankBalance)}\n` +
                    `Kurang: ${formatMoney(amount - bankBalance)}`
                );
            }

            try {
                db.updateGengBank(userGeng.geng_id, -amount);
                db.updateBalance(userId, amount);
            } catch (e) {
                console.error('Error processing withdraw:', e);
                return message.reply('❌ **Error saat memproses withdraw!** Coba lagi nanti.');
            }

            const newBalance = bankBalance - amount;
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Withdraw Berhasil!')
                .setDescription(
                    `💰 **Withdraw:** ${formatMoney(amount)}\n` +
                    `💵 **Saldo Bank:** ${formatMoney(newBalance)}\n\n` +
                    `**📊 Geng:** ${userGeng.geng_name}`
                )
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setFooter({ text: '🏫 Geng Sekolah' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    },

    async handleGengUpgrade(message) {
        const userId = message.author.id;
        const userGeng = db.getUserGeng(userId);

        if (!userGeng) {
            return message.reply('❌ **Kamu belum punya geng!**');
        }

        if (userGeng.role !== 'leader') {
            return message.reply('❌ **Hanya leader yang bisa upgrade geng!**');
        }

        if (userGeng.level >= GENG_CONFIG.MAX_LEVEL) {
            return message.reply(`❌ **Geng sudah level maksimal!** Level ${GENG_CONFIG.MAX_LEVEL}`);
        }

        const nextLevel = userGeng.level + 1;
        const cost = GENG_CONFIG.UPGRADE_COSTS[nextLevel];

        if (!cost) {
            return message.reply('❌ **Level tidak valid!**');
        }

        const bankBalance = userGeng.bank_balance || 0;
        if (bankBalance < cost) {
            return message.reply(
                `💸 **Saldo bank tidak cukup!**\n` +
                `Butuh: ${formatMoney(cost)}\n` +
                `Saldo Bank: ${formatMoney(bankBalance)}`
            );
        }

        // Potong dari bank
        try {
            db.updateGengBank(userGeng.geng_id, -cost);
            db.upgradeGeng(userGeng.geng_id);
        } catch (e) {
            console.error('Error upgrading geng:', e);
            return message.reply('❌ **Error saat upgrade geng!** Coba lagi nanti.');
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 Geng Diupgrade!')
            .setDescription(
                `✨ **${userGeng.geng_name}** naik ke **Level ${nextLevel}**!\n\n` +
                `**💰 Biaya:** ${formatMoney(cost)}\n` +
                `**⏰ Upkeep Mingguan:** ${formatMoney(GENG_CONFIG.WEEKLY_UPKEEP[nextLevel])}\n\n` +
                `**📊 Progress:** ${nextLevel}/${GENG_CONFIG.MAX_LEVEL}`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '🏫 Geng Sekolah' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async handleGengList(message) {
        let allGengs;
        try {
            allGengs = db.prepare('SELECT * FROM gengs ORDER BY level DESC, bank_balance DESC LIMIT 10').all();
        } catch (e) {
            console.error('Error fetching gengs:', e);
            return message.reply('❌ **Error saat mengambil data geng!** Coba lagi nanti.');
        }

        if (!allGengs || allGengs.length === 0) {
            return message.reply('❌ **Belum ada geng yang dibuat!**');
        }

        const gengList = allGengs.map((g, idx) => {
            try {
                if (!g || !g.geng_id) return null;
                const members = db.getGengMembers(g.geng_id) || [];
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅';
                const level = Math.min(Math.max(1, g.level || 1), 5); // Clamp between 1-5
                const levelStars = '⭐'.repeat(level);
                const rankBadge = idx < 3 ? `**#${idx + 1}**` : '';
                return `${medal} ${rankBadge} **${g.geng_name || 'Unknown'}** ${levelStars}\n` +
                       `   📊 Level ${level} | 👥 ${members.length}/${GENG_CONFIG.MAX_MEMBERS} | 💰 ${formatMoney(g.bank_balance || 0)}`;
            } catch (e) {
                console.error(`Error processing geng ${g?.geng_id || 'unknown'}:`, e);
                return null;
            }
        }).filter(item => item && item.trim()).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Top 10 Geng Sekolah')
            .setDescription(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                gengList || 'Belum ada geng yang dibuat.\n' +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: '🏫 Geng Leaderboard', 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: `🏫 Total: ${allGengs.length} Geng • Updated` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async handleGengKick(message, args) {
        if (!message || !message.author) {
            return;
        }
        
        const userId = message.author.id;
        const userGeng = db.getUserGeng(userId);

        if (!userGeng) {
            return message.reply('❌ **Kamu belum punya geng!**');
        }

        if (userGeng.role !== 'leader') {
            return message.reply('❌ **Hanya leader yang bisa kick member!**');
        }

        if (!args || args.length === 0) {
            return message.reply('❌ **Format:** `!geng kick <user>`\n**Contoh:** `!geng kick @username`');
        }

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            return message.reply('❌ **Format:** `!geng kick <user>`\n**Contoh:** `!geng kick @username`');
        }

        if (targetId === userId) {
            return message.reply('❌ **Kamu tidak bisa kick dirimu sendiri!**');
        }

        if (targetId === userGeng.leader_id) {
            return message.reply('❌ **Kamu tidak bisa kick leader!**\nGunakan `!geng transfer <user>` untuk transfer leadership dulu.');
        }

        const currentMembers = db.getGengMembers(userGeng.geng_id);
        const targetMember = currentMembers.find(m => m.user_id === targetId);
        
        if (!targetMember) {
            return message.reply('❌ **User bukan member geng ini!**');
        }

        db.removeGengMember(userGeng.geng_id, targetId);

        // Get updated member list
        const members = db.getGengMembers(userGeng.geng_id);
        const embed = new EmbedBuilder()
            .setColor('#FF9900')
            .setTitle('👢 Member Dikick!')
            .setDescription(
                `<@${targetId}> telah dikeluarkan dari geng **${userGeng.geng_name}**.\n\n` +
                `**📊 Status:** ${members.length}/${GENG_CONFIG.MAX_MEMBERS} members`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '🏫 Geng Sekolah' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async handleGengTransfer(message, args) {
        if (!message || !message.author) {
            return;
        }
        
        const userId = message.author.id;
        const userGeng = db.getUserGeng(userId);

        if (!userGeng) {
            return message.reply('❌ **Kamu belum punya geng!**');
        }

        if (userGeng.role !== 'leader' || userId !== userGeng.leader_id) {
            return message.reply('❌ **Hanya leader yang bisa transfer leadership!**');
        }

        if (!args || args.length === 0) {
            return message.reply('❌ **Format:** `!geng transfer <user>`\n**Contoh:** `!geng transfer @username`');
        }

        const targetId = args[0]?.replace(/[<@!>]/g, '');
        if (!targetId) {
            return message.reply('❌ **Format:** `!geng transfer <user>`\n**Contoh:** `!geng transfer @username`');
        }

        if (targetId === userId) {
            return message.reply('❌ **Kamu sudah leader!**');
        }

        const members = db.getGengMembers(userGeng.geng_id);
        const targetMember = members.find(m => m.user_id === targetId);
        
        if (!targetMember) {
            return message.reply('❌ **User bukan member geng ini!**');
        }

        // Update leader in gengs table
        try {
            db.prepare('UPDATE gengs SET leader_id = ? WHERE geng_id = ?').run(targetId, userGeng.geng_id);
            
            // Update roles
            db.prepare('UPDATE geng_members SET role = ? WHERE geng_id = ? AND user_id = ?')
                .run('leader', userGeng.geng_id, targetId);
            db.prepare('UPDATE geng_members SET role = ? WHERE geng_id = ? AND user_id = ?')
                .run('member', userGeng.geng_id, userId);
        } catch (e) {
            console.error('Error transferring leadership:', e);
            return message.reply('❌ **Error saat transfer leadership!** Coba lagi nanti.');
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👑 Leadership Ditransfer!')
            .setDescription(
                `🎉 **Leadership berhasil ditransfer!**\n\n` +
                `**👑 Leader Lama:** <@${userId}>\n` +
                `**👑 Leader Baru:** <@${targetId}>\n\n` +
                `**📊 Geng:** ${userGeng.geng_name}`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '🏫 Geng Sekolah' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },

    async handleGengDisband(message) {
        const userId = message.author.id;
        const userGeng = db.getUserGeng(userId);

        if (!userGeng) {
            return message.reply('❌ **Kamu belum punya geng!**');
        }

        if (userGeng.role !== 'leader' || userId !== userGeng.leader_id) {
            return message.reply('❌ **Hanya leader yang bisa disband geng!**');
        }

        // Confirmation - bisa ditambah button confirmation nanti
        const gengName = userGeng.geng_name;
        const bankBalance = userGeng.bank_balance || 0;

        // Delete geng and all members
        try {
            db.prepare('DELETE FROM geng_members WHERE geng_id = ?').run(userGeng.geng_id);
            db.prepare('DELETE FROM geng_buffs WHERE geng_id = ?').run(userGeng.geng_id);
            db.prepare('DELETE FROM gengs WHERE geng_id = ?').run(userGeng.geng_id);

            // Refund bank balance to leader (optional - bisa juga hilang sebagai money sink)
            if (bankBalance > 0) {
                db.updateBalance(userId, bankBalance);
            }
        } catch (e) {
            console.error('Error disbanding geng:', e);
            return message.reply('❌ **Error saat membubarkan geng!** Coba lagi nanti.');
        }

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💔 Geng Dibubarkan!')
            .setDescription(
                `😢 Geng **${gengName}** telah dibubarkan oleh leader.\n\n` +
                (bankBalance > 0 ? `💰 **Bank balance dikembalikan:** ${formatMoney(bankBalance)}\n\n` : '💰 **Bank balance:** 0\n\n') +
                `💡 **Tip:** Buat geng baru dengan \`!geng create <nama>\``
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '🏫 Geng Sekolah' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};

