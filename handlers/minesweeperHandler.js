const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');

// Active Minesweeper Games
// Key: messageId (The game embed message)
// Value: { userId, bet, grid: [0=safe, 1=bomb], revealed: [bool], multiplier, bombsCount, isCashout }
const activeMines = new Map();

// Configuration
const GRID_SIZE = 25; // 5x5
const BOMB_COUNT = 5; // Fixed 5 bombs for now (can be dynamic later)

// Multiplier Calculation (Simple exponential or linear based on odds)
// Odds = Total / Safe_Remaining
const calculateNextMultiplier = (currentMult, safeRemaining, totalRemaining) => {
    // Standard Mines formula: Multiplier * (Total_Spots / Safe_Spots)
    // 25 spots, 5 bombs -> 20 safe.
    // 1st click: 25/20 = 1.25x
    // 2nd click: 24/19 = 1.26x ...
    // We apply a small house edge (e.g., 5%)
    const rawOdds = totalRemaining / safeRemaining;
    const houseEdge = 0.95;
    return currentMult * rawOdds * houseEdge;
};

module.exports = {
    activeMines,

    async handleMines(message, command, args) {
        const userId = message.author.id;

        // Parse Bet
        const rawBet = args[1];
        if (!rawBet) return message.reply('❌ Format: `!bom <bet>` atau `!bom all`');

        const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
        const balance = user ? user.uang_jajan : 0;

        let bet = 0;
        const lower = rawBet.toLowerCase();
        if (lower === 'all' || lower === 'allin') bet = balance;
        else if (lower.endsWith('k')) bet = parseFloat(lower) * 1000;
        else if (lower.endsWith('m') || lower.endsWith('jt')) bet = parseFloat(lower) * 1000000;
        else bet = parseInt(lower);

        if (isNaN(bet) || bet <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
        if (balance < bet) return message.reply('💸 **Uang gak cukup!**');

        // Deduct Bet
        db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(bet, userId);

        // Generate Grid
        const grid = Array(GRID_SIZE).fill(0);
        let placedBombs = 0;
        while (placedBombs < BOMB_COUNT) {
            const idx = Math.floor(Math.random() * GRID_SIZE);
            if (grid[idx] === 0) {
                grid[idx] = 1;
                placedBombs++;
            }
        }

        // Create UI
        const rows = [];
        for (let i = 0; i < 5; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 5; j++) {
                const idx = i * 5 + j;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mine_click_${idx}`)
                        .setLabel('❓')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            rows.push(row);
        }

        // Add Cashout Button
        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mine_cashout')
                .setLabel('💰 CASHOUT (1.00x)')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true) // Cannot cashout before playing
        );

        const embed = new EmbedBuilder()
            .setTitle('💣 TEBAK BOM (Minesweeper)')
            .setDescription(`Bet: **Rp ${bet.toLocaleString('id-ID')}**\nBom: **${BOMB_COUNT}**\nMultiplier: **1.00x**\n\n*Klik kotak untuk mencari uang, hindari bom!*`)
            .setColor('#FFFF00');

        const msg = await message.reply({ embeds: [embed], components: [...rows, controlRow] });

        // Save State
        activeMines.set(msg.id, {
            userId,
            bet,
            grid,
            revealed: Array(GRID_SIZE).fill(false),
            multiplier: 1.0,
            bombsCount: BOMB_COUNT,
            messageId: msg.id
        });
    },

    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('mine_')) return;

        const game = activeMines.get(interaction.message.id);
        if (!game) return interaction.reply({ content: '❌ Game sudah berakhir.', flags: [MessageFlags.Ephemeral] });

        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: '❌ Bukan game kamu!', flags: [MessageFlags.Ephemeral] });
        }

        // CASHOUT
        if (interaction.customId === 'mine_cashout') {
            const winAmount = Math.floor(game.bet * game.multiplier);
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(winAmount, game.userId);

            const embed = new EmbedBuilder()
                .setTitle('💰 CASHOUT SUKSES!')
                .setDescription(`Kamu berhasil membawa pulang **Rp ${winAmount.toLocaleString('id-ID')}**!\nMultiplier Akhir: **${game.multiplier.toFixed(2)}x**`)
                .setColor('#00FF00');

            // Reveal all bombs
            const rows = this.revealAll(game, true);

            await interaction.update({ embeds: [embed], components: rows });
            activeMines.delete(interaction.message.id);
            return;
        }

        // CLICK CELL
        const idx = parseInt(interaction.customId.split('_')[2]);
        if (game.revealed[idx]) return interaction.deferUpdate(); // Already revealed

        game.revealed[idx] = true;

        if (game.grid[idx] === 1) {
            // BOMB! GAME OVER
            const embed = new EmbedBuilder()
                .setTitle('💥 DUAR! KENA BOM!')
                .setDescription(`Sayang sekali, uang **Rp ${game.bet.toLocaleString('id-ID')}** hangus terbakar. 💸`)
                .setColor('#FF0000');

            const rows = this.revealAll(game, false, idx);
            await interaction.update({ embeds: [embed], components: rows });
            activeMines.delete(interaction.message.id);
        } else {
            // SAFE!
            // Calculate new multiplier
            const totalSpots = GRID_SIZE;
            const revealedCount = game.revealed.filter(r => r).length; // Includes this one
            const safeRevealed = revealedCount; // All revealed so far are safe (since we didn't hit bomb)
            const safeTotal = GRID_SIZE - BOMB_COUNT;

            // Previous state
            const safeRemainingBefore = safeTotal - (safeRevealed - 1);
            const totalRemainingBefore = totalSpots - (safeRevealed - 1);

            // Update Multiplier
            game.multiplier = calculateNextMultiplier(game.multiplier, safeRemainingBefore, totalRemainingBefore);

            const embed = new EmbedBuilder()
                .setTitle('💣 TEBAK BOM (Minesweeper)')
                .setDescription(`Bet: **Rp ${game.bet.toLocaleString('id-ID')}**\nMultiplier: **${game.multiplier.toFixed(2)}x**\nWin: **Rp ${Math.floor(game.bet * game.multiplier).toLocaleString('id-ID')}**\n\n*Lanjut atau Cashout?*`)
                .setColor('#FFFF00');

            // Update Buttons
            const rows = this.updateButtons(game);

            await interaction.update({ embeds: [embed], components: rows });
        }
    },

    updateButtons(game) {
        const rows = [];
        for (let i = 0; i < 5; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 5; j++) {
                const idx = i * 5 + j;
                const btn = new ButtonBuilder()
                    .setCustomId(`mine_click_${idx}`)
                    .setStyle(ButtonStyle.Secondary);

                if (game.revealed[idx]) {
                    btn.setLabel('💎').setStyle(ButtonStyle.Success).setDisabled(true);
                } else {
                    btn.setLabel('❓');
                }
                row.addComponents(btn);
            }
            rows.push(row);
        }

        // Cashout Button
        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mine_cashout')
                .setLabel(`💰 CASHOUT (Rp ${Math.floor(game.bet * game.multiplier).toLocaleString('id-ID')})`)
                .setStyle(ButtonStyle.Primary)
        );

        return [...rows, controlRow];
    },

    revealAll(game, isWin, explodedIdx = -1) {
        const rows = [];
        for (let i = 0; i < 5; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 5; j++) {
                const idx = i * 5 + j;
                const btn = new ButtonBuilder()
                    .setCustomId(`mine_disabled_${idx}`)
                    .setDisabled(true);

                if (idx === explodedIdx) {
                    btn.setLabel('💥').setStyle(ButtonStyle.Danger);
                } else if (game.grid[idx] === 1) {
                    btn.setLabel('💣').setStyle(ButtonStyle.Secondary);
                } else if (game.revealed[idx]) {
                    btn.setLabel('💎').setStyle(ButtonStyle.Success);
                } else {
                    btn.setLabel('☁️').setStyle(ButtonStyle.Secondary);
                }
                row.addComponents(btn);
            }
            rows.push(row);
        }
        return rows;
    }
};
