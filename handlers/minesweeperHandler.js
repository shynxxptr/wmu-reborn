const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');
const missionHandler = require('./missionHandler.js');

// Active Minesweeper Games
// Key: messageId (The game embed message)
// Value: { userId, bet, grid: [0=safe, 1=bomb], revealed: [bool], multiplier, bombsCount, isCashout }
const activeMines = new Map();

// Configuration
const GRID_SIZE = 16; // 4x4 Grid to fit Cashout button in 5th row
const BOMB_COUNT = 4;

// Multiplier Calculation (Simple exponential or linear based on odds)
// Odds = Total / Safe_Remaining
const calculateNextMultiplier = (currentMult, safeRemaining, totalRemaining) => {
    // Standard Mines formula: Multiplier * (Total_Spots / Safe_Spots)
    // 20 spots, 5 bombs -> 15 safe.
    // 1st click: 20/15 = 1.33x
    // We apply a small house edge (e.g., 5%)
    // Edge case protection: prevent division by zero or invalid values
    if (safeRemaining <= 0 || totalRemaining <= 0 || safeRemaining > totalRemaining) {
        return currentMult; // Return current multiplier if invalid
    }
    const rawOdds = totalRemaining / safeRemaining;
    const houseEdge = 0.90; // 10% house edge - CHALLENGING BUT FUN (increased from 5%)
    return currentMult * rawOdds * houseEdge;
};

module.exports = {
    activeMines,

    async handleMines(message, command, args) {
        const userId = message.author.id;

        // Parse Bet
        const rawBet = args[1];
        if (!rawBet) return message.reply('❌ Format: `!bom <bet>` atau `!bom all`');

        const balance = db.getBalance(userId);

        let bet = 0;
        const lower = rawBet.toLowerCase();
        const maxBet = db.getUserMaxBet(userId);
        
        if (lower === 'all' || lower === 'allin') {
            bet = Math.min(balance, maxBet);
            if (bet > maxBet) bet = maxBet; // Safety Net
        }
        else if (lower.endsWith('k')) bet = parseFloat(lower) * 1000;
        else if (lower.endsWith('m') || lower.endsWith('jt')) bet = parseFloat(lower) * 1000000;
        else bet = parseInt(lower);

        if (isNaN(bet) || bet <= 0) return message.reply('❌ Jumlah taruhan tidak valid!');
        if (bet > maxBet) return message.reply(`❌ Maksimal taruhan adalah Rp ${maxBet.toLocaleString('id-ID')}!`);
        if (balance < bet) return message.reply('💸 **Uang gak cukup!**');

        // Deduct Bet
        const updateRes = db.updateBalance(userId, -bet);
        const walletType = updateRes.wallet === 'event' ? '🎟️ Event' : '💰 Utama';
        missionHandler.trackMission(userId, 'play_mines');

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
        for (let i = 0; i < 4; i++) { // 4 Rows
            const row = new ActionRowBuilder();
            for (let j = 0; j < 4; j++) { // 4 Cols
                const idx = i * 4 + j;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mine_click_${idx}`)
                        .setLabel('❓')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            rows.push(row);
        }

        // Add Cashout Button in 5th Row
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
            messageId: msg.id,
            walletType
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
            db.updateBalance(game.userId, winAmount);
            
            // Track Mission - Win Minesweeper
            missionHandler.trackMission(game.userId, 'win_mines');

            const embed = new EmbedBuilder()
                .setTitle('💰 CASHOUT SUKSES!')
                .setDescription(`Kamu berhasil membawa pulang **Rp ${winAmount.toLocaleString('id-ID')}**!\nMultiplier Akhir: **${game.multiplier.toFixed(2)}x**\n*${game.walletType}*`)
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
                .setDescription(`Sayang sekali, uang **Rp ${game.bet.toLocaleString('id-ID')}** hangus terbakar. 💸\n*${game.walletType}*`)
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

            // Update Multiplier with edge case protection
            if (safeRemainingBefore > 0 && totalRemainingBefore > 0 && safeRemainingBefore <= totalRemainingBefore) {
                game.multiplier = calculateNextMultiplier(game.multiplier, safeRemainingBefore, totalRemainingBefore);
            } else {
                // Edge case: all safe spots revealed or invalid state, cap multiplier
                game.multiplier = Math.min(game.multiplier * 1.1, game.bet * 1000); // Cap at reasonable max
            }

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
        for (let i = 0; i < 4; i++) { // 4 Rows
            const row = new ActionRowBuilder();
            for (let j = 0; j < 4; j++) { // 4 Cols
                const idx = i * 4 + j;
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

        // Cashout Button (truncate label if too long)
        const cashoutAmount = Math.floor(game.bet * game.multiplier);
        const cashoutLabel = cashoutAmount >= 1000000 
            ? `💰 CASHOUT (${(cashoutAmount / 1000000).toFixed(1)}M)`
            : cashoutAmount >= 1000
            ? `💰 CASHOUT (${(cashoutAmount / 1000).toFixed(0)}k)`
            : `💰 CASHOUT (${cashoutAmount})`;
        
        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mine_cashout')
                .setLabel(cashoutLabel.length > 80 ? `💰 CASHOUT` : cashoutLabel) // Discord limit 80 chars
                .setStyle(ButtonStyle.Primary)
        );

        return [...rows, controlRow];
    },

    revealAll(game, isWin, explodedIdx = -1) {
        const rows = [];
        for (let i = 0; i < 4; i++) { // 4 Rows
            const row = new ActionRowBuilder();
            for (let j = 0; j < 4; j++) { // 4 Cols
                const idx = i * 4 + j;
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

        // Add Cashout Button (Disabled)
        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mine_cashout_disabled')
                .setLabel(isWin ? '💰 CASHED OUT' : '💀 GAME OVER')
                .setStyle(isWin ? ButtonStyle.Success : ButtonStyle.Danger)
                .setDisabled(true)
        );

        rows.push(controlRow);

        return rows;
    }
};
