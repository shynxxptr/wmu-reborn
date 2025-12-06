const { EmbedBuilder } = require('discord.js');
const db = require('../database.js');

// --- KHODAM DATA ---
const RARITY_WEIGHTS = {
    'Normal': 40,
    'Common': 25,
    'Uncommon': 15,
    'Rare': 10,
    'Very Rare': 5,
    'Mythical': 3,
    'Legendary': 1.5,
    'Special': 0.5
};

const KHODAM_LIST = {
    'Normal': [
        'Tutup Panci', 'Sapu Lidi', 'Keset Welcome', 'Sendal Swallow Sebelah', 'Charger Rusak',
        'Galon Kosong', 'Remote TV Ilang', 'Karet Gelang', 'Plastik Gorengan', 'Botol Kecap',
        'Kaleng Krupuk', 'Sikat WC', 'Gayung Bolong', 'Kanebo Kering', 'Obeng Kembang',
        'Paku Karatan', 'Ban Dalem', 'Knalpot Brong', 'Spion Getar', 'Helm Ciduk',
        'Batu Bata', 'Pecahan Kaca', 'Paku Payung', 'Sedotan Plastik', 'Tusuk Gigi',
        'Korek Gas Habis', 'Bungkus Rokok Penyet', 'Kulit Kacang', 'Biji Durian', 'Tulang Ayam',
        'Kresek Hitam', 'Kardus Indomie', 'Botol Aqua Remuk', 'Gelas Plastik', 'Piring Seng',
        'Centong Nasi', 'Ulekan Cobek', 'Saringan Teh', 'Parutan Keju', 'Talenan Kayu'
    ],
    'Common': [
        'Kucing Oren', 'Ayam Jago', 'Cicak Dinding', 'Lele Terbang', 'Tokek',
        'Semut Merah', 'Kecoa Terbang', 'Nyamuk Kebon', 'Lalat Ijo', 'Tikus Got',
        'Katak Sawah', 'Belalang Tempur', 'Capung', 'Kumbang Tanduk', 'Ulat Bulu',
        'Burung Gereja', 'Ikan Cupang', 'Kura-kura Brazil', 'Hamster', 'Marmut',
        'Semut Rangrang', 'Kupu-kupu', 'Belalang Sembah', 'Jangkrik Boss', 'Laba-laba Rumah',
        'Kelelawar', 'Burung Pipit', 'Ikan Mas Koki', 'Keong Sawah', 'Bekicot',
        'Cacing Tanah', 'Lipan', 'Kalajengking Kecil', 'Undur-undur', 'Kumbang Tai',
        'Burung Dara', 'Ayam Kampus', 'Bebek Goreng', 'Entok', 'Angsa Galak'
    ],
    'Uncommon': [
        'Tuyul Botak', 'Pocong Mumun', 'Kuntilanak Merah', 'Genderuwo', 'Jenglot',
        'Wewe Gombel', 'Banaspati', 'Suster Ngesot', 'Hantu Jeruk Purut', 'Si Manis Jembatan Ancol',
        'Kolor Ijo', 'Babi Ngepet', 'Leak Bali', 'Kuyang', 'Palasik',
        'Sundel Bolong', 'Mak Lampir', 'Grandong', 'Buto Ijo', 'Nyai Blorong',
        'Hantu Ambulans', 'Hantu Puncak Datang Bulan', 'Suster Keramas', 'Hantu Tanah Kusir', 'Hantu Casablanca',
        'Pocong Mumun', 'Jelangkung', 'Hantu Guling', 'Hantu Lemari', 'Hantu Cermin',
        'Siluman Ular', 'Siluman Buaya', 'Siluman Kera', 'Siluman Harimau', 'Siluman Babi',
        'Jin Tomang', 'Jin Ifrit', 'Jin Botol', 'Jin Kura-kura', 'Jin Dan Jun'
    ],
    'Rare': [
        'Macan Putih', 'Buaya Buntung', 'Raja Kera', 'Ular Emas', 'Elang Jawa',
        'Harimau Sumatera', 'Badak Bercula Satu', 'Komodo Dragon', 'Burung Garuda', 'Gajah Mada',
        'Singa Barong', 'Naga Bonar', 'Lembu Suro', 'Kuda Sembrani', 'Garuda Wisnu',
        'Ratu Pantai Selatan', 'Dewi Sri', 'Jaka Tarub', 'Sangkuriang', 'Malin Kundang',
        'Macan Kumbang', 'Beruang Madu', 'Pesut Mahakam', 'Orang Utan', 'Tarsius',
        'Burung Cendrawasih', 'Burung Merak', 'Burung Kasuari', 'Anoa', 'Babirusa',
        'Jalak Bali', 'Kakatua Raja', 'Maleo', 'Rangkong', 'Musang King',
        'Raja Hutan', 'Raja Laut', 'Raja Langit', 'Raja Jalanan', 'Raja Sawer'
    ],
    'Very Rare': [
        'Nyi Roro Kidul', 'Prabu Siliwangi', 'Gatotkaca', 'Semar', 'Arjuna',
        'Bima', 'Yudhistira', 'Nakula', 'Sadewa', 'Hanuman',
        'Rahwana', 'Sinta', 'Rama', 'Laksmana', 'Kresna',
        'Gajah Mada', 'Hayam Wuruk', 'Ken Arok', 'Ken Dedes', 'Raden Wijaya',
        'Patih Gajah Mada', 'Sultan Agung', 'Pangeran Diponegoro', 'Cut Nyak Dien', 'Kartini',
        'Soekarno', 'Hatta', 'Jenderal Sudirman', 'Bung Tomo', 'Pattimura',
        'Imam Bonjol', 'Antasari', 'Hasanuddin', 'Sisingamangaraja', 'Teuku Umar'
    ],
    'Mythical': [
        'Ambatron', 'Rusdi Ngawi', 'Mas Faiz', 'Kak Gem', 'Bernadya',
        'Cek Khodam', 'Skibidi Toilet', 'Sigma Male', 'Gigachad', 'Mewing Streak',
        'Raja Mexico', 'Paman Salto', 'Bapak Kau Salto', 'Jamal', 'Udin Petot',
        'Satoru Gojo', 'Sukuna', 'Naruto', 'Luffy', 'Goku',
        'Iron Man', 'Thanos', 'Spiderman', 'Batman', 'Joker',
        'Darth Vader', 'Yoda', 'Voldemort', 'Harry Potter', 'Gandalf',
        'Saitama', 'Eren Yeager', 'Levi Ackerman', 'Mikasa', 'Light Yagami',
        'L Lawliet', 'Kaneki Ken', 'Tanjiro', 'Nezuko', 'Zenitsu'
    ],
    'Legendary': [
        'Admin Slot', 'Bandar Togel', 'Kang Parkir Gaib', 'Ibu Kost Galak', 'Dosen Killer',
        'HRD Ghosting', 'Teman Pinjam Duit', 'Mantan Terindah', 'Tetangga Julid', 'Bocil Epep',
        'Kang Paket', 'Abang Bakso Intel', 'Polisi Tidur', 'Emak-emak Matic', 'Supir Angkot Racing',
        'Tukang Bubur Naik Haji', 'Tukang Gali Kubur', 'Tukang Santet', 'Dukun Beranak', 'Dukun Pelet',
        'Ketua RT', 'Pak Lurah', 'Pak Camat', 'Bupati', 'Gubernur',
        'Presiden', 'Raja Minyak', 'Sultan Arab', 'Elon Musk', 'Mark Zuckerberg'
    ],
    'Special': [
        'Mang Ujang', 'Anak Mang Ujang', 'Istri Mang Ujang', 'Gerobak Mang Ujang', 'Resep Rahasia Mang Ujang',
        'Warung Mang Ujang', 'Kantin Mang Ujang', 'Utang Mang Ujang', 'Laba Mang Ujang', 'Saham Mang Ujang'
    ]
};

const SUMMON_COST = 10; // 10 Coin Ujang

module.exports = {
    async handleKhodam(message, command, args) {
        const userId = message.author.id;

        // !khodam (Cek Khodam)
        if (command === '!khodam') {
            // --- LIST COMMAND ---
            if (args[1] && args[1].toLowerCase() === 'list') {
                const targetRarityInput = args.slice(2).join(' ').toLowerCase();

                // 1. Summary View
                if (!targetRarityInput) {
                    let totalWeight = 0;
                    for (const r in RARITY_WEIGHTS) totalWeight += RARITY_WEIGHTS[r];

                    const embed = new EmbedBuilder()
                        .setTitle('📜 DAFTAR KHODAM WARUNG')
                        .setColor('#FFD700')
                        .setDescription('Gunakan `!khodam list <rarity>` untuk melihat detail.\nContoh: `!khodam list mythical`');

                    for (const rarity in KHODAM_LIST) {
                        const count = KHODAM_LIST[rarity].length;
                        const chance = RARITY_WEIGHTS[rarity];
                        const percent = ((chance / totalWeight) * 100).toFixed(1);

                        embed.addFields({
                            name: `${rarity}`,
                            value: `**${count}** Item\nChance: ${percent}%`,
                            inline: true
                        });
                    }
                    return message.reply({ embeds: [embed] });
                }

                // 2. Detail View
                const rarityKey = Object.keys(KHODAM_LIST).find(k => k.toLowerCase() === targetRarityInput);

                if (!rarityKey) {
                    return message.reply(`❌ Rarity **${targetRarityInput}** tidak ditemukan.\nCoba: Normal, Common, Rare, Mythical, dll.`);
                }

                const items = KHODAM_LIST[rarityKey];
                // Handle long lists (simple split if needed, but for now just join)
                // Discord limit is 4096 for description, 1024 for field.
                // 20 items * ~20 chars = 400 chars. Should be safe.

                const embed = new EmbedBuilder()
                    .setTitle(`📜 KHODAM: ${rarityKey.toUpperCase()}`)
                    .setColor(getRarityColor(rarityKey))
                    .setDescription(items.join(', '));

                return message.reply({ embeds: [embed] });
            }

            // --- CHECK OWN KHODAM ---
            const userKhodam = db.getKhodam(userId);
            if (!userKhodam) {
                return message.reply('👻 Kamu belum punya Khodam. Ketik `!summon` untuk memanggil (Biaya: 10 Coin).');
            }

            const embed = new EmbedBuilder()
                .setTitle(`👻 Khodam Milik ${message.author.username}`)
                .setColor('#4b0082') // Indigo
                .addFields(
                    { name: 'Nama', value: `**${userKhodam.khodam_name}**`, inline: true },
                    { name: 'Rarity', value: `*${userKhodam.rarity}*`, inline: true },
                    { name: 'Sejak', value: `<t:${Math.floor(userKhodam.acquired_at / 1000)}:R>`, inline: false }
                )
                .setFooter({ text: 'Gunakan !lepas untuk membuang khodam ini.' });

            return message.reply({ embeds: [embed] });
        }

        // !summon (Gacha Khodam)
        if (command === '!summon') {
            // Check Coin
            const user = db.prepare('SELECT coin_ujang FROM user_economy WHERE user_id = ?').get(userId);
            if (!user || user.coin_ujang < SUMMON_COST) {
                return message.reply(`💸 **Coin kurang!** Butuh ${SUMMON_COST} Coin untuk ritual pemanggilan.`);
            }

            // Check Existing
            const existing = db.getKhodam(userId);
            if (existing) {
                return message.reply(`❌ Kamu sudah punya khodam **${existing.khodam_name}**!\nKetik \`!lepas\` dulu kalau mau ganti.`);
            }

            // Deduct Coin
            db.prepare('UPDATE user_economy SET coin_ujang = coin_ujang - ? WHERE user_id = ?').run(SUMMON_COST, userId);

            // Gacha Logic
            let totalWeight = 0;
            for (const r in RARITY_WEIGHTS) totalWeight += RARITY_WEIGHTS[r];

            let random = Math.random() * totalWeight;
            let selectedRarity = 'Normal';

            for (const r in RARITY_WEIGHTS) {
                if (random < RARITY_WEIGHTS[r]) {
                    selectedRarity = r;
                    break;
                }
                random -= RARITY_WEIGHTS[r];
            }

            const pool = KHODAM_LIST[selectedRarity];
            const selectedKhodam = pool[Math.floor(Math.random() * pool.length)];

            // Save to DB
            db.setKhodam(userId, selectedKhodam, selectedRarity);

            // Animation / Reveal
            const embed = new EmbedBuilder()
                .setTitle('🔮 RITUAL PEMANGGILAN KHODAM...')
                .setDescription(`*Asap kemenyan mengepul...*\n\nSelamat! Kamu diikuti oleh:\n# **${selectedKhodam}**\n\n✨ Rarity: **${selectedRarity}**`)
                .setColor(getRarityColor(selectedRarity));

            return message.reply({ embeds: [embed] });
        }

        // !lepas (Release Khodam)
        if (command === '!lepas') {
            const existing = db.getKhodam(userId);
            if (!existing) return message.reply('👻 Kamu gak punya khodam buat dilepas.');

            db.deleteKhodam(userId);
            return message.reply(`👋 **${existing.khodam_name}** telah kembali ke alam gaib.`);
        }
    }
};

function getRarityColor(rarity) {
    switch (rarity) {
        case 'Normal': return '#808080'; // Grey
        case 'Common': return '#ffffff'; // White
        case 'Uncommon': return '#00ff00'; // Green
        case 'Rare': return '#0000ff'; // Blue
        case 'Very Rare': return '#800080'; // Purple
        case 'Mythical': return '#ff0000'; // Red
        case 'Legendary': return '#ffd700'; // Gold
        case 'Special': return '#ff00ff'; // Magenta
        default: return '#000000';
    }
}
