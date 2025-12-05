const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');

// DAFTAR MENU WARUNG (Rokok & Minuman Keras)
const MENU_WARUNG = {
    // --- ROKOK ---
    'surya_batang': {
        label: 'Surya (1 Batang)',
        price: 3000,
        emoji: '🚬',
        desc: 'Gudang Garam Surya. Selera Pemberani.',
        stress_relief: 40,
        type: 'rokok'
    },
    'sampoerna_batang': {
        label: 'Sampoerna Mild (1 Batang)',
        price: 2500,
        emoji: '🚬',
        desc: 'Bukan Basa Basi.',
        stress_relief: 35,
        type: 'rokok'
    },
    'djarum_batang': {
        label: 'Djarum Super (1 Batang)',
        price: 2500,
        emoji: '🚬',
        desc: 'Yang Penting Rasanya, Bung!',
        stress_relief: 35,
        type: 'rokok'
    },
    'marlboro_batang': {
        label: 'Marlboro Merah (1 Batang)',
        price: 3000,
        emoji: '🚬',
        desc: 'Putus cinta? Marlboro solusinya.',
        stress_relief: 50,
        type: 'rokok'
    },
    'magnum_batang': {
        label: 'Magnum Filter (1 Batang)',
        price: 3000,
        emoji: '🚬',
        desc: 'Inspirasi tanpa batas.',
        stress_relief: 40,
        type: 'rokok'
    },

    // --- MINUMAN KERAS (ALKOHOL) ---
    'iceland_vodka': {
        label: 'Iceland Vodka',
        price: 150000,
        emoji: '🍾',
        desc: 'Dingin sedingin sikap dia. (Reset Stats + Extra Job)',
        type: 'alkohol',
        reply: '🍾 **Glek glek glek...**\n\n*Dunia terasa berputar... Tapi beban hidup hilang sejenak.*\nEfek: **Mabuk Berat (Stats Reset & Limit Kerja +20)**'
    },
    'anggur_merah': {
        label: 'Anggur Merah (Amer)',
        price: 120000,
        emoji: '🍷',
        desc: 'Kawan setia saat galau. (Reset Stats + Extra Job)',
        type: 'alkohol',
        reply: '🍷 **Amer Orang Tua...**\n\n*Hangat di tenggorokan, hangat di hati.*\nEfek: **Mabuk Santuy (Stats Reset & Limit Kerja +20)**'
    },
    'intisari': {
        label: 'Intisari',
        price: 100000,
        emoji: '🍶',
        desc: 'Jamu orang tua. (Reset Stats + Extra Job)',
        type: 'alkohol',
        reply: '🍶 **Intisari Gingseng!**\n\n*Sehat? Mungkin. Mabuk? Pasti.*\nEfek: **Mabuk Lokal (Stats Reset & Limit Kerja +20)**'
    }
};

module.exports = {
    MENU_WARUNG,

    async handleWarungInteraction(interaction) {
        const { customId, user } = interaction;

        try {
            if (customId === 'warung_menu') {
                const selected = interaction.values[0];
                const item = MENU_WARUNG[selected];

                if (!item) {
                    return interaction.reply({ content: '❌ Barang tidak ada.', flags: [MessageFlags.Ephemeral] });
                }

                // 1. CEK UANG
                const userData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(user.id);
                const uangUser = userData ? userData.uang_jajan : 0;

                if (uangUser < item.price) {
                    return interaction.reply({
                        content: `💸 **Uang Kurang!**\nHarga: Rp ${item.price.toLocaleString('id-ID')}\nUangmu: Rp ${uangUser.toLocaleString('id-ID')}`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                // 2. TRANSAKSI
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(item.price, user.id);

                // 3. TAMBAH KE INVENTARIS
                const cekInv = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, selected);
                if (cekInv) {
                    db.prepare('UPDATE inventaris SET jumlah = jumlah + 1 WHERE user_id = ? AND jenis_tiket = ?').run(user.id, selected);
                } else {
                    db.prepare('INSERT INTO inventaris (user_id, jenis_tiket, jumlah) VALUES (?, ?, 1)').run(user.id, selected);
                }

                // 4. REPLY
                const embed = new EmbedBuilder()
                    .setColor('#36393F') // Dark color for secret shop
                    .setTitle(`🚬 Transaksi Berhasil`)
                    .setDescription(`Kamu membeli **${item.label}**.\n\n*Jangan lupa beli korek di kantin kalau belum punya.*`)
                    .setFooter({ text: `Sisa Uang: Rp ${(uangUser - item.price).toLocaleString('id-ID')}` });

                await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        } catch (error) {
            console.error('[Warung Handler Error]', error);
            await interaction.reply({ content: '❌ Ada razia guru! Warung tutup sebentar.', flags: [MessageFlags.Ephemeral] });
        }
    }
};
