const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

// DAILY CHALLENGES
const CHALLENGE_TYPES = {
    'win_5_games': {
        name: '🎮 Win 5 Games',
        description: 'Menang 5 kali di semua game',
        target: 5,
        reward: 20000000, // 20 Juta (2x max bet)
        check: (stats) => {
            const total = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                         (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                         (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            return total;
        }
    },
    'combo_10': {
        name: '🔥 Combo 10',
        description: 'Dapatkan combo 10 di game apapun',
        target: 10,
        reward: 30000000, // 30 Juta (3x max bet)
        check: (stats) => {
            return Math.max(
                stats.best_combo_bom || 0,
                stats.best_combo_math || 0,
                stats.best_combo_saham || 0
            );
        }
    },
    'streak_5': {
        name: '🪙 Streak 5',
        description: 'Dapatkan streak 5 di Coinflip',
        target: 5,
        reward: 25000000, // 25 Juta (2.5x max bet)
        check: (stats) => stats.best_streak_coinflip || 0
    },
    'play_20_games': {
        name: '🎰 Play 20 Games',
        description: 'Main 20 kali di semua game',
        target: 20,
        reward: 15000000, // 15 Juta (1.5x max bet)
        check: (stats) => {
            const total = (stats.total_games_bom || 0) + (stats.total_games_math || 0) + 
                         (stats.total_games_saham || 0) + (stats.total_games_coinflip || 0) +
                         (stats.total_games_slots || 0) + (stats.total_games_bigslot || 0);
            return total;
        }
    },
    'winrate_50': {
        name: '📈 Win Rate 50%',
        description: 'Dapatkan win rate 50%+ (min 10 games)',
        target: 50,
        reward: 50000000, // 50 Juta (5x max bet)
        check: (stats) => {
            const total = (stats.total_games_bom || 0) + (stats.total_games_math || 0) + 
                         (stats.total_games_saham || 0) + (stats.total_games_coinflip || 0) +
                         (stats.total_games_slots || 0) + (stats.total_games_bigslot || 0);
            const wins = (stats.total_wins_bom || 0) + (stats.total_wins_math || 0) + 
                        (stats.total_wins_saham || 0) + (stats.total_wins_coinflip || 0) +
                        (stats.total_wins_slots || 0) + (stats.total_wins_bigslot || 0);
            if (total < 10) return 0;
            return (wins / total) * 100;
        }
    }
};

// Database table for daily challenges
db.exec(`
    CREATE TABLE IF NOT EXISTS daily_challenges (
        user_id TEXT PRIMARY KEY,
        challenge_data TEXT,
        last_reset INTEGER,
        completed_challenges TEXT DEFAULT '[]'
    )
`);

// Helper functions
db.getDailyChallenge = (userId) => {
    try {
        let row = db.prepare('SELECT * FROM daily_challenges WHERE user_id = ?').get(userId);
        if (!row) {
            db.prepare('INSERT INTO daily_challenges (user_id, challenge_data, last_reset, completed_challenges) VALUES (?, ?, ?, ?)')
                .run(userId, '{}', Date.now(), '[]');
            row = db.prepare('SELECT * FROM daily_challenges WHERE user_id = ?').get(userId);
        }
        return row;
    } catch (e) {
        return null;
    }
};

db.updateDailyChallenge = (userId, challengeData, completed) => {
    try {
        db.prepare('UPDATE daily_challenges SET challenge_data = ?, completed_challenges = ? WHERE user_id = ?')
            .run(JSON.stringify(challengeData), JSON.stringify(completed), userId);
        return true;
    } catch (e) {
        return false;
    }
};

db.resetDailyChallenge = (userId) => {
    try {
        db.prepare('UPDATE daily_challenges SET challenge_data = ?, completed_challenges = ?, last_reset = ? WHERE user_id = ?')
            .run('{}', '[]', Date.now(), userId);
        return true;
    } catch (e) {
        return false;
    }
};

module.exports = {
    CHALLENGE_TYPES,
    
    // Generate daily challenges
    generateDailyChallenges(userId) {
        const challenge = db.getDailyChallenge(userId);
        if (!challenge) return null;
        
        // Check if need reset (24 hours)
        const now = Date.now();
        const lastReset = challenge.last_reset || 0;
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (now - lastReset >= oneDay) {
            db.resetDailyChallenge(userId);
        }
        
        let challengeData = {};
        try {
            challengeData = JSON.parse(challenge.challenge_data || '{}');
        } catch (e) {
            challengeData = {};
        }
        
        // Generate 3 random challenges if not exists
        if (Object.keys(challengeData).length === 0) {
            const types = Object.keys(CHALLENGE_TYPES);
            const selected = [];
            while (selected.length < 3 && selected.length < types.length) {
                const random = types[Math.floor(Math.random() * types.length)];
                if (!selected.includes(random)) {
                    selected.push(random);
                }
            }
            
            selected.forEach((type, idx) => {
                challengeData[`challenge_${idx + 1}`] = {
                    type,
                    progress: 0,
                    completed: false
                };
            });
            
            db.updateDailyChallenge(userId, challengeData, []);
        }
        
        return challengeData;
    },
    
    // Check challenge progress
    checkChallengeProgress(userId) {
        const challenge = db.getDailyChallenge(userId);
        if (!challenge) return null;
        
        let challengeData = {};
        try {
            challengeData = JSON.parse(challenge.challenge_data || '{}');
        } catch (e) {
            return null;
        }
        
        let completed = [];
        try {
            completed = JSON.parse(challenge.completed_challenges || '[]');
        } catch (e) {
            completed = [];
        }
        
        const stats = db.getUserStats(userId);
        const updated = { ...challengeData };
        let hasUpdate = false;
        
        for (const [key, data] of Object.entries(challengeData)) {
            if (data.completed || completed.includes(key)) continue;
            
            const challengeType = CHALLENGE_TYPES[data.type];
            if (!challengeType) continue;
            
            const current = challengeType.check(stats);
            const progress = Math.min(current, challengeType.target);
            
            if (progress !== data.progress) {
                updated[key].progress = progress;
                hasUpdate = true;
            }
            
            if (progress >= challengeType.target && !data.completed) {
                updated[key].completed = true;
                hasUpdate = true;
            }
        }
        
        if (hasUpdate) {
            db.updateDailyChallenge(userId, updated, completed);
        }
        
        return updated;
    },
    
    // Claim challenge reward
    claimChallengeReward(userId, challengeKey) {
        const challenge = db.getDailyChallenge(userId);
        if (!challenge) return { success: false, error: 'Challenge not found' };
        
        let challengeData = {};
        try {
            challengeData = JSON.parse(challenge.challenge_data || '{}');
        } catch (e) {
            return { success: false, error: 'Invalid challenge data' };
        }
        
        let completed = [];
        try {
            completed = JSON.parse(challenge.completed_challenges || '[]');
        } catch (e) {
            completed = [];
        }
        
        const data = challengeData[challengeKey];
        if (!data || !data.completed || completed.includes(challengeKey)) {
            return { success: false, error: 'Challenge not completed or already claimed' };
        }
        
        const challengeType = CHALLENGE_TYPES[data.type];
        if (!challengeType) {
            return { success: false, error: 'Invalid challenge type' };
        }
        
        // Give reward
        db.updateBalance(userId, challengeType.reward);
        completed.push(challengeKey);
        db.updateDailyChallenge(userId, challengeData, completed);
        
        return { success: true, reward: challengeType.reward };
    },
    
    // Show daily challenges
    async showDailyChallenges(message) {
        const userId = message.author.id;
        const challenges = this.generateDailyChallenges(userId);
        const progress = this.checkChallengeProgress(userId);
        
        if (!challenges || !progress) {
            return message.reply('❌ Error loading daily challenges.');
        }
        
        const challenge = db.getDailyChallenge(userId);
        let completed = [];
        try {
            completed = JSON.parse(challenge.completed_challenges || '[]');
        } catch (e) {
            completed = [];
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📅 DAILY CHALLENGES')
            .setColor('#00FF00')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription('**Selesaikan challenge untuk dapat reward harian!**\n\n' +
                          `⏰ **Reset:** <t:${Math.floor((challenge.last_reset + 24 * 60 * 60 * 1000) / 1000)}:R>`);
        
        for (const [key, data] of Object.entries(progress)) {
            const challengeType = CHALLENGE_TYPES[data.type];
            if (!challengeType) continue;
            
            const isCompleted = data.completed && completed.includes(key);
            const progressBar = '█'.repeat(Math.round((data.progress / challengeType.target) * 10)) + 
                              '░'.repeat(10 - Math.round((data.progress / challengeType.target) * 10));
            const status = isCompleted ? '✅ **COMPLETED**' : `${data.progress}/${challengeType.target}`;
            
            embed.addFields({
                name: `${isCompleted ? '✅' : '⏳'} ${challengeType.name}`,
                value: `${challengeType.description}\n` +
                      `\`\`\`\n${progressBar} ${status}\n\`\`\`\n` +
                      `💰 Reward: \`Rp ${formatMoney(challengeType.reward)}\`\n` +
                      (isCompleted ? '**Gunakan `!claimchallenge` untuk claim reward!**' : ''),
                inline: false
            });
        }
        
        embed.setFooter({ text: 'Daily challenges reset setiap 24 jam • Gunakan !claimchallenge untuk claim' })
            .setTimestamp();
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_challenges')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary)
        );
        
        return message.reply({ embeds: [embed], components: [row] });
    }
};

