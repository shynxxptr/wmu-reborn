const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

// LUXURY CONSUMABLE ITEMS
const LUXURY_ITEMS = {
    'champagne_premium': {
        label: '🍾 Champagne Premium',
        price: 500_000,
        desc: 'Champagne premium impor dari Perancis. Stress -100, Luck +25% (1 jam)',
        effects: {
            stress_relief: 100,
            luck_boost: 25,
            luck_duration: 3600 * 1000 // 1 jam
        },
        cooldown: 3600 // 1 jam dalam detik
    },
    'golden_cigar': {
        label: '🚬 Cerutu Emas',
        price: 1_000_000,
        desc: 'Cerutu emas dari Kuba. Stress -100, Work Limit +15 (1 hari)',
        effects: {
            stress_relief: 100,
            work_limit_boost: 15,
            work_limit_duration: 86400 * 1000 // 1 hari
        },
        cooldown: 86400 // 1 hari
    },
    'luck_potion_premium': {
        label: '🧪 Potion Keberuntungan Premium',
        price: 2_000_000,
        desc: 'Potion langka yang meningkatkan keberuntungan. Luck +75% (24 jam)',
        effects: {
            luck_boost: 75,
            luck_duration: 86400 * 1000 // 24 jam
        },
        cooldown: 86400 // 1 hari
    },
    'energy_elixir': {
        label: '⚡ Elixir Energi',
        price: 3_000_000,
        desc: 'Elixir ajaib yang menghilangkan semua cooldown. Remove semua cooldown (1x use)',
        effects: {
            remove_all_cooldowns: true
        },
        cooldown: 86400 // 1 hari
    },
    'fortune_cookie': {
        label: '🍪 Fortune Cookie Premium',
        price: 5_000_000,
        desc: 'Cookie keberuntungan premium. Next game win guaranteed (1x use)',
        effects: {
            guaranteed_win: true
        },
        cooldown: 172800 // 2 hari
    }
};

module.exports = {
    LUXURY_ITEMS,

    async handleLuxuryShop(message) {
        const embed = new EmbedBuilder()
            .setTitle('💎 TOKO LUXURY ITEMS')
            .setDescription(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `✨ **Selamat datang di toko luxury items!** ✨\n` +
                `Item-item premium dengan efek yang fantastis.\n\n` +
                `**📋 Cara Beli:**\n` +
                `1️⃣ Pilih item dari menu di bawah\n` +
                `2️⃣ Item akan langsung masuk ke inventory\n` +
                `3️⃣ Gunakan dengan \`/makan <item_key>\`\n\n` +
                `**⏱️ Note:** Item luxury memiliki cooldown setelah digunakan.\n` +
                `**💡 Tip:** Gunakan \`!buffs\` untuk cek active buffs!\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .setColor('#FFD700')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '💎 Premium Quality, Premium Price • Total Items: ' + Object.keys(LUXURY_ITEMS).length })
            .setTimestamp();

        const options = Object.entries(LUXURY_ITEMS).map(([key, item]) => {
            const emoji = item.label.split(' ')[0] || '💎';
            const desc = item.desc || 'No description';
            return {
                label: item.label || key,
                description: `${formatMoney(item.price)} - ${desc.substring(0, 50)}...`,
                value: key,
                emoji: emoji
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('luxury_shop_buy')
            .setPlaceholder('Pilih item luxury yang ingin dibeli...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        return message.reply({ embeds: [embed], components: [row] });
    },

    async handleLuxuryBuy(interaction) {
        const { user } = interaction;
        
        // Validate interaction
        if (!interaction.values || interaction.values.length === 0) {
            return interaction.reply({ 
                content: '❌ **Error:** Tidak ada item yang dipilih.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }
        
        const itemKey = interaction.values[0];
        if (!itemKey) {
            return interaction.reply({ 
                content: '❌ **Error:** Item key tidak valid.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }
        
        const item = LUXURY_ITEMS[itemKey];
        if (!item) {
            return interaction.reply({ 
                content: '❌ Item tidak ditemukan.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // 1. Cek uang
        let userData, balance;
        try {
            userData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(user.id);
            balance = (userData && userData.uang_jajan) ? userData.uang_jajan : 0;
        } catch (e) {
            console.error('Error fetching user data:', e);
            return interaction.reply({ 
                content: '❌ **Error saat mengambil data user!** Coba lagi nanti.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (balance < item.price) {
            return interaction.reply({
                content: `💸 **Uang tidak cukup!**\n` +
                    `Harga: ${formatMoney(item.price)}\n` +
                    `Uangmu: ${formatMoney(balance)}\n` +
                    `Kurang: ${formatMoney(item.price - balance)}`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        // 2. Potong uang (dengan error handling)
        try {
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?')
                .run(item.price, user.id);
        } catch (e) {
            console.error('Error deducting money:', e);
            return interaction.reply({ 
                content: '❌ **Error saat memproses pembayaran!** Coba lagi nanti.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // 3. Tambah ke inventory (dengan error handling)
        try {
            const cekInv = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?')
                .get(user.id, itemKey);
            
            if (cekInv) {
                db.prepare('UPDATE inventaris SET jumlah = jumlah + 1 WHERE user_id = ? AND jenis_tiket = ?')
                    .run(user.id, itemKey);
            } else {
                db.prepare('INSERT INTO inventaris (user_id, jenis_tiket, jumlah) VALUES (?, ?, 1)')
                    .run(user.id, itemKey, 1);
            }
        } catch (e) {
            console.error('Error adding to inventory:', e);
            // Refund uang jika gagal
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?')
                .run(item.price, user.id);
            return interaction.reply({ 
                content: '❌ **Error saat menambah item ke inventory!** Uang sudah dikembalikan.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // 4. Reply
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Pembelian Berhasil!')
            .setDescription(
                `🎉 **${item.label}** berhasil dibeli!\n\n` +
                `📝 **Deskripsi:**\n${item.desc}\n\n` +
                `💰 **Detail Transaksi:**\n` +
                `• Harga: ${formatMoney(item.price)}\n` +
                `• Sisa Uang: ${formatMoney(balance - item.price)}\n\n` +
                `**💡 Cara Pakai:**\n` +
                `\`/makan ${itemKey}\`\n\n` +
                `*Item sudah masuk ke inventory!*`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: user.username, 
                iconURL: user.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: '💎 Premium Quality' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },

    async handleLuxuryUse(userId, itemKey) {
        const item = LUXURY_ITEMS[itemKey];
        if (!item) return { success: false, error: 'Item tidak ditemukan.' };

        // 1. Cek inventory
        try {
            const invItem = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?')
                .get(userId, itemKey);
            
            if (!invItem || invItem.jumlah <= 0) {
                return { success: false, error: 'Kamu tidak punya item ini!' };
            }
        } catch (e) {
            return { success: false, error: 'Error checking inventory.' };
        }

        // 2. Cek cooldown
        const lastUsed = db.getCooldown(userId, `luxury_${itemKey}`);
        if (lastUsed) {
            const cooldownMs = item.cooldown * 1000;
            const timeSinceUse = Date.now() - lastUsed;
            if (timeSinceUse < cooldownMs) {
                const remaining = Math.ceil((cooldownMs - timeSinceUse) / 1000);
                const hours = Math.floor(remaining / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                return { 
                    success: false, 
                    error: `Masih dalam cooldown! Tunggu ${hours}j ${minutes}m lagi.` 
                };
            }
        }

        // 3. Kurangi inventory (dengan error handling)
        try {
            db.prepare('UPDATE inventaris SET jumlah = jumlah - 1 WHERE user_id = ? AND jenis_tiket = ?')
                .run(userId, itemKey);
        } catch (e) {
            console.error('Error reducing inventory:', e);
            return { success: false, error: 'Error saat mengurangi inventory.' };
        }

        // 4. Set cooldown
        try {
            db.setCooldown(userId, `luxury_${itemKey}`, Date.now());
        } catch (e) {
            console.error('Error setting cooldown:', e);
            // Continue anyway, cooldown is not critical
        }

        // 5. Apply effects
        const effects = [];

        if (item.effects.stress_relief) {
            try {
                const currentStress = db.prepare('SELECT stress FROM user_economy WHERE user_id = ?').get(userId);
                if (currentStress) {
                    const newStress = Math.max(0, (currentStress.stress || 0) - item.effects.stress_relief);
                    db.prepare('UPDATE user_economy SET stress = ? WHERE user_id = ?').run(newStress, userId);
                    effects.push(`Stress -${item.effects.stress_relief}`);
                }
            } catch (e) {
                console.error('Error applying stress relief:', e);
            }
        }

        if (item.effects.luck_boost && item.effects.luck_duration) {
            try {
                db.addLuxuryBuff(userId, 'luck_boost', item.effects.luck_boost, item.effects.luck_duration);
                effects.push(`Luck +${item.effects.luck_boost}% (${Math.floor(item.effects.luck_duration / 3600000)} jam)`);
            } catch (e) {
                console.error('Error adding luck boost:', e);
            }
        }

        if (item.effects.work_limit_boost && item.effects.work_limit_duration) {
            try {
                db.addLuxuryBuff(userId, 'work_limit_boost', item.effects.work_limit_boost, item.effects.work_limit_duration);
                effects.push(`Work Limit +${item.effects.work_limit_boost} (${Math.floor(item.effects.work_limit_duration / 86400000)} hari)`);
            } catch (e) {
                console.error('Error adding work limit boost:', e);
            }
        }

        if (item.effects.remove_all_cooldowns) {
            try {
                // Remove all cooldowns (except luxury cooldowns)
                const cooldownTypes = ['work', 'daily', 'heist', 'tawuran', 'mission'];
                cooldownTypes.forEach(type => {
                    db.prepare('DELETE FROM user_cooldowns WHERE user_id = ? AND action_type = ?')
                        .run(userId, type);
                });
                effects.push('Semua cooldown dihapus!');
            } catch (e) {
                console.error('Error removing cooldowns:', e);
            }
        }

        if (item.effects.guaranteed_win) {
            try {
                db.addLuxuryBuff(userId, 'guaranteed_win', 1, 86400 * 1000); // 24 jam
                effects.push('Next game win guaranteed!');
            } catch (e) {
                console.error('Error adding guaranteed win:', e);
            }
        }

        return {
            success: true,
            item: item.label,
            effects: effects.join(', ')
        };
    },

    // Helper untuk get effective luck (dipanggil dari gamblingHandler)
    getEffectiveLuxuryLuck(userId) {
        const buff = db.getLuxuryBuff(userId, 'luck_boost');
        if (buff && buff.expires_at > Date.now()) {
            return buff.buff_value;
        }
        return 0;
    },

    // Helper untuk check guaranteed win
    hasGuaranteedWin(userId) {
        const buff = db.getLuxuryBuff(userId, 'guaranteed_win');
        if (buff && buff.expires_at > Date.now()) {
            // Remove after use
            db.prepare('DELETE FROM user_luxury_buffs WHERE user_id = ? AND buff_type = ?')
                .run(userId, 'guaranteed_win');
            return true;
        }
        return false;
    },

    // Helper untuk get work limit boost
    getWorkLimitBoost(userId) {
        const buff = db.getLuxuryBuff(userId, 'work_limit_boost');
        if (buff && buff.expires_at > Date.now()) {
            return buff.buff_value;
        }
        return 0;
    },

    // Command untuk cek active buffs
    async handleBuffsStatus(message) {
        const userId = message.author.id;
        let buffs;
        try {
            buffs = db.getLuxuryBuffs(userId) || [];
        } catch (e) {
            console.error('Error fetching luxury buffs:', e);
            return message.reply('❌ **Error saat mengambil data buffs!** Coba lagi nanti.');
        }

        if (buffs.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('📊 Active Buffs')
                .setDescription(
                    '❌ **Tidak ada active buffs saat ini.**\n\n' +
                    '💡 **Tips:**\n' +
                    '• Gunakan `!luxury` untuk beli luxury items\n' +
                    '• Luxury items memberikan buffs yang powerful!\n' +
                    '• Buffs akan aktif selama durasi tertentu'
                )
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
                .setAuthor({ 
                    name: message.author.username, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setFooter({ text: '💎 Luxury Items' })
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        const buffList = buffs.map((b, idx) => {
            if (!b || !b.expires_at) return null;
            
            const remaining = Math.max(0, b.expires_at - Date.now());
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            let buffName = '';
            let buffDesc = '';
            let buffEmoji = '✨';
            
            if (b.buff_type === 'luck_boost') {
                buffName = '🍀 Luck Boost';
                buffDesc = `+${b.buff_value}% keberuntungan`;
                buffEmoji = '🍀';
            } else if (b.buff_type === 'work_limit_boost') {
                buffName = '⚡ Work Limit Boost';
                buffDesc = `+${b.buff_value} work limit`;
                buffEmoji = '⚡';
            } else if (b.buff_type === 'guaranteed_win') {
                buffName = '🍪 Guaranteed Win';
                buffDesc = 'Next game win guaranteed';
                buffEmoji = '🍪';
            } else {
                buffName = b.buff_type;
                buffDesc = `+${b.buff_value}`;
            }

            // Enhanced progress bar dengan emoji dan colors
            let estimatedTotal = 3600000; // Default 1 hour
            if (b.buff_type === 'luck_boost' && b.buff_value <= 30) estimatedTotal = 3600000; // 1 hour
            else if (b.buff_type === 'luck_boost' && b.buff_value > 30) estimatedTotal = 86400000; // 24 hours
            else if (b.buff_type === 'work_limit_boost') estimatedTotal = 86400000; // 24 hours
            else if (b.buff_type === 'guaranteed_win') estimatedTotal = 86400000; // 24 hours
            
            const progress = Math.max(0, Math.min(100, (remaining / estimatedTotal) * 100));
            const progressBarLength = Math.min(10, Math.max(0, Math.floor(progress / 10)));
            
            // Enhanced progress bar dengan emoji berdasarkan progress
            let progressEmoji = '🟥'; // Red
            if (progress >= 80) progressEmoji = '🟩'; // Green
            else if (progress >= 50) progressEmoji = '🟨'; // Yellow
            else if (progress >= 25) progressEmoji = '🟧'; // Orange
            
            const progressBar = progressEmoji.repeat(progressBarLength) + '⬜'.repeat(10 - progressBarLength);

            // Format time dengan validasi
            const timeStr = remaining > 0 
                ? `${hours}j ${minutes}m ${seconds}s tersisa`
                : 'Expired';
            
            // Status badge
            const statusBadge = remaining > 0 
                ? (progress >= 50 ? '🟢 [ACTIVE]' : '🟡 [LOW]')
                : '🔴 [EXPIRED]';
            
            return `${buffEmoji} **${buffName}** ${statusBadge}\n` +
                   `   ${buffDesc}\n` +
                   `   ⏱️ ${timeStr}\n` +
                   (remaining > 0 ? `   ${progressBar} **${Math.floor(progress)}%**` : '   ⚠️ **Expired**');
        }).filter(item => item).join('\n\n');

        // Dynamic color berdasarkan jumlah buffs
        const getBuffsColor = (count) => {
            if (count >= 5) return '#00FF00'; // Green - banyak buffs
            if (count >= 3) return '#FFD700'; // Gold - cukup buffs
            return '#FFA500'; // Orange - sedikit buffs
        };
        
        const embed = new EmbedBuilder()
            .setColor(getBuffsColor(buffs.length))
            .setTitle('✨ Active Luxury Buffs')
            .setDescription(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                buffList || 'Tidak ada buffs aktif.\n' +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
            .setAuthor({ 
                name: message.author.username, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ 
                text: `💎 ${buffs.length} Active Buff${buffs.length > 1 ? 's' : ''} • Total Power: ${buffs.reduce((sum, b) => sum + (b.buff_value || 0), 0)}%` 
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};

