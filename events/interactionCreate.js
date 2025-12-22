const { Events, MessageFlags, EmbedBuilder } = require('discord.js');
const userHandler = require('../handlers/userHandler.js');
const roleHandler = require('../handlers/roleHandler.js');
const adminHandler = require('../handlers/adminHandler.js');
const shopHandler = require('../handlers/shopHandler.js');
const kantinHandler = require('../handlers/kantinHandler.js');
const gameHandler = require('../handlers/gameHandler.js');
const crashHandler = require('../handlers/crashHandler.js');
const minesweeperHandler = require('../handlers/minesweeperHandler.js');
const unoHandler = require('../handlers/unoHandler.js');
const gamblingHandler = require('../handlers/gamblingHandler.js');
const blackjackHandler = require('../handlers/blackjackHandler.js');
const db = require('../database.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const client = interaction.client;
        const id = interaction.customId;
        try {
            // 1. SLASH COMMANDS
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;
                await command.execute(interaction, client, db);
                return;
            }

            // 2. INTERAKSI KOMPONEN
            if (!id) return;

            // A. PANEL USER (Kelola Role)
            if (id === 'panel_menu_role') {
                // FIX: Pindahkan deferReply ke sini untuk ACK instan
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                await roleHandler.handleMenuRole(interaction, client);
                return;
            }

            // B. CEK STATUS & RULES
            if (id === 'panel_cek_status') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }); // Defer di router
                await userHandler.handleCekStatus(interaction, db);
                return;
            }

            if (id === 'panel_rules') {
                const embed = new EmbedBuilder()
                    .setTitle('📜 PERATURAN & KETENTUAN CUSTOM ROLE')
                    .setColor('#FF4500')
                    .setThumbnail(client.user.displayAvatarURL())
                    .setDescription(
                        'Harap membaca aturan ini sebelum membeli atau membuat role. Pelanggaran dapat menyebabkan **Penghapusan Role Tanpa Refund**.'
                    )
                    .addFields(
                        {
                            name: '🛑 1. KONTEN & PENAMAAN',
                            value:
                                '• Dilarang nama role yang mengandung **SARA, NSFW, Politik, atau Kebencian**.\n' +
                                '• Dilarang kata-kata kasar.\n' +
                                '• Ikon role harus aman (SFW).'
                        },
                        {
                            name: '👮 2. PENIRUAN (IMPERSONATION)',
                            value:
                                '• Dilarang meniru nama/warna Staff (Admin/Mod).\n' +
                                '• Dilarang menipu member lain.'
                        },
                        {
                            name: '💸 3. TRANSAKSI',
                            value:
                                '• Tiket bersifat **FINAL** (No Refund).\n' +
                                '• Kesalahan user (salah hapus/edit) adalah tanggung jawab sendiri.'
                        },
                        {
                            name: '⚙️ 4. SISTEM',
                            value:
                                '• Max **3 Role** per user.\n' +
                                '• Role dihapus otomatis saat **Expired** atau **Leave Server**.'
                        },
                        {
                            name: '⚖️ 5. SANKSI',
                            value:
                                'Admin berhak **Hapus Paksa** tanpa notifikasi jika melanggar.'
                        },
                        // --- PESAN RAHASIA DI BAWAH RULES (SEBAGAI FIELD TERAKHIR) ---
                        {
                            name: '\u200b', // Judul kosong agar rapi
                            value:
                                '||✨ **Special Credits & Dedication** ✨\n\n' +
                                'First of all, thanks to God for everything.\n' +
                                'Terima kasih juga buat semua teman-teman yang udah support project ini dari nol.\n\n' +
                                '**And specially for Devi:**\n' +
                                'Makasih banyak ya udah selalu ada dan nemenin aku selama proses develop bot ini. Makasih udah jadi pendengar setia pas aku lagi pusing sama error, udah super sabar ngadepin emosiku yang kadang naik turun, dan bahkan rela ikutan begadang bareng cuma buat nemenin aku coding sampai pagi.\n\n' +
                                'Your support really keeps me going. I couldn\'t have done this without you.\n' +
                                '**I love you, D.** ❤️||'
                        }
                    )
                    .setFooter({ text: 'Dengan menggunakan fitur ini, Anda menyetujui aturan di atas.', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                return;
            }

            // C. ADMIN PANEL & GRADASI
            if (id.startsWith('btn_req_grad_') || id.startsWith('modal_grad_')) {
                await roleHandler.handleGradasiRequest(interaction, client);
                return;
            }
            if (id.startsWith('adm_') || id.startsWith('stk_') || id.startsWith('mod_') || id.startsWith('modal_stk')) {
                await adminHandler.handleAdminListener(interaction, client);
                return;
            }

            // D. SHOP / KANTIN HANDLER
            if (id === 'shop_buy_menu' || id === 'btn_close_shop') {
                await shopHandler.handleShopInteraction(interaction, client);
                return;
            }

            // WARUNG HANDLER
            if (id === 'warung_menu') {
                const { handleWarungInteraction } = require('../handlers/warungHandler.js');
                await handleWarungInteraction(interaction);
                return;
            }

            // LUXURY ITEMS SHOP HANDLER
            if (id === 'luxury_shop_buy') {
                const luxuryHandler = require('../handlers/luxuryItemsHandler.js');
                await luxuryHandler.handleLuxuryBuy(interaction);
                return;
            }

            // E. KANTIN FUN MENU & MAKAN
            if (id === 'kantin_menu') {
                await kantinHandler.handleKantinInteraction(interaction);
                return;
            }
            if (id === 'makan_menu') {
                const selected = interaction.values[0];
                await kantinHandler.handleEat(interaction, selected);
                return;
            }
            if (id.startsWith('kantin_party_select_')) {
                await kantinHandler.handlePartySelect(interaction);
                return;
            }

            // F. GAME HANDLER (PALAK / RPS)
            if (id.startsWith('palak_') || id.startsWith('rps_')) {
                await gameHandler.handleButton(interaction);
                return;
            }

            // G. CRASH / SAHAM HANDLER
            if (id.startsWith('crash_')) {
                // Defer immediately to prevent "interaction failed"
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferUpdate();
                    }
                } catch (e) {
                    console.error('[CRASH DEFER ERROR]', e);
                }
                await crashHandler.handleInteraction(interaction);
                return;
            }

            // H. MINESWEEPER HANDLER
            if (id.startsWith('mine_')) {
                // Defer immediately to prevent "interaction failed"
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferUpdate();
                    }
                } catch (e) {
                    console.error('[MINESWEEPER DEFER ERROR]', e);
                }
                await minesweeperHandler.handleInteraction(interaction);
                return;
            }

            // I. UNO HANDLER
            if (id.startsWith('uno_')) {
                // Defer immediately to prevent "interaction failed"
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferUpdate();
                    }
                } catch (e) {
                    console.error('[UNO DEFER ERROR]', e);
                }
                await unoHandler.handleInteraction(interaction);
                return;
            }

            // J. SLOT HANDLER (Stop Button)
            if (id.startsWith('slot_')) {
                // Defer immediately to prevent "interaction failed"
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferUpdate();
                    }
                } catch (e) {
                    console.error('[SLOT DEFER ERROR]', e);
                }
                await gamblingHandler.handleSlotButton(interaction);
                return;
            }

            // K. BLACKJACK HANDLER
            if (id.startsWith('bj_')) {
                // Defer immediately to prevent "interaction failed"
                try {
                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferUpdate();
                    }
                } catch (e) {
                    console.error('[BLACKJACK DEFER ERROR]', e);
                }
                await blackjackHandler.handleInteraction(interaction);
                return;
            }

            // L. ANNOUNCEMENT BUTTONS
            if (id === 'announce_claim_compensation') {
                try {
                    await interaction.deferReply({ ephemeral: true });
                    const compensationHandler = require('../handlers/compensationHandler.js');
                    await compensationHandler.handleCompensation(interaction, 'claim', ['claimcompensation', 'claim']);
                } catch (error) {
                    console.error('[ANNOUNCE CLAIM ERROR]', error);
                    try {
                        if (interaction.deferred || interaction.replied) {
                            await interaction.editReply({ content: '❌ **Error:** Gagal claim kompensasi. Silakan hubungi admin.' });
                        } else {
                            await interaction.reply({ content: '❌ **Error:** Gagal claim kompensasi. Silakan hubungi admin.', ephemeral: true });
                        }
                    } catch (e) {
                        console.error('[ANNOUNCE CLAIM ERROR - Follow up failed]', e);
                    }
                }
                return;
            }
            if (id === 'announce_help') {
                try {
                    const helpEmbed = new EmbedBuilder()
                        .setTitle('📚 **HELP MENU**')
                        .setDescription('Ketik `!help` untuk melihat semua commands lengkap!')
                        .setColor('#0099FF')
                        .addFields(
                            {
                                name: '💰 **KOMPENSASI**',
                                value: '`!claimcompensation` - Ambil kompensasi database reset',
                                inline: true
                            },
                            {
                                name: '🏦 **BANKING**',
                                value: '`!bank` - Cek saldo bank\n`!bank deposit <amount>` - Deposit\n`!bank withdraw <amount>` - Withdraw (max 10M/hari)',
                                inline: true
                            },
                            {
                                name: '🎮 **GAMES**',
                                value: '`!cf <bet>` - Coinflip\n`!slots <bet>` - Slots\n`!saham <bet>` - Crash\n`!bom <bet>` - Minesweeper',
                                inline: true
                            },
                            {
                                name: '📊 **STATS & ACHIEVEMENTS**',
                                value: '`!pencapaian` - Lihat statistics\n`!achievements` - Lihat semua achievements\n`!claim` - Claim reward achievement',
                                inline: true
                            },
                            {
                                name: '💎 **LUXURY & GENG**',
                                value: '`!luxury` - Toko luxury items\n`!buffs` - Lihat active buffs\n`!geng create <nama>` - Buat geng',
                                inline: true
                            }
                        )
                        .setFooter({ text: 'Warung Mang Ujang : Reborn Bot' })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
                } catch (error) {
                    console.error('[ANNOUNCE HELP ERROR]', error);
                    try {
                        if (interaction.deferred || interaction.replied) {
                            await interaction.editReply({ content: '❌ **Error:** Gagal menampilkan help menu.' });
                        } else {
                            await interaction.reply({ content: '❌ **Error:** Gagal menampilkan help menu.', ephemeral: true });
                        }
                    } catch (e) {
                        console.error('[ANNOUNCE HELP ERROR - Follow up failed]', e);
                    }
                }
                return;
            }
            if (id === 'announce_bank') {
                try {
                    await interaction.deferReply({ ephemeral: true });
                    const db = require('../database.js');
                    const { formatMoney } = require('../utils/helpers.js');
                    
                    const userId = interaction.user.id;
                    const bankBalance = db.getBankBalance(userId);
                    const mainBalance = db.getBalance(userId);
                    const loan = db.getLoan(userId);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🏦 BANK MANG UJANG')
                        .setColor('#0099ff')
                        .setDescription('Simpan uangmu di bank untuk aman dan dapat bunga!')
                        .addFields(
                            { name: '💰 Saldo Utama', value: `Rp ${formatMoney(mainBalance)}`, inline: true },
                            { name: '🏦 Saldo Bank', value: `Rp ${formatMoney(bankBalance)}`, inline: true },
                            { name: '💎 Total Assets', value: `Rp ${formatMoney(mainBalance + bankBalance)}`, inline: true }
                        );

                    if (loan && loan.loan_amount > 0) {
                        const daysElapsed = Math.max(1, Math.floor((Date.now() - loan.loan_start_time) / (24 * 60 * 60 * 1000)));
                        let interest = 0;
                        let remaining = loan.loan_amount;
                        
                        for (let day = 0; day < daysElapsed; day++) {
                            const dailyInterest = Math.floor(remaining * loan.interest_rate);
                            interest += dailyInterest;
                            remaining += dailyInterest;
                        }
                        
                        const totalOwed = loan.loan_amount + interest;
                        const daysLeft = Math.ceil((loan.loan_due_time - Date.now()) / (24 * 60 * 60 * 1000));
                        
                        embed.addFields(
                            { name: '📋 Pinjaman Aktif', value: `Rp ${formatMoney(loan.loan_amount)}`, inline: false },
                            { name: '💸 Bunga Terakumulasi', value: `Rp ${formatMoney(interest)} (${daysElapsed} hari)`, inline: true },
                            { name: '💰 Total Hutang', value: `Rp ${formatMoney(totalOwed)}`, inline: true },
                            { name: '⏰ Jatuh Tempo', value: `${daysLeft > 0 ? daysLeft : 'TERLAMBAT!'} hari`, inline: true }
                        );
                    }

                    embed.setFooter({ text: 'Ketik !bank deposit/withdraw/loan untuk transaksi' });
                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error('[ANNOUNCE BANK ERROR]', error);
                    try {
                        if (interaction.deferred || interaction.replied) {
                            await interaction.editReply({ content: '❌ **Error:** Gagal menampilkan info bank.' });
                        } else {
                            await interaction.reply({ content: '❌ **Error:** Gagal menampilkan info bank.', ephemeral: true });
                        }
                    } catch (e) {
                        console.error('[ANNOUNCE BANK ERROR - Follow up failed]', e);
                    }
                }
                return;
            }

        } catch (error) {
            console.error('[INTERACTION ERROR]', error);
        }
    },
};