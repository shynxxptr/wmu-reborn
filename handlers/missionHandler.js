const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

// Mission Definitions
const MISSION_TYPES = {
    play_slots: { label: 'Main Slots', target: 5, reward: 50000 },
    win_coinflip: { label: 'Menang Coinflip', target: 3, reward: 75000 },
    play_math: { label: 'Main Math Game', target: 3, reward: 30000 },
    play_mines: { label: 'Main Minesweeper', target: 3, reward: 60000 },
    play_crash: { label: 'Main Saham (Crash)', target: 3, reward: 40000 },
    play_blackjack: { label: 'Main Blackjack', target: 3, reward: 45000 },
    win_blackjack: { label: 'Menang Blackjack', target: 2, reward: 80000 },
    do_work: { label: 'Kerja (Work Commands)', target: 10, reward: 35000 },
    play_bigslot: { label: 'Main BigSlot', target: 2, reward: 70000 },
    win_crash: { label: 'Menang Saham (Cashout)', target: 2, reward: 60000 },
    win_mines: { label: 'Menang Minesweeper (Cashout)', target: 2, reward: 55000 }
};

module.exports = {
    async handleMission(message, command, args) {
        const userId = message.author.id;
        const today = new Date().toDateString();

        // Get or Init Missions
        let data = db.getMissions(userId);
        let missions = [];

        if (!data || new Date(data.last_updated).toDateString() !== today) {
            // Reset / Init
            missions = Object.keys(MISSION_TYPES).map(key => ({
                type: key,
                progress: 0,
                claimed: false
            }));
            db.saveMissions(userId, missions);
        } else {
            missions = JSON.parse(data.missions);
        }

        // Claim Reward
        if (args[1] === 'claim') {
            const index = parseInt(args[2]) - 1;
            if (isNaN(index) || index < 0 || index >= missions.length) return message.reply('❌ Nomor misi tidak valid.');

            const mission = missions[index];
            const def = MISSION_TYPES[mission.type];

            if (mission.progress < def.target) return message.reply('❌ Misi belum selesai!');
            if (mission.claimed) return message.reply('❌ Reward sudah diklaim!');

            // Give Reward
            mission.claimed = true;
            db.updateBalance(userId, def.reward);
            db.saveMissions(userId, missions);

            return message.reply(`🎉 **Reward Diklaim!** Kamu dapat Rp ${formatMoney(def.reward)}.`);
        }

        // Display Missions
        const embed = new EmbedBuilder()
            .setTitle('📜 MISI HARIAN (Daily Missions)')
            .setDescription(`Selesaikan misi di bawah ini untuk dapat uang jajan tambahan! Reset setiap jam 00:00.`)
            .setColor('#FFD700')
            .setThumbnail(message.author.displayAvatarURL());

        let desc = '';
        missions.forEach((m, i) => {
            const def = MISSION_TYPES[m.type];
            const status = m.claimed ? '✅ KELAR' : (m.progress >= def.target ? '**[SIAP KLAIM]**' : `${m.progress}/${def.target}`);
            desc += `**${i + 1}. ${def.label}**\nReward: Rp ${formatMoney(def.reward)}\nProgress: ${status}\n\n`;
        });

        embed.addFields({ name: 'Daftar Misi', value: desc });
        embed.setFooter({ text: 'Ketik !misi claim <nomor> untuk ambil hadiah.' });

        message.reply({ embeds: [embed] });
    },

    trackMission(userId, type, amount = 1) {
        try {
            const today = new Date().toDateString();
            let data = db.getMissions(userId);
            let missions = [];

            if (!data || new Date(data.last_updated).toDateString() !== today) {
                // Init if not exists (Auto-create on first action)
                missions = Object.keys(MISSION_TYPES).map(key => ({
                    type: key,
                    progress: 0,
                    claimed: false
                }));
            } else {
                missions = JSON.parse(data.missions);
            }

            const mission = missions.find(m => m.type === type);
            if (mission && !mission.claimed && mission.progress < MISSION_TYPES[type].target) {
                mission.progress += amount;
                db.saveMissions(userId, missions);
            }
        } catch (e) {
            console.error('[MISSION TRACK ERROR]', e);
        }
    }
};
