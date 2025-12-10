const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

const ESKUL_LIST = {
    'futsal': {
        label: 'Futsal',
        desc: 'Limit Kerja +5 (Stamina Kuda).',
        cost: 50000,
        emoji: '⚽'
    },
    'pramuka': {
        label: 'Pramuka',
        desc: 'Tahan Lapar & Haus (Survival Skill).',
        cost: 30000,
        emoji: '⚜️'
    },
    'rohis': {
        label: 'Rohis',
        desc: 'Luck Boost (Doa Anak Sholeh).',
        cost: 20000,
        emoji: '🕌'
    },
    'pmr': {
        label: 'PMR',
        desc: 'Stress Relief Cepat (Anak Kesehatan).',
        cost: 40000,
        emoji: '🏥'
    }
};

module.exports = {
    ESKUL_LIST,

    async handleEskul(message, args) {
        const sub = args[1];
        const userId = message.author.id;

        if (!sub) {
            const embed = new EmbedBuilder()
                .setTitle('🏫 DAFTAR EKSKUL SEKOLAH')
                .setColor('#00AAFF')
                .setDescription('Join ekskul untuk dapat buff permanen! (Bayar Mingguan)')
                .setFooter({ text: 'Gunakan !eskul join <nama> untuk bergabung.' });

            Object.keys(ESKUL_LIST).forEach(key => {
                const e = ESKUL_LIST[key];
                embed.addFields({ name: `${e.emoji} ${e.label}`, value: `Biaya: Rp ${formatMoney(e.cost)}\nEfek: ${e.desc}`, inline: false });
            });

            const current = db.getEskul(userId);
            if (current) {
                embed.addFields({ name: '📂 Status Kamu', value: `Kamu anggota **${ESKUL_LIST[current].label}**.` });
            }

            return message.reply({ embeds: [embed] });
        }

        if (sub === 'join') {
            const choice = args[2] ? args[2].toLowerCase() : null;
            if (!choice || !ESKUL_LIST[choice]) return message.reply('❌ Ekskul tidak ditemukan. Cek `!eskul` untuk daftar.');

            // Check if already joined
            const currentEskul = db.getEskul(userId);
            if (currentEskul) {
                return message.reply(`❌ **Gak bisa selingkuh!**\nKamu sudah gabung di **${ESKUL_LIST[currentEskul.eskul_name].label}**.\nKetik \`!eskul leave\` dulu kalau mau pindah.`);
            }

            const eskul = ESKUL_LIST[choice];
            const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);

            if (!user || user.uang_jajan < eskul.cost) {
                return message.reply(`💸 **Uang Kurang!** Biaya masuk: Rp ${formatMoney(eskul.cost)}.`);
            }

            // Deduct Money
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(eskul.cost, userId);

            // Join DB
            db.joinEskul(userId, choice);

            return message.reply(`✅ **Selamat Bergabung!**\nKamu sekarang resmi menjadi anggota **${eskul.label}**.\n*Buff aktif: ${eskul.desc}*`);
        }

        if (sub === 'leave') {
            db.prepare('DELETE FROM user_eskul WHERE user_id = ?').run(userId);
            return message.reply('👋 Kamu telah keluar dari ekskul.');
        }
    }
};
