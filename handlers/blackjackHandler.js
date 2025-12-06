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

        // Start Game
        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const playerScore = calculateHand(playerHand);
        // Dealer score hidden for now

        // Check Instant Blackjack
        if (playerScore === 21) {
            // Payout 3:2
            const winAmount = Math.floor(bet * 2.5); // Return bet + 1.5x
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(winAmount, userId);

            const embed = new EmbedBuilder()
                .setTitle('🃏 BLACKJACK!')
                .setDescription(`**Player:** ${formatHand(playerHand)} (${playerScore})\n**Dealer:** ${formatHand(dealerHand)} (${calculateHand(dealerHand)})\n\n🎉 **BLACKJACK!** Kamu menang **Rp ${winAmount.toLocaleString('id-ID')}**!`)
                .setColor('#FFD700');

            return message.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('🃏 BLACKJACK')
            .setDescription(`Bet: **Rp ${bet.toLocaleString('id-ID')}**\n\n**Dealer:** ${formatHand(dealerHand, true)} (?)\n**Player:** ${formatHand(playerHand)} (**${playerScore}**)`)
            .setColor('#00AAFF');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('bj_double').setLabel('Double Down').setStyle(ButtonStyle.Success).setDisabled(balance < bet * 2) // Check if user has enough for double
        );

        const msg = await message.reply({ embeds: [embed], components: [row] });

        activeBlackjack.set(msg.id, {
            userId,
            bet,
            playerHand,
            dealerHand,
            deck,
            isDouble: false,
            messageId: msg.id
        });
    },

    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('bj_')) return;

        const game = activeBlackjack.get(interaction.message.id);
        if (!game) return interaction.reply({ content: '❌ Game sudah berakhir.', flags: [MessageFlags.Ephemeral] });

        if (interaction.user.id !== game.userId) {
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

                await interaction.update({ embeds: [embed], components: [row] });
            }
        } else if (action === 'stand') {
            await this.dealerTurn(interaction, game);
        } else if (action === 'double') {
            // Check balance again
            const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(game.userId);
            if (!user || user.uang_jajan < game.bet) {
                return interaction.reply({ content: '💸 Uang gak cukup buat Double Down!', flags: [MessageFlags.Ephemeral] });
            }

            // Deduct extra bet
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(game.bet, game.userId);
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
        }
    },

    async dealerTurn(interaction, game) {
        let dealerScore = calculateHand(game.dealerHand);

        // Dealer hits on soft 17? Let's just say dealer hits until >= 17.
        while (dealerScore < 17) {
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
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(winAmount, game.userId);
        }

        const embed = new EmbedBuilder()
            .setTitle('🃏 BLACKJACK - HASIL')
            .setDescription(`**Dealer:** ${formatHand(game.dealerHand)} (**${dealerScore}**)\n**Player:** ${formatHand(game.playerHand)} (**${playerScore}**)\n\n${result}`)
            .setColor(color);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_disabled').setLabel('Game Over').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        await interaction.update({ embeds: [embed], components: [row] });
        activeBlackjack.delete(game.messageId);
    }
};
