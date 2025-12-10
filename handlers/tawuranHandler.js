const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

const activeTawurans = new Map();

const WEAPONS = [
    { name: 'Gear Motor', power: 50, hit_msg: 'melempar Gear Motor!' },
    { name: 'Penggaris Besi', power: 30, hit_msg: 'menyabetkan Penggaris Besi!' },
    { name: 'Batu Bata', power: 40, hit_msg: 'melempar Batu Bata!' },
    { name: 'Tangan Kosong', power: 10, hit_msg: 'memukul dengan Tangan Kosong!' }
];

module.exports = {
    async startTawuran(message) {
        const channelId = message.channel.id;
        if (activeTawurans.has(channelId)) return message.reply('⚠️ **Tawuran sedang terjadi di sini!** Gabung sana!');

        const userId = message.author.id;

        // Cooldown Check
        const lastTawuran = db.getCooldown(userId, 'tawuran');
        const cooldown = 3 * 60 * 60 * 1000; // 3 Jam
        if (lastTawuran && (Date.now() - lastTawuran) < cooldown) {
            const remaining = Math.ceil((cooldown - (Date.now() - lastTawuran)) / 60000);
            return message.reply(`⏳ **Luka belum sembuh!** Tunggu ${remaining} menit lagi.`);
        }

        const session = {
            leader: userId,
            participants: [userId],
            channelId: channelId,
            enemyHealth: 500, // HP Sekolah Sebelah
            log: []
        };
        activeTawurans.set(channelId, session);

        const embed = new EmbedBuilder()
            .setTitle('⚔️ TAWURAN ANTAR SEKOLAH!')
            .setDescription(`**${message.author.username}** menantang STM Sebelah!\n\nKetik \`!join\` untuk ikut tawuran.\nMinimal 2 orang.\nWaktu kumpul: 60 detik.`)
            .setColor('#FF0000')
            .setImage('https://media.tenor.com/images/1c8f3b6f2c3b4f6e8b4f3b6f2c3b4f6e/tenor.gif');

        await message.channel.send({ embeds: [embed] });

        const filter = m => m.content.toLowerCase() === '!join' && !m.author.bot;
        const collector = message.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', m => {
            const currentSession = activeTawurans.get(channelId);
            if (!currentSession) return;

            if (currentSession.participants.includes(m.author.id)) return m.reply('Udah join bang!');

            // Check Cooldown
            const last = db.getCooldown(m.author.id, 'tawuran');
            if (last && (Date.now() - last) < cooldown) return m.reply('⏳ Masih cooldown tawuran!');

            currentSession.participants.push(m.author.id);
            m.reply(`⚔️ **${m.author.username}** siap tempur! (${currentSession.participants.length} orang)`);
        });

        collector.on('end', async () => {
            const currentSession = activeTawurans.get(channelId);
            if (!currentSession) return;

            if (currentSession.participants.length < 2) {
                activeTawurans.delete(channelId);
                return message.channel.send('❌ **Bubar!** Gak ada yang berani ikut (Kurang orang).');
            }

            await message.channel.send('🔥 **SERBUUU!!!** Tawuran dimulai!');
            this.battleLoop(message.channel, channelId);
        });
    },

    async battleLoop(channel, channelId) {
        let round = 1;

        const runRound = async () => {
            try {
                // Re-check session existence (in case deleted externally)
                const session = activeTawurans.get(channelId);
                if (!session) return;

                if (session.enemyHealth <= 0) {
                    this.winTawuran(channel, channelId);
                    return;
                }

                // Player Turn
                const attackerId = session.participants[Math.floor(Math.random() * session.participants.length)];
                const weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
                const dmg = weapon.power + Math.floor(Math.random() * 20);

                session.enemyHealth -= dmg;

                // Enemy Turn (Counter Attack)
                const enemyDmg = Math.floor(Math.random() * 30);
                const victimId = session.participants[Math.floor(Math.random() * session.participants.length)];

                // Log
                const msg = `Round ${round}: <@${attackerId}> ${weapon.hit_msg} (-${dmg} HP). Musuh membalas ke <@${victimId}> (-${enemyDmg} HP).`;
                await channel.send(msg);

                // RNG Police (10% chance per round)
                if (Math.random() < 0.1) {
                    this.policeRaid(channel, channelId);
                    return;
                }

                round++;
                if (round > 10) { // Max Rounds
                    this.loseTawuran(channel, 'Musuh terlalu kuat! Kalian mundur.', channelId);
                    return;
                }

                // Schedule Next Round
                setTimeout(runRound, 3000);

            } catch (error) {
                console.error('[Tawuran Error]', error);
                activeTawurans.delete(channelId);
                try {
                    await channel.send('❌ **Tawuran Terhenti!** Ada gangguan teknis (Error).');
                } catch (e) { /* Ignore if can't send */ }
            }
        };

        // Start First Round
        setTimeout(runRound, 3000);
    },

    async winTawuran(channel, channelId) {
        const session = activeTawurans.get(channelId);
        if (!session) return;

        const totalLoot = 50000 * session.participants.length;
        const share = 50000;

        session.participants.forEach(id => {
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(share, id);
            db.setCooldown(id, 'tawuran');
        });

        const embed = new EmbedBuilder()
            .setTitle('🏆 TAWURAN MENANG!')
            .setDescription(`Sekolah Sebelah kabur terbirit-birit!\n\n💰 **Loot:** Rp ${formatMoney(share)} per orang.\nRespect +100.`)
            .setColor('#00FF00');

        await channel.send({ embeds: [embed] });
        activeTawurans.delete(channelId);
    },

    async loseTawuran(channel, reason, channelId) {
        const session = activeTawurans.get(channelId);
        if (!session) return;

        session.participants.forEach(id => {
            db.setCooldown(id, 'tawuran');
            // Hospital Fee
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - 20000 WHERE user_id = ?').run(id);
        });

        await channel.send(`🤕 **KALAH!** ${reason}\nSemua masuk RS (Biaya Rp 20.000).`);
        activeTawurans.delete(channelId);
    },

    async policeRaid(channel, channelId) {
        const session = activeTawurans.get(channelId);
        if (!session) return;

        const caught = [];
        session.participants.forEach(id => {
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
        activeTawurans.delete(channelId);
    }
};
