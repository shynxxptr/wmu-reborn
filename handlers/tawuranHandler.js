const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

let activeTawuran = null;

const WEAPONS = [
    { name: 'Gear Motor', power: 50, hit_msg: 'melempar Gear Motor!' },
    { name: 'Penggaris Besi', power: 30, hit_msg: 'menyabetkan Penggaris Besi!' },
    { name: 'Batu Bata', power: 40, hit_msg: 'melempar Batu Bata!' },
    { name: 'Tangan Kosong', power: 10, hit_msg: 'memukul dengan Tangan Kosong!' }
];

module.exports = {
    async startTawuran(message) {
        if (activeTawuran) return message.reply('⚠️ **Tawuran sedang terjadi!** Gabung sana!');

        const userId = message.author.id;

        // Cooldown Check
        const lastTawuran = db.getCooldown(userId, 'tawuran');
        const cooldown = 3 * 60 * 60 * 1000; // 3 Jam
        if (lastTawuran && (Date.now() - lastTawuran) < cooldown) {
            const remaining = Math.ceil((cooldown - (Date.now() - lastTawuran)) / 60000);
            return message.reply(`⏳ **Luka belum sembuh!** Tunggu ${remaining} menit lagi.`);
        }

        activeTawuran = {
            leader: userId,
            participants: [userId],
            channelId: message.channel.id,
            enemyHealth: 500, // HP Sekolah Sebelah
            log: []
        };

        const embed = new EmbedBuilder()
            .setTitle('⚔️ TAWURAN ANTAR SEKOLAH!')
            .setDescription(`**${message.author.username}** menantang STM Sebelah!\n\nKetik \`!join\` untuk ikut tawuran.\nMinimal 2 orang.\nWaktu kumpul: 60 detik.`)
            .setColor('#FF0000')
            .setImage('https://media.tenor.com/images/1c8f3b6f2c3b4f6e8b4f3b6f2c3b4f6e/tenor.gif'); // Placeholder GIF if needed

        await message.channel.send({ embeds: [embed] });

        const filter = m => m.content.toLowerCase() === '!join' && !m.author.bot;
        const collector = message.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', m => {
            if (activeTawuran.participants.includes(m.author.id)) return m.reply('Udah join bang!');

            // Check Cooldown
            const last = db.getCooldown(m.author.id, 'tawuran');
            if (last && (Date.now() - last) < cooldown) return m.reply('⏳ Masih cooldown tawuran!');

            activeTawuran.participants.push(m.author.id);
            m.reply(`⚔️ **${m.author.username}** siap tempur! (${activeTawuran.participants.length} orang)`);
        });

        collector.on('end', async () => {
            if (activeTawuran.participants.length < 2) {
                activeTawuran = null;
                return message.channel.send('❌ **Bubar!** Gak ada yang berani ikut (Kurang orang).');
            }

            await message.channel.send('🔥 **SERBUUU!!!** Tawuran dimulai!');
            this.battleLoop(message.channel);
        });
    },

    async battleLoop(channel) {
        // Simple Simulation
        let round = 1;
        const interval = setInterval(async () => {
            if (!activeTawuran || activeTawuran.enemyHealth <= 0) {
                clearInterval(interval);
                if (activeTawuran) this.winTawuran(channel);
                return;
            }

            // Player Turn
            const attackerId = activeTawuran.participants[Math.floor(Math.random() * activeTawuran.participants.length)];
            const weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
            const dmg = weapon.power + Math.floor(Math.random() * 20);

            activeTawuran.enemyHealth -= dmg;

            // Enemy Turn (Counter Attack)
            const enemyDmg = Math.floor(Math.random() * 30);
            const victimId = activeTawuran.participants[Math.floor(Math.random() * activeTawuran.participants.length)];

            // Log
            const msg = `Round ${round}: <@${attackerId}> ${weapon.hit_msg} (-${dmg} HP). Musuh membalas ke <@${victimId}> (-${enemyDmg} HP).`;
            await channel.send(msg);

            // RNG Police (10% chance per round)
            if (Math.random() < 0.1) {
                clearInterval(interval);
                this.policeRaid(channel);
                return;
            }

            round++;
            if (round > 10) { // Max Rounds
                clearInterval(interval);
                this.loseTawuran(channel, 'Musuh terlalu kuat! Kalian mundur.');
            }

        }, 3000);
    },

    async winTawuran(channel) {
        const totalLoot = 50000 * activeTawuran.participants.length;
        const share = 50000;

        activeTawuran.participants.forEach(id => {
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(share, id);
            db.setCooldown(id, 'tawuran');
        });

        const embed = new EmbedBuilder()
            .setTitle('🏆 TAWURAN MENANG!')
            .setDescription(`Sekolah Sebelah kabur terbirit-birit!\n\n💰 **Loot:** Rp ${formatMoney(share)} per orang.\nRespect +100.`)
            .setColor('#00FF00');

        await channel.send({ embeds: [embed] });
        activeTawuran = null;
    },

    async loseTawuran(channel, reason) {
        activeTawuran.participants.forEach(id => {
            db.setCooldown(id, 'tawuran');
            // Hospital Fee
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - 20000 WHERE user_id = ?').run(id);
        });

        await channel.send(`🤕 **KALAH!** ${reason}\nSemua masuk RS (Biaya Rp 20.000).`);
        activeTawuran = null;
    },

    async policeRaid(channel) {
        const caught = [];
        activeTawuran.participants.forEach(id => {
            if (Math.random() < 0.5) { // 50% chance caught
                db.jailUser(id, 20 * 60 * 1000, 'Ketangkap Tawuran');
                caught.push(id);
            }
            db.setCooldown(id, 'tawuran');
        });

        const embed = new EmbedBuilder()
            .setTitle('🚓 POLISI DATANG! NGUING NGUING!')
            .setDescription(`**KABURRR!!!**\n\n👮 **Ketangkap (${caught.length}):**\n${caught.map(id => `<@${id}>`).join(', ')}\n(Masuk Penjara 20 Menit)`)
            .setColor('#000000');

        await channel.send({ embeds: [embed] });
        activeTawuran = null;
    }
};
