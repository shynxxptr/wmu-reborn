const { EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database.js');

// DAFTAR MENU & EFEK LUCU
const MENU_KANTIN = {
    'kopi_sigma': {
        label: 'Es Kopi Sigma',
        price: 15000,
        emoji: '☕',
        desc: 'Rp 15.000 - Menambah aura kesigmaan.',
        reply: '🗿 **Kamu meminum Es Kopi Sigma.**\n\n*Tiba-tiba rahangmu mengeras, tatapanmu tajam...*\nStatus: **Sigma Male Grindset Aktif (1000%)**'
    },
    'mie_tante': {
        label: 'Mie Goreng Tante',
        price: 12000,
        emoji: '🍝',
        desc: 'Rp 12.000 - Mie legendaris kantin.',
        reply: '🍝 **Kamu menyantap Mie Goreng Tante.**\n\n*Rasanya seperti pelukan hangat di tengah deadline.*\nSkill Unlocked: **SKS (Sistem Kebut Semalam) - Fokus +50%**'
    },
    'bakso_urat': {
        label: 'Bakso Urat',
        price: 18000,
        emoji: '🥣',
        desc: 'Rp 18.000 - Keras tapi nikmat.',
        reply: '🥣 **Kamu memakan Bakso Urat.**\n\n*Otot kawat tulang besi... tapi dompet tipis.*\nEfek: **Kenyang Maksimal, Uang Minimal.**'
    },
    'es_teh': {
        label: 'Es Teh Manis',
        price: 5000,
        emoji: '🍹',
        desc: 'Rp 5.000 - Obat segala masalah.',
        reply: '🍹 **Slurpp... Ahh Segar!**\n\n*Menghilangkan haus dan kenangan mantan.*\nStatus: **Gamon (Gagal Move On) Hilang 50%**'
    },
    'roti_bakar': {
        label: 'Roti Bakar',
        price: 10000,
        emoji: '🍞',
        desc: 'Rp 10.000 - Manis dan hangat.',
        reply: '🍞 **Nyam nyam... Roti Bakar.**\n\n*Manisnya ngalahin janji dia.*\nEfek: **Mood Booster +100**'
    },
    'cimol': {
        label: 'Cimol',
        price: 5000,
        emoji: '🍡',
        desc: 'Rp 5.000 - Kenyal-kenyal nagih.',
        reply: '🍡 **Kamu nyemil Cimol.**\n\n*Kenyal banget, awas keselek!*\nStatus: **Mulut Tak Bisa Berhenti Ngunyah**'
    },
    'telur_gulung': {
        label: 'Telur Gulung',
        price: 2000,
        emoji: '🥚',
        desc: 'Rp 2.000 - Jajanan SD legend.',
        reply: '🥚 **Hap! Telur Gulung masuk mulut.**\n\n*Nostalgia masa SD langsung terasa.*\nEfek: **Ingatan Masa Kecil +100**'
    },
    'papeda': {
        label: 'Papeda Gulung',
        price: 3000,
        emoji: '🥢',
        desc: 'Rp 3.000 - Lengket tapi enak.',
        reply: '🥢 **Kamu makan Papeda Gulung.**\n\n*Lengket-lengket gurih nyoy.*\nStatus: **Perut Senang, Hati Tenang**'
    },
    'korek_gas': {
        label: 'Korek Gas Tokai',
        price: 2000,
        emoji: '🔥',
        desc: 'Rp 2.000 - Buat nyalain "itu".',
        reply: '🔥 **Kamu beli Korek Gas.**\n\n*Kecil tapi berguna. Jangan sampai ilang diambil teman!*'
    },
    'coklat_silverqueen': {
        label: 'Silverqueen Chunky Bar',
        price: 15000,
        emoji: '🍫',
        desc: 'Rp 15.000 - Coklat anti galau.',
        reply: '🍫 **Nyam... Manis banget!**\n\n*Mood langsung naik, stress langsung turun.*\nStatus: **Stress -40, Hati Senang**',
        stress_relief: 40
    },
    'seblak_pedas': {
        label: 'Seblak Pedas Mampus',
        price: 10000,
        emoji: '🌶️',
        desc: 'Rp 10.000 - Pedasnya bikin melek.',
        reply: '🌶️ **Hah.. Hah.. Pedas!**\n\n*Keringat bercucuran, tapi enak banget!*\nEfek: **Lapar -40, Haus +30, Stress -20**'
    },
    'nasi_kuning': {
        label: 'Nasi Kuning Komplit',
        price: 12000,
        emoji: '🍛',
        desc: 'Rp 12.000 - Sarapan para juara.',
        reply: '🍛 **Nyam... Kenyang Pol!**\n\n*Perut kenyang, hati senang, mata ngantuk.*\nEfek: **Lapar -80 (Kenyang Maksimal)**'
    },
    'kuku_bima': {
        label: 'Kuku Bima Enerji',
        price: 4000,
        emoji: '⚡',
        desc: 'Rp 4.000 - Rosa! Rosa!',
        reply: '⚡ **ROSA!**\n\n*Tenaga langsung full, siap kerja rodi!*\nEfek: **Limit Kerja +2 (Stamina Boost)**'
    }
};

module.exports = {
    MENU_KANTIN,

    async handleKantinInteraction(interaction) {
        const { customId, user } = interaction;

        try {
            if (customId === 'kantin_menu') {
                const selected = interaction.values[0];
                const menu = MENU_KANTIN[selected];

                if (!menu) {
                    return interaction.reply({ content: '❌ Menu tidak ditemukan/habis.', flags: [MessageFlags.Ephemeral] });
                }

                // 1. CEK UANG USER
                const userData = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(user.id);
                const uangUser = userData ? userData.uang_jajan : 0;

                if (uangUser < menu.price) {
                    return interaction.reply({
                        content: `💸 **Uang Jajan Kurang!**\n\nHarga: Rp ${menu.price.toLocaleString('id-ID')}\nUangmu: Rp ${uangUser.toLocaleString('id-ID')}\n\n*Kerja dulu gih! Ketik ` + '`!bantujualan`' + ' atau ' + '`!nyapulapangan`' + ' buat cari duit.*',
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                // 2. KURANGI UANG
                if (userData) {
                    db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(menu.price, user.id);
                } else {
                    return interaction.reply({ content: '❌ Error data user.', flags: [MessageFlags.Ephemeral] });
                }

                // 3. TAMBAH KE INVENTARIS
                const cekInv = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, selected);
                if (cekInv) {
                    db.prepare('UPDATE inventaris SET jumlah = jumlah + 1 WHERE user_id = ? AND jenis_tiket = ?').run(user.id, selected);
                } else {
                    db.prepare('INSERT INTO inventaris (user_id, jenis_tiket, jumlah) VALUES (?, ?, 1)').run(user.id, selected);
                }

                // 4. KIRIM KONFIRMASI
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle(`${menu.emoji} Pesanan Diterima!`)
                    .setDescription(`**${menu.label}** telah ditambahkan ke tas kamu.\n\nGunakan command \`/makan\` untuk menyantapnya!\n\n💰 **Sisa Uang Jajan:** Rp ${(uangUser - menu.price).toLocaleString('id-ID')}`)
                    .setFooter({ text: `Selamat makan, ${user.username}!`, iconURL: user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('[Kantin Handler Error]', error);
            await interaction.reply({ content: '❌ Uh oh, piringnya pecah (Error).', flags: [MessageFlags.Ephemeral] });
        }
    },

    async handleEat(interaction, itemKey) {
        const user = interaction.user;

        // Cek di MENU_KANTIN atau MENU_WARUNG
        let menu = MENU_KANTIN[itemKey];
        let isWarungItem = false;
        let isLuxuryItem = false;

        if (!menu) {
            const { MENU_WARUNG } = require('./warungHandler.js');
            menu = MENU_WARUNG[itemKey];
            isWarungItem = true;
        }

        // Cek luxury items
        if (!menu) {
            try {
                const { LUXURY_ITEMS } = require('./luxuryItemsHandler.js');
                if (LUXURY_ITEMS[itemKey]) {
                    menu = LUXURY_ITEMS[itemKey];
                    isLuxuryItem = true;
                }
            } catch (e) {
                // Luxury handler not available
            }
        }

        console.log(`[EAT DEBUG] User: ${user.username}, Item: ${itemKey}, IsWarung: ${isWarungItem}, IsLuxury: ${isLuxuryItem}, Type: ${menu?.type}`);

        if (!menu) return interaction.reply({ content: '❌ Barang tidak valid.', flags: [MessageFlags.Ephemeral] });

        // Handle luxury items
        if (isLuxuryItem) {
            try {
                const luxuryHandler = require('./luxuryItemsHandler.js');
                const result = await luxuryHandler.handleLuxuryUse(user.id, itemKey);
                
                if (!result.success) {
                    return interaction.reply({ content: `❌ ${result.error}`, flags: [MessageFlags.Ephemeral] });
                }

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`✨ ${result.item} Digunakan!`)
                    .setDescription(
                        `🎉 **Luxury item berhasil digunakan!**\n\n` +
                        `**✨ Efek Aktif:**\n${result.effects}\n\n` +
                        `💡 **Tip:** Gunakan \`!buffs\` untuk cek semua active buffs!`
                    )
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
                    .setAuthor({ 
                        name: user.username, 
                        iconURL: user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setFooter({ text: '💎 Luxury Item' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            } catch (e) {
                console.error('[Luxury Item Error]', e);
                return interaction.reply({ content: '❌ Error menggunakan luxury item.', flags: [MessageFlags.Ephemeral] });
            }
        }

        // 1. CEK INVENTARIS
        const item = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, itemKey);
        if (!item || item.jumlah <= 0) {
            return interaction.reply({ content: `❌ Kamu tidak punya **${menu.label}**!`, flags: [MessageFlags.Ephemeral] });
        }

        // 1.5 CEK KOREK (JANGAN DIMAKAN)
        if (itemKey === 'korek_gas') {
            return interaction.reply({
                content: '🔥 **Waduh!** Jangan dimakan bang, itu korek gas! Meledak nanti perutmu.\n*Gunakan korek otomatis saat merokok.*',
                flags: [MessageFlags.Ephemeral]
            });
        }

        // 2. LOGIKA ALKOHOL (MODAL TAG TEMAN -> USER SELECT MENU)
        if (isWarungItem && menu.type === 'alkohol') {
            const { UserSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');

            const userSelect = new UserSelectMenuBuilder()
                .setCustomId(`kantin_party_select_${itemKey}`)
                .setPlaceholder('Pilih 3-5 teman mabukmu...')
                .setMinValues(3)
                .setMaxValues(5);

            const row = new ActionRowBuilder().addComponents(userSelect);

            await interaction.reply({
                content: `🍻 **PESTA MIRAS!**\nKamu akan membuka **${menu.label}**.\nSilakan pilih 3-5 teman untuk diajak mabuk bareng!`,
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }

        // 3. PROSES KONSUMSI LANGSUNG (Non-Alkohol)
        await this.processConsume(interaction, user, itemKey, menu, isWarungItem, item.jumlah);
    },

    // Handle User Select Menu for Party
    async handlePartySelect(interaction) {
        const itemKey = interaction.customId.replace('kantin_party_select_', '');
        const friendsIds = interaction.values; // Array of User IDs
        const user = interaction.user;

        console.log(`[PARTY DEBUG] User ${user.id} selected friends: ${friendsIds.join(', ')} for item ${itemKey}`);

        // Ambil Menu Info
        const { MENU_WARUNG } = require('./warungHandler.js');
        const menu = MENU_WARUNG[itemKey];

        // Cek Inventaris Lagi (Prevent exploit)
        const item = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, itemKey);
        if (!item || item.jumlah <= 0) {
            return interaction.update({ content: `❌ Barang sudah habis!`, components: [], embeds: [] });
        }

        // UX: Remove dropdown immediately (Ephemeral)
        await interaction.update({ content: '✅ **Minuman dituangkan...**', components: [], embeds: [] });

        // --- LOGIKA ALKOHOL (PUBLIC MESSAGE) ---
        const allDrinkers = [user.id, ...friendsIds];
        const drunkEvents = [
            "muntah di sepatu teman",
            "nangis inget mantan",
            "joget di atas meja",
            "ketiduran di kamar mandi",
            "nelpon dosen jam 2 pagi",
            "ngaku-ngaku jadi ultramen",
            "salto dari meja bar",
            "nyanyi lagu galau kenceng banget"
        ];

        let partyLog = "";

        // Loop Drinkers
        allDrinkers.forEach(drinkerId => {
            // Ensure user exists
            const checkUser = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(drinkerId);
            if (!checkUser) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(drinkerId);

            // Apply Effect (Reset Stats & Bonus Work Limit)
            db.prepare(`
                UPDATE user_economy SET 
                hunger = 0, 
                thirst = 0, 
                stress = 0,
                last_work_count = last_work_count - 25,
                last_work_time = ?
                WHERE user_id = ?
            `).run(Date.now(), drinkerId);

            // Random Event for Friends
            if (drinkerId !== user.id) {
                const randomEvent = drunkEvents[Math.floor(Math.random() * drunkEvents.length)];
                partyLog += `\n- <@${drinkerId}>: *${randomEvent}*`;
            }
        });

        // Kurangi Stok Host
        db.prepare('UPDATE inventaris SET jumlah = jumlah - 1 WHERE user_id = ? AND jenis_tiket = ?').run(user.id, itemKey);

        // Send PUBLIC Message
        const embed = new EmbedBuilder()
            .setColor('#36393F')
            .setTitle('🥴 PESTA MIRAS PECAH!')
            .setDescription(`**${user.username}** membuka **${menu.label}** untuk ${friendsIds.length} temannya!\n\n**Efek Party:**${partyLog}\n\n✨ **SEMUA ORANG:**\n• Stats RESET ke 0 (Segar Bugar)\n• Limit Kerja +25x (Mode Kuli)`)
            .setFooter({ text: `Sisa ${menu.label}: ${item.jumlah - 1} buah` });

        await interaction.channel.send({ content: `<@${user.id}> ${friendsIds.map(id => `<@${id}>`).join(' ')}`, embeds: [embed] });
    },

    async processConsume(interaction, user, itemKey, menu, isWarungItem, currentStock, friendsIds = []) {
        // 1. LOGIKA ROKOK (Butuh Korek)
        if (isWarungItem && menu.type === 'rokok') {
            const korek = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, 'korek_gas');
            if (!korek || korek.jumlah <= 0) {
                // Check if interaction is deferred (Modal reply vs Button reply)
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: '❌ **Gak punya korek!** Beli dulu di `/kantin`.' });
                }
                return interaction.reply({ content: '❌ **Gak punya korek!** Beli dulu di `/kantin`.', flags: [MessageFlags.Ephemeral] });
            }
        }

        // 2. KURANGI STOK
        db.prepare('UPDATE inventaris SET jumlah = jumlah - 1 WHERE user_id = ? AND jenis_tiket = ?').run(user.id, itemKey);

        // 3. EFEK BUFF & STATS
        let effectText = menu.reply || `🍽️ Kamu mengonsumsi **${menu.label}**.`;
        if (isWarungItem && menu.type === 'rokok') effectText = `🚬 **Fyuuh...** Kamu menghisap ${menu.label}.`;

        // Update Stats
        let hungerRed = 0;
        let thirstRed = 0;
        let stressRed = 0;

        // Definisi Efek Item
        if (itemKey.includes('kopi') || itemKey.includes('es_teh')) thirstRed = 30;
        else if (!isWarungItem && itemKey !== 'korek_gas') hungerRed = 30; // Makanan

        // Stress Relief
        if (menu.stress_relief) {
            stressRed = menu.stress_relief;
        } else if (isWarungItem && menu.type === 'rokok') {
            stressRed = 30; // Default rokok
        }

        // EFEK KHUSUS: ALKOHOL (MABUK BARENG)
        if (isWarungItem && menu.type === 'alkohol') {
            const allDrinkers = [user.id, ...friendsIds];

            // Random Drunk Events
            const drunkEvents = [
                "muntah di sepatu teman",
                "nangis inget mantan",
                "joget di atas meja",
                "ketiduran di kamar mandi",
                "nelpon dosen jam 2 pagi",
                "ngaku-ngaku jadi ultramen"
            ];

            let partyLog = "";

            allDrinkers.forEach(drinkerId => {
                // Ensure user exists
                const checkUser = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(drinkerId);
                if (!checkUser) db.prepare('INSERT INTO user_economy (user_id) VALUES (?)').run(drinkerId);

                // Apply Effect
                db.prepare(`
                    UPDATE user_economy SET 
                    hunger = 0, 
                    thirst = 0, 
                    stress = 0,
                    last_work_count = last_work_count - 25,
                    last_work_time = ?
                    WHERE user_id = ?
                `).run(Date.now(), drinkerId);

                // Random Event for Friends
                if (drinkerId !== user.id) {
                    const randomEvent = drunkEvents[Math.floor(Math.random() * drunkEvents.length)];
                    partyLog += `\n- <@${drinkerId}>: *${randomEvent}*`;
                }
            });

            effectText += `\n\n🍻 **PESTA MIRAS PECAH!**\nKamu dan ${friendsIds.length} temanmu mabuk berat!\n\n**Efek Party:**${partyLog}\n\n✨ **SEMUA ORANG:**\n• Stats RESET ke 0 (Segar Bugar)\n• Limit Kerja +25x (Mode Kuli)`;
        } else {
            // Apply Normal Stats Reduction
            db.prepare(`
                UPDATE user_economy SET 
                hunger = MAX(0, hunger - ?),
                thirst = MAX(0, thirst - ?),
                stress = MAX(0, stress - ?) 
                WHERE user_id = ?
                `).run(hungerRed, thirstRed, stressRed, user.id);

            if (hungerRed > 0) effectText += `\n📉 ** Lapar - ${hungerRed} %** `;
            if (thirstRed > 0) effectText += `\n📉 ** Haus - ${thirstRed} %** `;
            if (stressRed > 0) effectText += `\n📉 ** Stress - ${stressRed} %** `;
        }

        // EFEK KHUSUS: Mie Goreng Tante (Reset Job Limit)
        if (itemKey === 'mie_tante') {
            db.prepare('UPDATE user_economy SET last_work_count = 0 WHERE user_id = ?').run(user.id);
            effectText += '\n✨ **BUFF AKTIF:** Limit kerja harian di-reset!';
        }

        // EFEK KHUSUS: Seblak Pedas (Thirst +30)
        if (itemKey === 'seblak_pedas') {
            db.prepare('UPDATE user_economy SET thirst = MIN(100, thirst + 30) WHERE user_id = ?').run(user.id);
            effectText += '\n🔥 **PEDAS!** Haus bertambah +30%.';
        }

        // EFEK KHUSUS: Nasi Kuning (Hunger -80)
        if (itemKey === 'nasi_kuning') {
            db.prepare('UPDATE user_economy SET hunger = MAX(0, hunger - 80) WHERE user_id = ?').run(user.id);
            effectText += '\n🍚 **KENYANG!** Lapar berkurang drastis (-80%).';
        }

        // EFEK KHUSUS: Kuku Bima (Job Limit +2)
        if (itemKey === 'kuku_bima') {
            db.prepare('UPDATE user_economy SET last_work_count = last_work_count - 2 WHERE user_id = ?').run(user.id);
            effectText += '\n⚡ **STAMINA!** Limit kerja bertambah (+2x).';
        }

        // EFEK KHUSUS: Pod Bekas (RNG)
        if (itemKey === 'pod_bekas') {
            const hoki = Math.random() > 0.5;
            if (hoki) {
                db.prepare('UPDATE user_economy SET stress = MAX(0, stress - 60) WHERE user_id = ?').run(user.id);
                effectText += '\n😋 **Enak!** Liquidnya rasa Strawberry Cheesecake. Stress -60.';
            } else {
                db.prepare('UPDATE user_economy SET stress = MIN(100, stress + 20) WHERE user_id = ?').run(user.id);
                effectText += '\n🤢 **ZONK!** Liquidnya rasa gosong (Dry Hit). Stress +20.';
            }
        }

        // 4. REPLY
        const embed = new EmbedBuilder()
            .setColor(isWarungItem ? '#36393F' : '#00FF00')
            .setTitle(isWarungItem ? (menu.type === 'alkohol' ? '🥴 MABUK BERAT' : '🚬 Smoking Time') : '🍽️ Nyam Nyam!')
            .setDescription(effectText)
            .setFooter({ text: `Sisa ${menu.label}: ${currentStock - 1} buah` });

        // Handle Reply vs EditReply depending on context (Modal vs Button)
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
    }
};
