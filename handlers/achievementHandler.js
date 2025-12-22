const { EmbedBuilder } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

// ACHIEVEMENT DEFINITIONS - REWARD FANTASTIS!
const ACHIEVEMENTS = {
    // COMBO ACHIEVEMENTS
    'combo_bom_5': {
        name: '💣 Combo Master Level 1',
        description: 'Dapatkan combo 5 di game Bom',
        reward: 50000000, // 50 Juta (5x max bet) - Tetap
        check: (stats) => stats.best_combo_bom >= 5
    },
    'combo_bom_10': {
        name: '💣 Combo Master Level 2',
        description: 'Dapatkan combo 10 di game Bom',
        reward: 100000000, // 100 Juta (10x max bet) - Turunkan dari 200 Juta
        check: (stats) => stats.best_combo_bom >= 10
    },
    'combo_bom_15': {
        name: '💣 Combo Master Level 3',
        description: 'Dapatkan combo 15 di game Bom',
        reward: 200000000, // 200 Juta (20x max bet) - Turunkan dari 500 Juta
        check: (stats) => stats.best_combo_bom >= 15
    },
    'combo_math_10': {
        name: '🧮 Math Genius Level 1',
        description: 'Dapatkan combo 10 di game Math',
        reward: 100000000, // 100 Juta (10x max bet) - Tetap
        check: (stats) => stats.best_combo_math >= 10
    },
    'combo_math_20': {
        name: '🧮 Math Genius Level 2',
        description: 'Dapatkan combo 20 di game Math',
        reward: 200000000, // 200 Juta (20x max bet) - Turunkan dari 500 Juta
        check: (stats) => stats.best_combo_math >= 20
    },
    'combo_math_30': {
        name: '🧮 Math Genius Level 3',
        description: 'Dapatkan combo 30 di game Math',
        reward: 300000000, // 300 Juta (30x max bet) - Turunkan dari 1 Milyar
        check: (stats) => stats.best_combo_math >= 30
    },
    'combo_saham_5': {
        name: '📈 Crash Master Level 1',
        description: 'Dapatkan combo 5 di game Saham',
        reward: 100000000, // 100 Juta (10x max bet) - Tetap
        check: (stats) => stats.best_combo_saham >= 5
    },
    'combo_saham_10': {
        name: '📈 Crash Master Level 2',
        description: 'Dapatkan combo 10 di game Saham',
        reward: 200000000, // 200 Juta (20x max bet) - Turunkan dari 500 Juta
        check: (stats) => stats.best_combo_saham >= 10
    },
    'combo_saham_20': {
        name: '📈 Crash Master Level 3',
        description: 'Dapatkan combo 20 di game Saham',
        reward: 400000000, // 400 Juta (40x max bet) - Turunkan dari 2 Milyar
        check: (stats) => stats.best_combo_saham >= 20
    },
    
    // STREAK ACHIEVEMENTS
    'streak_coinflip_5': {
        name: '🪙 Streak King Level 1',
        description: 'Dapatkan streak 5 di game Coinflip',
        reward: 100000000, // 100 Juta (10x max bet) - Tetap
        check: (stats) => stats.best_streak_coinflip >= 5
    },
    'streak_coinflip_10': {
        name: '🪙 Streak King Level 2',
        description: 'Dapatkan streak 10 di game Coinflip',
        reward: 200000000, // 200 Juta (20x max bet) - Turunkan dari 500 Juta
        check: (stats) => stats.best_streak_coinflip >= 10
    },
    'streak_coinflip_20': {
        name: '🪙 Streak King Level 3',
        description: 'Dapatkan streak 20 di game Coinflip',
        reward: 400000000, // 400 Juta (40x max bet) - Turunkan dari 2 Milyar
        check: (stats) => stats.best_streak_coinflip >= 20
    },
    
    // TIMING ACHIEVEMENTS
    'timing_slots_perfect': {
        name: '✨ Perfect Timing Master',
        description: 'Dapatkan perfect timing x2 di game Slots',
        reward: 200000000, // 200 Juta (20x max bet) - Turunkan dari 500 Juta
        check: (stats) => stats.best_timing_slots >= 2.0
    },
    
    // WIN RATE ACHIEVEMENTS
    'winrate_bom_50': {
        name: '💣 Bom Expert',
        description: 'Win rate 50%+ di game Bom (min 100 games)',
        reward: 150000000, // 150 Juta (15x max bet) - Turunkan dari 200 Juta
        check: (stats) => {
            const total = stats.total_games_bom || 0;
            const wins = stats.total_wins_bom || 0;
            return total >= 100 && (wins / total) >= 0.50;
        }
    },
    'winrate_math_60': {
        name: '🧮 Math Expert',
        description: 'Win rate 60%+ di game Math (min 100 games)',
        reward: 200000000, // 200 Juta (20x max bet) - Turunkan dari 300 Juta
        check: (stats) => {
            const total = stats.total_games_math || 0;
            const wins = stats.total_wins_math || 0;
            return total >= 100 && (wins / total) >= 0.60;
        }
    },
    'winrate_saham_40': {
        name: '📈 Saham Expert',
        description: 'Win rate 40%+ di game Saham (min 100 games)',
        reward: 250000000, // 250 Juta (25x max bet) - Turunkan dari 500 Juta
        check: (stats) => {
            const total = stats.total_games_saham || 0;
            const wins = stats.total_wins_saham || 0;
            return total >= 100 && (wins / total) >= 0.40;
        }
    },
    
    // TOTAL WINS ACHIEVEMENTS
    'total_wins_100': {
        name: '🏆 First Hundred',
        description: 'Menang 100 kali di semua game',
        reward: 100000000, // 100 Juta (10x max bet) - Tetap
        check: (stats) => {
            const total = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            return total >= 100;
        }
    },
    'total_wins_500': {
        name: '🏆 Five Hundred',
        description: 'Menang 500 kali di semua game',
        reward: 200000000, // 200 Juta (20x max bet) - Turunkan dari 500 Juta
        check: (stats) => {
            const total = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            return total >= 500;
        }
    },
    'total_wins_1000': {
        name: '🏆 Thousand Wins',
        description: 'Menang 1000 kali di semua game',
        reward: 300000000, // 300 Juta (30x max bet) - Turunkan dari 2 Milyar
        check: (stats) => {
            const total = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            return total >= 1000;
        }
    },
    'total_wins_5000': {
        name: '🏆 Five Thousand',
        description: 'Menang 5000 kali di semua game',
        reward: 400000000, // 400 Juta (40x max bet) - Turunkan dari 10 Milyar
        check: (stats) => {
            const total = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            return total >= 5000;
        }
    },
    'total_wins_10000': {
        name: '🏆 Ten Thousand',
        description: 'Menang 10000 kali di semua game',
        reward: 450000000, // 450 Juta (45x max bet) - Turunkan dari 50 Milyar
        check: (stats) => {
            const total = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            return total >= 10000;
        }
    },
    'total_wins_50000': {
        name: '🏆 Fifty Thousand',
        description: 'Menang 50000 kali di semua game',
        reward: 480000000, // 480 Juta (48x max bet) - Turunkan dari 500 Milyar
        check: (stats) => {
            const total = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            return total >= 50000;
        }
    },
    'total_wins_100000': {
        name: '🏆 Hundred Thousand',
        description: 'Menang 100000 kali di semua game',
        reward: 500000000, // 500 Juta (50x max bet) - Turunkan dari 1 Triliun
        check: (stats) => {
            const total = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            return total >= 100000;
        }
    }
};

module.exports = {
    ACHIEVEMENTS,
    
    async handlePencapaian(message) {
        const userId = message.author.id;
        const stats = db.getUserStats(userId);
        
        if (!stats) {
            return message.reply('❌ Data statistik tidak ditemukan.');
        }
        
        // Calculate win rates
        const getWinRate = (wins, total) => {
            if (total === 0) return { percent: '0%', value: 0 };
            const percent = ((wins / total) * 100).toFixed(1) + '%';
            return { percent, value: (wins / total) * 100 };
        };
        
        const winRateBom = getWinRate(stats.total_wins_bom || 0, stats.total_games_bom || 0);
        const winRateMath = getWinRate(stats.total_wins_math || 0, stats.total_games_math || 0);
        const winRateSaham = getWinRate(stats.total_wins_saham || 0, stats.total_games_saham || 0);
        const winRateCoinflip = getWinRate(stats.total_wins_coinflip || 0, stats.total_games_coinflip || 0);
        const winRateSlots = getWinRate(stats.total_wins_slots || 0, stats.total_games_slots || 0);
        const winRateBigslot = getWinRate(stats.total_wins_bigslot || 0, stats.total_games_bigslot || 0);
        
        // Total stats
        const totalGames = (stats.total_games_bom || 0) + (stats.total_games_math || 0) + 
                          (stats.total_games_saham || 0) + (stats.total_games_coinflip || 0) +
                          (stats.total_games_slots || 0) + (stats.total_games_bigslot || 0);
        const totalWins = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
        const overallWinRate = getWinRate(totalWins, totalGames);
        
        // Progress bar helper
        const getProgressBar = (value, max = 100) => {
            const filled = Math.round((value / max) * 10);
            const empty = 10 - filled;
            return '█'.repeat(filled) + '░'.repeat(empty);
        };
        
        // Color based on overall win rate
        const getColor = (rate) => {
            if (rate >= 60) return '#00FF00'; // Green - Excellent
            if (rate >= 50) return '#7FFF00'; // Light Green - Good
            if (rate >= 40) return '#FFD700'; // Gold - Average
            if (rate >= 30) return '#FF8C00'; // Orange - Below Average
            return '#FF4500'; // Red - Poor
        };
        
        // Build embed
        const embed = new EmbedBuilder()
            .setTitle('📊 PENCAPAIAN & STATISTIK')
            .setColor(getColor(overallWinRate.value))
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(`**Statistik lengkap untuk <@${userId}>**\n\n` +
                          `📊 **Overall Win Rate:** ${overallWinRate.percent}\n` +
                          `${getProgressBar(overallWinRate.value)}`)
            .addFields(
                {
                    name: '🏆 PERSONAL RECORDS',
                    value: `💣 **Best Combo Bom:** \`${stats.best_combo_bom || 0}x\`\n` +
                           `🧮 **Best Combo Math:** \`${stats.best_combo_math || 0}x\`\n` +
                           `📈 **Best Combo Saham:** \`${stats.best_combo_saham || 0}x\`\n` +
                           `🪙 **Best Streak Coinflip:** \`${stats.best_streak_coinflip || 0}x\`\n` +
                           `✨ **Best Timing Slots:** \`${stats.best_timing_slots ? stats.best_timing_slots.toFixed(2) + 'x' : '0x'}\``,
                    inline: true
                },
                {
                    name: '📈 WIN RATE PER GAME',
                    value: `💣 **Bom:** ${winRateBom.percent} \`${stats.total_wins_bom || 0}/${stats.total_games_bom || 0}\`\n` +
                           `${getProgressBar(winRateBom.value)}\n` +
                           `🧮 **Math:** ${winRateMath.percent} \`${stats.total_wins_math || 0}/${stats.total_games_math || 0}\`\n` +
                           `${getProgressBar(winRateMath.value)}\n` +
                           `📈 **Saham:** ${winRateSaham.percent} \`${stats.total_wins_saham || 0}/${stats.total_games_saham || 0}\`\n` +
                           `${getProgressBar(winRateSaham.value)}\n` +
                           `🪙 **Coinflip:** ${winRateCoinflip.percent} \`${stats.total_wins_coinflip || 0}/${stats.total_games_coinflip || 0}\`\n` +
                           `${getProgressBar(winRateCoinflip.value)}\n` +
                           `🎰 **Slots:** ${winRateSlots.percent} \`${stats.total_wins_slots || 0}/${stats.total_games_slots || 0}\`\n` +
                           `${getProgressBar(winRateSlots.value)}\n` +
                           `🎰 **BigSlot:** ${winRateBigslot.percent} \`${stats.total_wins_bigslot || 0}/${stats.total_games_bigslot || 0}\`\n` +
                           `${getProgressBar(winRateBigslot.value)}`,
                    inline: true
                },
                {
                    name: '📊 OVERALL STATISTICS',
                    value: `🎮 **Total Games:** \`${totalGames.toLocaleString('id-ID')}\`\n` +
                           `✅ **Total Wins:** \`${totalWins.toLocaleString('id-ID')}\`\n` +
                           `❌ **Total Losses:** \`${(totalGames - totalWins).toLocaleString('id-ID')}\`\n` +
                           `📈 **Win Rate:** \`${overallWinRate.percent}\`\n` +
                           `${getProgressBar(overallWinRate.value)}`,
                    inline: false
                }
            );
        
        // Check achievements
        const userAchievements = db.getUserAchievements(userId);
        const unlockedIds = userAchievements.map(a => a.achievement_id);
        const unclaimed = userAchievements.filter(a => !a.claimed);
        
        if (unclaimed.length > 0) {
            embed.addFields({
                name: `🎁 ACHIEVEMENTS BELUM DI-CLAIM (${unclaimed.length})`,
                value: `Kamu punya **${unclaimed.length}** achievement yang belum di-claim!\n` +
                       `💰 **Total Reward:** \`Rp ${formatMoney(unclaimed.reduce((sum, a) => {
                           const ach = ACHIEVEMENTS[a.achievement_id];
                           return sum + (ach ? ach.reward : 0);
                       }, 0))}\`\n\n` +
                       `Gunakan \`!claim\` untuk claim semua reward!`,
                inline: false
            });
        }
        
        if (unlockedIds.length > 0) {
            embed.addFields({
                name: '🏅 ACHIEVEMENTS UNLOCKED',
                value: `**${unlockedIds.length}** achievement unlocked dari **${Object.keys(ACHIEVEMENTS).length}** total`,
                inline: true
            });
        }
        
        embed.setFooter({ 
            text: `Gunakan !achievements untuk lihat semua achievement • ${new Date().toLocaleString('id-ID')}` 
        })
        .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    },
    
    async checkAchievements(userId, channel = null, user = null) {
        try {
            const stats = db.getUserStats(userId);
            if (!stats) return [];
            
            const unlocked = [];
            
            for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
                try {
                    if (!db.hasAchievement(userId, id) && achievement.check(stats)) {
                        const isNew = db.unlockAchievement(userId, id);
                        if (isNew) {
                            unlocked.push({ id, ...achievement });
                            
                            // Real-time celebration if channel and user provided
                            if (channel && user) {
                                try {
                                    const celebrationHandler = require('./celebrationHandler.js');
                                    await celebrationHandler.celebrateAchievement(
                                        channel, 
                                        user, 
                                        achievement.name, 
                                        achievement.reward
                                    );
                                } catch (e) {
                                    console.error('[CELEBRATION ERROR]', e);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[ACHIEVEMENT CHECK ERROR] ${id}:`, e);
                }
            }
            
            return unlocked;
        } catch (e) {
            console.error('[CHECK ACHIEVEMENTS ERROR]', e);
            return [];
        }
    },
    
    async handleClaim(message) {
        const userId = message.author.id;
        const achievements = db.getUserAchievements(userId);
        const unclaimed = achievements.filter(a => !a.claimed);
        
        if (unclaimed.length === 0) {
            return message.reply('❌ Tidak ada achievement yang bisa di-claim.');
        }
        
        let totalReward = 0;
        const claimedIds = [];
        
        for (const ach of unclaimed) {
            const achievement = ACHIEVEMENTS[ach.achievement_id];
            if (achievement) {
                totalReward += achievement.reward;
                db.claimAchievement(userId, ach.achievement_id);
                claimedIds.push(achievement.name);
            }
        }
        
        if (totalReward > 0) {
            db.updateBalance(userId, totalReward);
            
            const embed = new EmbedBuilder()
                .setTitle('🎉 ACHIEVEMENT REWARD CLAIMED!')
                .setColor('#00FF00')
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`**Selamat! Kamu berhasil claim ${claimedIds.length} achievement!**\n\n` +
                              `💰 **Total Reward:**\n` +
                              `\`\`\`\nRp ${formatMoney(totalReward)}\n\`\`\``)
                .addFields({
                    name: `🏅 Achievement yang di-claim (${claimedIds.length}):`,
                    value: claimedIds.length > 15 
                        ? claimedIds.slice(0, 15).map((name, idx) => `\`${idx + 1}.\` ${name}`).join('\n') + `\n\n*... dan ${claimedIds.length - 15} achievement lainnya*`
                        : claimedIds.map((name, idx) => `\`${idx + 1}.\` ${name}`).join('\n'),
                    inline: false
                })
                .setFooter({ 
                    text: `Claimed by ${message.author.username} • ${new Date().toLocaleString('id-ID')}` 
                })
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }
        
        return message.reply('❌ Error saat claim achievement.');
    },
    
    async handleAchievements(message) {
        const userId = message.author.id;
        const stats = db.getUserStats(userId);
        const userAchievements = db.getUserAchievements(userId);
        const unlockedIds = userAchievements.map(a => a.achievement_id);
        
        // Group achievements by category
        const categories = {
            'COMBO': [],
            'STREAK': [],
            'TIMING': [],
            'WIN RATE': [],
            'TOTAL WINS': []
        };
        
        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
            const isUnlocked = unlockedIds.includes(id);
            const canUnlock = achievement.check(stats);
            const status = isUnlocked ? '✅' : (canUnlock ? '🔓' : '🔒');
            
            const achData = {
                ...achievement,
                id,
                status,
                isUnlocked,
                isClaimed: isUnlocked && userAchievements.find(a => a.achievement_id === id)?.claimed
            };
            
            if (id.startsWith('combo_')) categories['COMBO'].push(achData);
            else if (id.startsWith('streak_')) categories['STREAK'].push(achData);
            else if (id.startsWith('timing_')) categories['TIMING'].push(achData);
            else if (id.startsWith('winrate_')) categories['WIN RATE'].push(achData);
            else if (id.startsWith('total_wins_')) categories['TOTAL WINS'].push(achData);
        }
        
        // Calculate progress
        const totalAchievements = Object.keys(ACHIEVEMENTS).length;
        const unlockedCount = unlockedIds.length;
        const progressPercent = ((unlockedCount / totalAchievements) * 100).toFixed(1);
        const progressBar = '█'.repeat(Math.round((unlockedCount / totalAchievements) * 20)) + 
                           '░'.repeat(20 - Math.round((unlockedCount / totalAchievements) * 20));
        
        // Color based on progress
        const getProgressColor = (percent) => {
            if (percent >= 80) return '#00FF00'; // Green
            if (percent >= 60) return '#7FFF00'; // Light Green
            if (percent >= 40) return '#FFD700'; // Gold
            if (percent >= 20) return '#FF8C00'; // Orange
            return '#FF4500'; // Red
        };
        
        const embed = new EmbedBuilder()
            .setTitle('🏅 ACHIEVEMENTS')
            .setColor(getProgressColor(parseFloat(progressPercent)))
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(`**Achievement Progress:**\n` +
                          `\`\`\`\n${progressBar}\n${unlockedCount}/${totalAchievements} (${progressPercent}%)\n\`\`\`\n\n` +
                          `**Legend:** ✅ Unlocked | 🔓 Can Unlock | 🔒 Locked | 🎁 Unclaimed`);
        
        for (const [category, achievements] of Object.entries(categories)) {
            if (achievements.length > 0) {
                const unlockedInCategory = achievements.filter(a => a.isUnlocked).length;
                const value = achievements.map(ach => {
                    const rewardText = formatMoney(ach.reward);
                    const claimText = ach.isUnlocked && !ach.isClaimed ? ' 🎁' : '';
                    const desc = ach.description ? `\n   └ ${ach.description}` : '';
                    return `${ach.status} **${ach.name}** - ${rewardText}${claimText}${desc}`;
                }).join('\n\n');
                
                embed.addFields({
                    name: `📋 ${category} (${unlockedInCategory}/${achievements.length})`,
                    value: value || 'Tidak ada',
                    inline: false
                });
            }
        }
        
        const unclaimedCount = userAchievements.filter(a => !a.claimed).length;
        const unclaimedReward = userAchievements
            .filter(a => !a.claimed)
            .reduce((sum, a) => {
                const ach = ACHIEVEMENTS[a.achievement_id];
                return sum + (ach ? ach.reward : 0);
            }, 0);
        
        if (unclaimedCount > 0) {
            embed.addFields({
                name: `🎁 UNCLAIMED REWARDS (${unclaimedCount})`,
                value: `Kamu punya **${unclaimedCount}** achievement yang belum di-claim!\n` +
                       `💰 **Total Reward:** \`Rp ${formatMoney(unclaimedReward)}\`\n\n` +
                       `Gunakan \`!claim\` untuk claim semua reward!`,
                inline: false
            });
        }
        
        embed.setFooter({ 
            text: `Gunakan !pencapaian untuk lihat statistik lengkap • ${new Date().toLocaleString('id-ID')}` 
        })
        .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
};

