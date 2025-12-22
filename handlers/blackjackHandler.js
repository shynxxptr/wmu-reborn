const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');

// Active Blackjack Games
// Key: messageId
// Value: { userId, bet, playerHand: [], dealerHand: [], deck: [], isDouble: false, messageId }
const activeBlackjack = new Map();

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const createDeck = () => {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ suit, value });
        }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const calculateHand = (hand) => {
    let score = 0;
    let aces = 0;

    for (const card of hand) {
        if (['J', 'Q', 'K'].includes(card.value)) {
            score += 10;
        } else if (card.value === 'A') {
            aces += 1;
            score += 11;
        } else {
            score += parseInt(card.value);
        }
    }

    while (score > 21 && aces > 0) {
        score -= 10;
        aces -= 1;
    }

    return score;
};

const formatHand = (hand, hideSecond = false) => {
    if (hideSecond) {
        return `${hand[0].value}${hand[0].suit} | 🎴`;
    }
    return hand.map(c => `${c.value}${c.suit}`).join(' | ');
};

module.exports = {
    activeBlackjack,

    async handleBlackjack(message, command, args) {
        const userId = message.author.id;

        // Parse Bet
        const rawBet = args[1];
        if (!rawBet) return message.reply('❌ Format: `!bj <bet>` atau `!bj all`');

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
        
        // Track Mission
        const missionHandler = require('./missionHandler.js');
        missionHandler.trackMission(userId, 'play_blackjack');

        // Start Game
        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const playerScore = calculateHand(playerHand);
        // Dealer score hidden for now

        // Check Instant Blackjack - CHALLENGING BUT FUN
        if (playerScore === 21) {
            // Payout 6:5 (reduced from 3:2 for more challenge)
            const winAmount = Math.floor(bet * 2.2); // Return bet + 1.2x (reduced from 1.5x)
            db.updateBalance(userId, winAmount);
            
            // Track Mission - Win Blackjack
            missionHandler.trackMission(userId, 'win_blackjack');

            const embed = new EmbedBuilder()
                .setTitle('🃏 BLACKJACK!')
                .setDescription(`**Player:** ${formatHand(playerHand)} (${playerScore})\n**Dealer:** ${formatHand(dealerHand)} (${calculateHand(dealerHand)})\n\n🎉 **BLACKJACK!** Kamu menang **Rp ${winAmount.toLocaleString('id-ID')}**!\n*${walletType}*`)
                .setColor('#FFD700');

            return message.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('🃏 BLACKJACK')
            .setDescription(`Bet: **Rp ${bet.toLocaleString('id-ID')}**\n\n**Dealer:** ${formatHand(dealerHand, true)} (?)\n**Player:** ${formatHand(playerHand)} (**${playerScore}**)`)
            .setColor('#00AAFF');

        // Get balance after deduct (for double down check)
        const balanceAfterDeduct = db.getBalance(userId);
        const canDouble = balanceAfterDeduct >= bet; // Need at least bet amount (since bet already deducted)

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('bj_double').setLabel('Double Down').setStyle(ButtonStyle.Success).setDisabled(!canDouble) // Check if user has enough for double
        );

        const msg = await message.reply({ embeds: [embed], components: [row] });

        activeBlackjack.set(msg.id, {
            userId,
            bet,
            playerHand,
            dealerHand,
            deck,
            isDouble: false,
            messageId: msg.id,
            walletType,
            initialBalance: balance // Store initial balance for reference
        });
    },

    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('bj_')) return;

        try {
            const game = activeBlackjack.get(interaction.message.id);
            if (!game) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: '❌ Game sudah berakhir.' });
                }
                return interaction.reply({ content: '❌ Game sudah berakhir.', flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.user.id !== game.userId) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: '❌ Bukan kartu kamu!' });
                }
                return interaction.reply({ content: '❌ Bukan kartu kamu!', flags: [MessageFlags.Ephemeral] });
            }

        const action = interaction.customId.replace('bj_', '');

        if (action === 'hit') {
            game.playerHand.push(game.deck.pop());
            const score = calculateHand(game.playerHand);

            if (score > 21) {
                // BUST
                await this.endGame(interaction, game, 'bust');
            } else {
                // Continue
                const embed = new EmbedBuilder()
                    .setTitle('🃏 BLACKJACK')
                    .setDescription(`Bet: **Rp ${game.bet.toLocaleString('id-ID')}**\n\n**Dealer:** ${formatHand(game.dealerHand, true)} (?)\n**Player:** ${formatHand(game.playerHand)} (**${score}**)`)
                    .setColor('#00AAFF');

                // Disable Double Down after hit
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('bj_double').setLabel('Double Down').setStyle(ButtonStyle.Success).setDisabled(true)
                );

                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [embed], components: [row] });
                } else {
                    await interaction.update({ embeds: [embed], components: [row] });
                }
            }
        } else if (action === 'stand') {
            await this.dealerTurn(interaction, game);
        } else if (action === 'double') {
            // Check balance again (bet already deducted, need another bet amount)
            const currentBal = db.getBalance(game.userId);
            if (currentBal < game.bet) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: '💸 Uang gak cukup buat Double Down!' });
                }
                return interaction.reply({ content: '💸 Uang gak cukup buat Double Down!', flags: [MessageFlags.Ephemeral] });
            }

            // Deduct extra bet (double the original bet)
            db.updateBalance(game.userId, -game.bet);
            game.bet *= 2;
            game.isDouble = true;

            // Hit once then stand
            game.playerHand.push(game.deck.pop());
            const score = calculateHand(game.playerHand);

            if (score > 21) {
                await this.endGame(interaction, game, 'bust');
            } else {
                await this.dealerTurn(interaction, game);
            }
        } // Close if-else for action (hit/stand/double)
        } catch (error) {
            console.error('[BJ INTERACTION ERROR]', error);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: '❌ **Error:** Gagal memproses. Silakan coba lagi.' });
                } else {
                    await interaction.reply({ content: '❌ **Error:** Gagal memproses. Silakan coba lagi.', flags: [MessageFlags.Ephemeral] });
                }
            } catch (e) {
                console.error('[BJ ERROR HANDLING FAILED]', e);
            }
        }
    },

    async dealerTurn(interaction, game) {
        let dealerScore = calculateHand(game.dealerHand);

        // Dealer hits until >= 16 (more aggressive, CHALLENGING BUT FUN)
        // Changed from 17 to 16 for more challenge
        while (dealerScore < 16) {
            game.dealerHand.push(game.deck.pop());
            dealerScore = calculateHand(game.dealerHand);
        }

        await this.endGame(interaction, game, 'compare');
    },

    async endGame(interaction, game, reason) {
        const playerScore = calculateHand(game.playerHand);
        const dealerScore = calculateHand(game.dealerHand);
        let result = '';
        let winAmount = 0;
        let color = '#FF0000'; // Default Red (Lose)

        if (reason === 'bust') {
            result = `💥 **BUST!** Kamu melebihi 21. Uang **Rp ${game.bet.toLocaleString('id-ID')}** hangus.`;
        } else {
            // Compare
            if (dealerScore > 21) {
                result = `🎉 **DEALER BUST!** Kamu menang **Rp ${(game.bet * 2).toLocaleString('id-ID')}**!`;
                winAmount = game.bet * 2;
                color = '#00FF00';
            } else if (playerScore > dealerScore) {
                result = `🎉 **YOU WIN!** (${playerScore} vs ${dealerScore})\nKamu menang **Rp ${(game.bet * 2).toLocaleString('id-ID')}**!`;
                winAmount = game.bet * 2;
                color = '#00FF00';
            } else if (playerScore === dealerScore) {
                result = `🤝 **PUSH!** Seri. Uang kembali.`;
                winAmount = game.bet;
                color = '#FFFF00';
            } else {
                result = `💀 **YOU LOSE!** (${playerScore} vs ${dealerScore})\nUang **Rp ${game.bet.toLocaleString('id-ID')}** diambil bandar.`;
            }
        }

        if (winAmount > 0) {
            db.updateBalance(game.userId, winAmount);
            // Track Mission - Win Blackjack
            const missionHandler = require('./missionHandler.js');
            missionHandler.trackMission(game.userId, 'win_blackjack');
        }

        const embed = new EmbedBuilder()
            .setTitle('🃏 BLACKJACK - HASIL')
            .setDescription(`**Dealer:** ${formatHand(game.dealerHand)} (**${dealerScore}**)\n**Player:** ${formatHand(game.playerHand)} (**${playerScore}**)\n\n${result}\n*${game.walletType}*`)
            .setColor(color);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_disabled').setLabel('Game Over').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed], components: [row] });
            } else {
                await interaction.update({ embeds: [embed], components: [row] });
            }
        } catch (e) {
            console.error('[BJ UPDATE ERROR]', e);
        }
        activeBlackjack.delete(game.messageId);
    }
};
