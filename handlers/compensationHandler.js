const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

// Compensation Packages
const COMPENSATION_PACKAGES = {
    starter: {
        name: 'Starter Pack',
        bankAmount: 0,
        mainAmount: 10000000, // 10 Juta di saldo utama
        items: [],
        description: 'Paket dasar: 10 Juta di saldo utama'
    },
    base: {
        name: 'Base Compensation',
        bankAmount: 100000000, // 100 Juta di bank
        mainAmount: 10000000, // 10 Juta di saldo utama (starter pack)
        items: [],
        description: 'Kompensasi lengkap: 100 Juta di bank + 10 Juta saldo utama (withdraw limit 10M/hari)'
    },
    premium: {
        name: 'Premium Pack',
        bankAmount: 100000000, // 100 Juta di bank
        mainAmount: 10000000, // 10 Juta saldo utama
        items: [
            { type: 'fortune_cookie', qty: 1 },
            { type: 'luck_potion_premium', qty: 1 },
            { type: 'energy_elixir', qty: 1 }
        ],
        description: 'Paket premium dengan items bonus'
    }
};

module.exports = {
    async handleCompensation(messageOrInteraction, command, args) {
        // Support both message and interaction
        const isInteraction = messageOrInteraction.isButton !== undefined || messageOrInteraction.deferred !== undefined;
        const userId = isInteraction ? messageOrInteraction.user.id : messageOrInteraction.author.id;
        const subCommand = args ? args[1]?.toLowerCase() : 'claim';
        const isDeferred = isInteraction && messageOrInteraction.deferred;

        // !claimcompensation - Claim compensation
        if (!subCommand || subCommand === 'claim') {
            // Check if already claimed
            const claimed = db.prepare('SELECT * FROM compensation_claimed WHERE user_id = ?').get(userId);
            if (claimed) {
                const replyText = `❌ **Kompensasi sudah di-claim!**\nClaimed at: <t:${Math.floor(claimed.claimed_at / 1000)}:F>`;
                if (isInteraction) {
                    if (isDeferred) {
                        return messageOrInteraction.editReply({ content: replyText });
                    }
                    return messageOrInteraction.reply({ content: replyText, ephemeral: true });
                }
                return messageOrInteraction.reply(replyText);
            }

            // Get user packages (admin can set custom packages)
            const userPackage = db.prepare('SELECT * FROM user_compensation WHERE user_id = ?').get(userId);
            const packageType = userPackage?.package_type || 'base'; // Default: base package

            const pack = COMPENSATION_PACKAGES[packageType] || COMPENSATION_PACKAGES.base;

            // Apply compensation
            try {
                // 1. Add to bank
                if (pack.bankAmount > 0) {
                    db.depositToBank(userId, pack.bankAmount);
                }

                // 2. Add to main balance
                if (pack.mainAmount > 0) {
                    db.updateBalance(userId, pack.mainAmount);
                }

                // 3. Add items
                if (pack.items && pack.items.length > 0) {
                    const luxuryHandler = require('./luxuryItemsHandler.js');
                    for (const item of pack.items) {
                        // Add to inventory or apply directly
                        // Implementation depends on item system
                    }
                }

                // 4. Mark as claimed
                db.prepare('INSERT INTO compensation_claimed (user_id, package_type, claimed_at) VALUES (?, ?, ?)').run(userId, packageType, Date.now());

                // 5. Unlock achievement
                try {
                    const achievementHandler = require('./achievementHandler.js');
                    db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)').run(userId, 'database_survivor', Date.now());
                } catch (e) {
                    // Achievement system might not be available
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ **KOMPENSASI BERHASIL DI-CLAIM!**')
                    .setColor('#00FF00')
                    .setDescription(`Terima kasih sudah setia! Ini kompensasi untuk database reset.`)
                    .addFields(
                        {
                            name: '📦 Package',
                            value: pack.name,
                            inline: true
                        },
                        {
                            name: '🏦 Bank',
                            value: pack.bankAmount > 0 ? `Rp ${formatMoney(pack.bankAmount)}` : 'Tidak ada',
                            inline: true
                        },
                        {
                            name: '💰 Saldo Utama',
                            value: pack.mainAmount > 0 ? `Rp ${formatMoney(pack.mainAmount)}` : 'Tidak ada',
                            inline: true
                        }
                    );

                if (pack.bankAmount > 0) {
                    embed.addFields({
                        name: '⚠️ PENTING',
                        value: `• Uang di bank: **Rp ${formatMoney(pack.bankAmount)}**\n• Limit withdraw: **10 Juta per hari**\n• Gunakan \`!bank withdraw\` untuk ambil uang\n• Bunga bank: 0.5% per hari (max 1M)`,
                        inline: false
                    });
                }

                if (pack.items && pack.items.length > 0) {
                    embed.addFields({
                        name: '🎁 Items Bonus',
                        value: pack.items.map(i => `• ${i.qty}x ${i.type}`).join('\n'),
                        inline: false
                    });
                }

                embed.setFooter({ text: 'Terima kasih sudah setia! 🎉' })
                    .setTimestamp();

                if (isInteraction) {
                    if (isDeferred) {
                        return messageOrInteraction.editReply({ embeds: [embed] });
                    }
                    return messageOrInteraction.reply({ embeds: [embed], ephemeral: true });
                }
                return messageOrInteraction.reply({ embeds: [embed] });
            } catch (e) {
                console.error('Error claiming compensation:', e);
                const errorText = `❌ **Error:** Gagal claim kompensasi. Silakan hubungi admin.`;
                if (isInteraction) {
                    if (isDeferred) {
                        return messageOrInteraction.editReply({ content: errorText });
                    }
                    return messageOrInteraction.reply({ content: errorText, ephemeral: true });
                }
                return messageOrInteraction.reply(errorText);
            }
        }

        // !compensation info - Show compensation info
        if (subCommand === 'info') {
            const claimed = db.prepare('SELECT * FROM compensation_claimed WHERE user_id = ?').get(userId);
            const userPackage = db.prepare('SELECT * FROM user_compensation WHERE user_id = ?').get(userId);
            const packageType = userPackage?.package_type || 'base';

            const embed = new EmbedBuilder()
                .setTitle('💰 **INFO KOMPENSASI**')
                .setColor('#0099ff')
                .setDescription('Kompensasi untuk database reset');

            if (claimed) {
                embed.addFields({
                    name: '✅ Status',
                    value: `Sudah di-claim pada <t:${Math.floor(claimed.claimed_at / 1000)}:F>`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📦 Package yang Tersedia',
                    value: COMPENSATION_PACKAGES[packageType].description,
                    inline: false
                });
                embed.addFields({
                    name: '💡 Cara Claim',
                    value: 'Ketik `!claimcompensation` untuk claim kompensasi',
                    inline: false
                });
            }

            if (isInteraction) {
                const isDeferred = messageOrInteraction.deferred;
                if (isDeferred) {
                    return messageOrInteraction.editReply({ embeds: [embed] });
                }
                return messageOrInteraction.reply({ embeds: [embed], ephemeral: true });
            }
            return messageOrInteraction.reply({ embeds: [embed] });
        }

        const errorText = '❌ Format: `!claimcompensation` atau `!claimcompensation info`';
        if (isInteraction) {
            const isDeferred = messageOrInteraction.deferred;
            if (isDeferred) {
                return messageOrInteraction.editReply({ content: errorText });
            }
            return messageOrInteraction.reply({ content: errorText, ephemeral: true });
        }
        return messageOrInteraction.reply(errorText);
    },

    // Admin functions
    async setUserCompensation(userId, packageType) {
        try {
            db.prepare('INSERT OR REPLACE INTO user_compensation (user_id, package_type, set_at) VALUES (?, ?, ?)').run(userId, packageType, Date.now());
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async setBulkCompensation(userIds, packageType) {
        const results = [];
        for (const uid of userIds) {
            const result = await this.setUserCompensation(uid, packageType);
            results.push({ userId: uid, ...result });
        }
        return results;
    }
};

