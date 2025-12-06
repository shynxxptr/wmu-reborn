const db = require('../database.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    async handleCoin(message, command, args) {
        const userId = message.author.id;

        // !coin (Cek Saldo Coin)
        if (command === '!coin') {
            const user = db.prepare('SELECT coin_ujang FROM user_economy WHERE user_id = ?').get(userId);
            const coin = user ? user.coin_ujang : 0;
            return message.reply(`🪙 **Coin Ujang:** ${coin} Coin`);
        }

        // !tukar <jumlah> (Tukar Saldo ke Coin)
        if (command === '!tukar') {
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply('❌ Format: `!tukar <jumlah_coin>`\nRate: 1 Coin = Rp 10.000.000');

            const res = db.exchangeCoin(userId, amount);
            if (res.success) {
                return message.reply(`✅ **Sukses!** Kamu menukar Rp ${(amount * 10000000).toLocaleString('id-ID')} menjadi **${amount} Coin Ujang**.`);
            } else {
                return message.reply(`❌ **Gagal:** ${res.error}`);
            }
        }

        // !shoprole (Menu Harga)
        if (command === '!shoprole') {
            const embed = new EmbedBuilder()
                .setTitle('👑 Custom Role Shop')
                .setDescription('Tukarkan Coin Ujang dengan Tiket Custom Role!')
                .setColor('Gold')
                .addFields(
                    { name: '🎫 Tiket 1 Hari', value: '**1 Coin**', inline: true },
                    { name: '🎫 Tiket 3 Hari', value: '**3 Coin**', inline: true },
                    { name: '🎫 Tiket 7 Hari', value: '**5 Coin**', inline: true },
                    { name: '🎫 Tiket 10 Hari', value: '**10 Coin**', inline: true },
                    { name: '🎫 Tiket 30 Hari', value: '**20 Coin**', inline: true }
                )
                .setFooter({ text: 'Gunakan !belirole <hari> untuk membeli.' });

            return message.reply({ embeds: [embed] });
        }

        // !belirole <hari>
        if (command === '!belirole') {
            const days = args[1];
            const validDays = ['1', '3', '7', '10', '30'];

            if (!validDays.includes(days)) {
                return message.reply('❌ Durasi tidak valid! Pilihan: 1, 3, 7, 10, 30');
            }

            const code = `${days}d`;
            const res = db.buyCustomRoleTicket(userId, code);

            if (res.success) {
                return message.reply(`✅ **Berhasil!** Kamu membeli **Tiket Custom Role ${days} Hari** seharga **${res.price} Coin**.\nCek inventory dengan \`/tas\`.`);
            } else {
                return message.reply(`❌ **Gagal:** ${res.error}`);
            }
        }
    }
};
