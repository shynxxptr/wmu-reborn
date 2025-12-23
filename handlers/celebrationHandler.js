const { EmbedBuilder } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

// CELEBRATION MESSAGES & VISUAL EFFECTS
const CELEBRATIONS = {
    // Milestone celebrations
    milestone_100: {
        title: '🎉 MILESTONE 100 WINS!',
        message: 'Kamu baru saja mencapai **100 wins**!',
        emoji: ['🎉', '🎊', '🏆', '⭐', '✨'],
        color: '#FFD700'
    },
    milestone_500: {
        title: '🔥 MILESTONE 500 WINS!',
        message: 'Kamu baru saja mencapai **500 wins**!',
        emoji: ['🔥', '💎', '👑', '⭐', '✨', '🎉'],
        color: '#FF4500'
    },
    milestone_1000: {
        title: '🚀 MILESTONE 1000 WINS!',
        message: 'Kamu baru saja mencapai **1000 wins**!',
        emoji: ['🚀', '💎', '👑', '⭐', '✨', '🎉', '🎊', '🏆'],
        color: '#00FF00'
    },
    
    // Combo celebrations
    combo_10: {
        title: '🔥 COMBO MASTER!',
        message: 'Kamu mencapai **Combo 10**!',
        emoji: ['🔥', '💥', '⚡'],
        color: '#FF6600'
    },
    combo_20: {
        title: '💥 COMBO LEGEND!',
        message: 'Kamu mencapai **Combo 20**!',
        emoji: ['💥', '🔥', '⚡', '⭐'],
        color: '#FF0000'
    },
    
    // Streak celebrations
    streak_10: {
        title: '🪙 STREAK KING!',
        message: 'Kamu mencapai **Streak 10**!',
        emoji: ['🪙', '👑', '⭐'],
        color: '#FFD700'
    },
    streak_20: {
        title: '👑 STREAK LEGEND!',
        message: 'Kamu mencapai **Streak 20**!',
        emoji: ['👑', '💎', '⭐', '✨'],
        color: '#C0C0C0'
    },
    
    // Achievement unlock
    achievement_unlock: {
        title: '🏅 ACHIEVEMENT UNLOCKED!',
        message: 'Kamu baru saja unlock achievement baru!',
        emoji: ['🏅', '⭐', '✨', '🎉'],
        color: '#00FF00'
    },
    
    // Big win
    big_win: {
        title: '💰 BIG WIN!',
        message: 'Kamu mendapatkan kemenangan besar!',
        emoji: ['💰', '💎', '🎉'],
        color: '#00FF00'
    }
};

// ASCII Art for celebrations
const ASCII_ART = {
    celebration: `
    ╔═══════════════════════════════╗
    ║   🎉  CELEBRATION!  🎉        ║
    ╚═══════════════════════════════╝
    `,
    achievement: `
    ╔═══════════════════════════════╗
    ║   🏅  ACHIEVEMENT!  🏅        ║
    ╚═══════════════════════════════╝
    `,
    milestone: `
    ╔═══════════════════════════════╗
    ║   🚀  MILESTONE!  🚀          ║
    ╚═══════════════════════════════╝
    `
};

module.exports = {
    CELEBRATIONS,
    ASCII_ART,
    
    // Send celebration message
    async sendCelebration(channel, type, details = {}) {
        const celebration = CELEBRATIONS[type];
        if (!celebration) return null;
        
        const embed = new EmbedBuilder()
            .setTitle(celebration.title)
            .setColor(celebration.color)
            .setDescription(celebration.message + (details.message || ''))
            .setTimestamp();
        
        if (details.user) {
            embed.setAuthor({ 
                name: details.user.username, 
                iconURL: details.user.displayAvatarURL({ dynamic: true }) 
            })
            .setThumbnail(details.user.displayAvatarURL({ dynamic: true, size: 256 }));
        }
        
        if (details.stats) {
            embed.addFields({
                name: '📊 Current Stats',
                value: details.stats,
                inline: false
            });
        }
        
        if (details.reward) {
            embed.addFields({
                name: '💰 Reward',
                value: `\`Rp ${formatMoney(details.reward)}\``,
                inline: true
            });
        }
        
        const message = await channel.send({ embeds: [embed] });
        
        // Add reactions
        if (celebration.emoji && celebration.emoji.length > 0) {
            for (const emoji of celebration.emoji.slice(0, 5)) { // Max 5 reactions
                try {
                    await message.react(emoji);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Delay between reactions
                } catch (e) {
                    // Ignore reaction errors
                }
            }
        }
        
        return message;
    },
    
    // Check and celebrate milestones
    async checkMilestones(userId, channel, user, stats) {
        const totalWins = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
        
        // Check milestone achievements
        const milestones = [
            { count: 100, type: 'milestone_100' },
            { count: 500, type: 'milestone_500' },
            { count: 1000, type: 'milestone_1000' }
        ];
        
        for (const milestone of milestones) {
            if (totalWins === milestone.count) {
                await this.sendCelebration(channel, milestone.type, {
                    user,
                    stats: `Total Wins: **${totalWins}**`,
                    message: `\n\n${ASCII_ART.milestone}`
                });
                break; // Only celebrate once
            }
        }
    },
    
    // Celebrate combo milestones
    async celebrateCombo(channel, user, gameType, comboCount) {
        if (comboCount === 10) {
            await this.sendCelebration(channel, 'combo_10', {
                user,
                stats: `**${gameType.toUpperCase()}** Combo: **${comboCount}x**`,
                message: `\n\n🔥 **COMBO MASTER!**`
            });
        } else if (comboCount === 20) {
            await this.sendCelebration(channel, 'combo_20', {
                user,
                stats: `**${gameType.toUpperCase()}** Combo: **${comboCount}x**`,
                message: `\n\n💥 **COMBO LEGEND!**`
            });
        }
    },
    
    // Celebrate streak milestones
    async celebrateStreak(channel, user, streakCount) {
        if (streakCount === 10) {
            await this.sendCelebration(channel, 'streak_10', {
                user,
                stats: `Streak: **${streakCount}x**`,
                message: `\n\n🪙 **STREAK KING!**`
            });
        } else if (streakCount === 20) {
            await this.sendCelebration(channel, 'streak_20', {
                user,
                stats: `Streak: **${streakCount}x**`,
                message: `\n\n👑 **STREAK LEGEND!**`
            });
        }
    },
    
    // Celebrate achievement unlock
    async celebrateAchievement(channel, user, achievementName, reward) {
        await this.sendCelebration(channel, 'achievement_unlock', {
            user,
            message: `\n\n**${achievementName}**\n${ASCII_ART.achievement}`,
            reward,
            stats: `Gunakan \`!claim\` untuk claim reward!`
        });
    },
    
    // Celebrate big win
    async celebrateBigWin(channel, user, winAmount, multiplier) {
        if (winAmount >= 10000000) { // 10 Juta+
            await this.sendCelebration(channel, 'big_win', {
                user,
                message: `\n\n💰 **Rp ${formatMoney(winAmount)}**\nMultiplier: **${multiplier}x**`,
                stats: `🎉 **BIG WIN!**`
            });
        }
    }
};



