const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database.js');

module.exports = {
    async handleBlackMarket(message, command, args) {
        const subCommand = args[1];

        // --- ADMIN CONFIGURATION ---
        if (subCommand === 'settime') {
            if (!message.member.permissions.has('Administrator')) return message.reply('❌ Admin Only!');
            const start = parseInt(args[2]);
            const end = parseInt(args[3]);

            if (isNaN(start) || isNaN(end) || start < 0 || start > 24 || end < 0 || end > 24) {
                return message.reply('❌ Format: `!bm settime <start_hour> <end_hour>` (0-24)');
            }

            db.setSystemVar('bm_start_hour', start);
            db.setSystemVar('bm_end_hour', end);
            return message.reply(`✅ **Jam Operasional Diubah:** ${start}:00 - ${end}:00`);
        }

        if (subCommand === 'setprice') {
            if (!message.member.permissions.has('Administrator')) return message.reply('❌ Admin Only!');
            const itemKey = args[2];
            const price = parseInt(args[3]);

            const validItems = ['jimat_judi', 'pelicin'];
            if (!validItems.includes(itemKey) || isNaN(price) || price < 0) {
                return message.reply(`❌ Format: \`!bm setprice <item> <price>\`\nItem: ${validItems.join(', ')}`);
            }

            db.setSystemVar(`price_${itemKey}`, price);
            return message.reply(`✅ **Harga Diubah:** ${itemKey} = ${price} Coin`);
        }

        // --- NORMAL USER FLOW ---

        // 1. Get Config
        const startHour = db.getSystemVar('bm_start_hour', 0);
        const endHour = db.getSystemVar('bm_end_hour', 5);
        const priceJimat = db.getSystemVar('price_jimat_judi', 5);
        const pricePelicin = db.getSystemVar('price_pelicin', 3);

        // 2. Check Time
        const now = new Date();
        const hour = now.getHours();

        // Logic: 
        // If start < end (e.g., 8 - 16): Open if hour >= 8 && hour < 16
        // If start > end (e.g., 22 - 5): Open if hour >= 22 OR hour < 5

        let isOpen = false;
        if (startHour < endHour) {
            isOpen = hour >= startHour && hour < endHour;
        } else {
            isOpen = hour >= startHour || hour < endHour;
        }

        if (!isOpen) {
            return message.reply(`🔒 **Black Market Tutup.**\n*Jam Operasional: ${startHour}:00 - ${endHour}:00* 🌑`);
        }

        // SHOW MENU
        if (!subCommand || subCommand === 'buy') {
            // Re-define ITEMS with dynamic prices
            const ITEMS = {
                'jimat_judi': {
                    label: '🧿 Jimat Judi',
                    price: priceJimat,
                    desc: '+10% Win Rate di Slot & Coinflip (1 Jam)',
                    duration: 60 * 60 * 1000,
                    type: 'luck_boost'
                },
                'pelicin': {
                    label: '🛢️ Pelicin',
                    price: pricePelicin,
                    desc: 'Reset Cooldown Begal & Minta',
                    type: 'reset_cooldown'
                }
            };

            if (!subCommand) {
                const embed = new EmbedBuilder()
                    .setTitle('🕵️ BLACK MARKET')
                    .setDescription('Barang ilegal, kualitas internasional.\nBayar pakai **Coin Ujang**.')
                    .setColor('#000000')
                    .addFields(
                        { name: `🧿 Jimat Judi (${ITEMS['jimat_judi'].price} Coin)`, value: 'Nambah hoki 10% selama 1 jam.' },
                        { name: `🛢️ Pelicin (${ITEMS['pelicin'].price} Coin)`, value: 'Reset cooldown Begal & Minta.' }
                    )
                    .setFooter({ text: 'Gunakan !bm buy <item> (jimat_judi / pelicin)' });

                return message.reply({ embeds: [embed] });
            }

            // BUY ITEM
            if (subCommand === 'buy') {
                const itemKey = args[2];
                const item = ITEMS[itemKey];

                if (!item) return message.reply('❌ Barang tidak ada. Jangan ngarang!');

                // Check Coin
                const user = db.prepare('SELECT coin_ujang FROM user_economy WHERE user_id = ?').get(message.author.id);
                if (!user || user.coin_ujang < item.price) {
                    return message.reply(`💸 **Coin kurang!** Butuh ${item.price} Coin.`);
                }

                // Deduct Coin
                db.prepare('UPDATE user_economy SET coin_ujang = coin_ujang - ? WHERE user_id = ?').run(item.price, message.author.id);

                // Apply Effect
                if (item.type === 'luck_boost') {
                    db.addEffect(message.author.id, 'luck_boost', item.duration);
                    return message.reply(`✅ **Transaksi Berhasil.**\n🧿 **Jimat Judi** aktif! Hoki bertambah selama 1 jam.`);
                }
                else if (item.type === 'reset_cooldown') {
                    if (message.client.begCooldowns) {
                        message.client.begCooldowns.delete(message.author.id);
                    }
                    return message.reply(`✅ **Transaksi Berhasil.**\n🛢️ **Pelicin** dipakai! Cooldown Ngemis & Begal di-reset.`);
                }
            }
        }
    }
};
