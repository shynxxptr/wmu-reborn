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
                await crashHandler.handleInteraction(interaction);
                return;
            }

            // H. MINESWEEPER HANDLER
            if (id.startsWith('mine_')) {
                await minesweeperHandler.handleInteraction(interaction);
                return;
            }

            // I. UNO HANDLER
            if (id.startsWith('uno_')) {
                await unoHandler.handleInteraction(interaction);
                return;
            }

            // J. SLOT HANDLER (Stop Button)
            if (id.startsWith('slot_')) {
                await gamblingHandler.handleSlotInteraction(interaction);
                return;
            }

            // K. BLACKJACK HANDLER
            if (id.startsWith('bj_')) {
                await blackjackHandler.handleInteraction(interaction);
                return;
            }

        } catch (error) {
            console.error('[INTERACTION ERROR]', error);
        }
    },
};