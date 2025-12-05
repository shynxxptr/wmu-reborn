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

        if (!menu) {
            const { MENU_WARUNG } = require('./warungHandler.js');
            menu = MENU_WARUNG[itemKey];
            isWarungItem = true;
        }

        if (!menu) return interaction.reply({ content: '❌ Barang tidak valid.', flags: [MessageFlags.Ephemeral] });

        // 1. CEK INVENTARIS
        const item = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, itemKey);
        if (!item || item.jumlah <= 0) {
            return interaction.reply({ content: `❌ Kamu tidak punya **${menu.label}**!`, flags: [MessageFlags.Ephemeral] });
        }

        // 2. LOGIKA ALKOHOL (MODAL TAG TEMAN)
        if (isWarungItem && menu.type === 'alkohol') {
            const modal = new ModalBuilder()
                .setCustomId(`modal_mabuk_${itemKey}`)
                .setTitle('🍻 Siapa Teman Minummu?');

            const friendsInput = new TextInputBuilder()
                .setCustomId('friends_input')
                .setLabel('Tag 2 teman kamu (Wajib!)')
                .setPlaceholder('@teman1 @teman2')
                .setStyle(TextInputStyle.Short)
                .setMinLength(10)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(friendsInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
            return;
        }

        // 3. PROSES KONSUMSI LANGSUNG (Non-Alkohol)
        await this.processConsume(interaction, user, itemKey, menu, isWarungItem, item.jumlah);
    },

    async handleMabukModal(interaction) {
        const itemKey = interaction.customId.replace('modal_mabuk_', '');
        const friendsInput = interaction.fields.getTextInputValue('friends_input');
        const user = interaction.user;

        // Cek Tag (Minimal 2 Unique User ID)
        const mentionedIds = friendsInput.match(/<@!?(\d+)>/g);
        const uniqueIds = mentionedIds ? [...new Set(mentionedIds)] : [];

        if (uniqueIds.length < 2) {
            return interaction.reply({
                content: '🚫 **Gak asik lu!**\nKalo mau minum, ajak ajak kawan lahh! (Minimal tag 2 orang)',
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Ambil Menu Info
        const { MENU_WARUNG } = require('./warungHandler.js');
        const menu = MENU_WARUNG[itemKey];

        // Cek Inventaris Lagi (Prevent exploit)
        const item = db.prepare('SELECT * FROM inventaris WHERE user_id = ? AND jenis_tiket = ?').get(user.id, itemKey);
        if (!item || item.jumlah <= 0) {
            return interaction.reply({ content: `❌ Barang sudah habis!`, flags: [MessageFlags.Ephemeral] });
        }

        // Proses Konsumsi
        await this.processConsume(interaction, user, itemKey, menu, true, item.jumlah);
    },

    async processConsume(interaction, user, itemKey, menu, isWarungItem, currentStock) {
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

        // EFEK KHUSUS: ALKOHOL (MABUK)
        if (isWarungItem && menu.type === 'alkohol') {
            // Reset Stats to 0 and Update last_work_time to prevent immediate reset
            db.prepare(`
                UPDATE user_economy SET 
                hunger = 0, 
                thirst = 0, 
                stress = 0,
                last_work_count = last_work_count - 25,
                last_work_time = ?
                WHERE user_id = ?
            `).run(Date.now(), user.id);

            effectText += '\n\n✨ **EFEK MABUK:**\n• Lapar, Haus, Stress RESET ke 0!\n• Limit Kerja bertambah (+25x)!';
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
