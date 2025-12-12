const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database.js');

// Game State
// Key: channelId
// Value: {
//   hostId: string,
//   prize: number,
//   players: [userId],
//   deck: [card],
//   discardPile: [card],
//   hands: { userId: [card] },
//   turnIndex: number,
//   direction: 1 (or -1),
//   status: 'lobby' | 'playing',
//   messageId: string (Main Game Embed)
// }
const activeGames = new Map();

// Card Colors & Types
const COLORS = ['🔴', '🔵', '🟢', '🟡']; // Red, Blue, Green, Yellow
const SPECIALS = ['🚫', '⇄', '+2']; // Skip, Reverse, Draw 2
const WILDS = ['🌈', '🔥']; // Wild, Wild Draw 4

// Helper: Generate Deck
const generateDeck = () => {
    const deck = [];
    // Number Cards (0-9)
    for (const color of COLORS) {
        deck.push({ color, type: '0', value: 0, id: Math.random().toString(36).substr(2, 9) });
        for (let i = 1; i <= 9; i++) {
            // Two of each 1-9
            deck.push({ color, type: i.toString(), value: i, id: Math.random().toString(36).substr(2, 9) });
            deck.push({ color, type: i.toString(), value: i, id: Math.random().toString(36).substr(2, 9) });
        }
        // Special Cards (Two of each)
        for (const special of SPECIALS) {
            deck.push({ color, type: special, value: 20, id: Math.random().toString(36).substr(2, 9) });
            deck.push({ color, type: special, value: 20, id: Math.random().toString(36).substr(2, 9) });
        }
    }
    // Wild Cards (Four of each)
    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', type: '🌈', value: 50, id: Math.random().toString(36).substr(2, 9) });
        deck.push({ color: 'wild', type: '🔥', value: 50, id: Math.random().toString(36).substr(2, 9) });
    }
    return shuffle(deck);
};

// Helper: Shuffle
const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

module.exports = {
    activeGames,

    async handleUno(message, command, args) {
        const action = args[1]?.toLowerCase();
        const channelId = message.channel.id;
        const userId = message.author.id;

        if (action === 'create') {
            if (activeGames.has(channelId)) return message.reply('❌ Sudah ada game UNO di channel ini!');

            // Parse Prize
            const rawPrize = args[2];
            if (!rawPrize) return message.reply('❌ Format: `!uno create <prize>`');

            let prize = 0;
            const lower = rawPrize.toLowerCase();
            if (lower.endsWith('k')) prize = parseFloat(lower) * 1000;
            else if (lower.endsWith('m') || lower.endsWith('jt')) prize = parseFloat(lower) * 1000000;
            else prize = parseInt(lower);

            if (isNaN(prize) || prize <= 0) return message.reply('❌ Prize tidak valid!');

            // Check Balance
            const user = db.prepare('SELECT uang_jajan FROM user_economy WHERE user_id = ?').get(userId);
            if (!user || user.uang_jajan < prize) return message.reply('💸 **Uang gak cukup** buat bikin prize pool!');

            // Deduct Prize
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?').run(prize, userId);

            // Create Lobby
            activeGames.set(channelId, {
                hostId: userId,
                prize: prize,
                players: [userId],
                deck: [],
                discardPile: [],
                hands: {},
                turnIndex: 0,
                direction: 1,
                status: 'lobby',
                messageId: null
            });

            const embed = new EmbedBuilder()
                .setTitle('🃏 UNO LOBBY')
                .setDescription(`Host: <@${userId}>\nPrize Pool: **Rp ${prize.toLocaleString('id-ID')}**\n\nPlayers (1/4):\n1. <@${userId}>\n\nKetik \`!uno join\` untuk bergabung!`)
                .setColor('#FF0000');

            const msg = await message.channel.send({ embeds: [embed] });
            activeGames.get(channelId).messageId = msg.id;
            return;
        }

        if (action === 'join') {
            const game = activeGames.get(channelId);
            if (!game) return message.reply('❌ Gak ada game UNO di sini. Bikin dulu `!uno create <prize>`');
            if (game.status !== 'lobby') return message.reply('❌ Game sudah mulai!');
            if (game.players.includes(userId)) return message.reply('❌ Kamu udah join!');
            if (game.players.length >= 4) return message.reply('❌ Lobby penuh (Max 4)!');

            game.players.push(userId);

            // Update Lobby Embed
            const playerList = game.players.map((id, i) => `${i + 1}. <@${id}>`).join('\n');
            const embed = new EmbedBuilder()
                .setTitle('🃏 UNO LOBBY')
                .setDescription(`Host: <@${game.hostId}>\nPrize Pool: **Rp ${game.prize.toLocaleString('id-ID')}**\n\nPlayers (${game.players.length}/4):\n${playerList}\n\nHost ketik \`!uno start\` untuk mulai!`)
                .setColor('#FF0000');

            const msg = await message.channel.messages.fetch(game.messageId);
            if (msg) await msg.edit({ embeds: [embed] });

            return message.reply(`✅ <@${userId}> bergabung!`);
        }

        if (action === 'start') {
            const game = activeGames.get(channelId);
            if (!game) return message.reply('❌ Gak ada game UNO.');
            if (game.hostId !== userId) return message.reply('❌ Cuma host yang bisa mulai.');
            if (game.players.length < 2) return message.reply('❌ Minimal 2 pemain!');

            // Initialize Game
            game.status = 'playing';
            game.deck = generateDeck();
            game.direction = 1;
            game.turnIndex = 0;

            // Deal Cards (7 each)
            for (const pid of game.players) {
                game.hands[pid] = game.deck.splice(0, 7);
            }

            // First Card (Cannot be Wild Draw 4)
            let firstCard = game.deck.pop();
            while (firstCard.type === '🔥') {
                game.deck.unshift(firstCard);
                game.deck = shuffle(game.deck);
                firstCard = game.deck.pop();
            }
            game.discardPile.push(firstCard);

            // Handle First Card Effect (if special)
            if (firstCard.type === '🚫') game.turnIndex = 1; // Skip first player
            if (firstCard.type === '⇄') { // Reverse
                game.direction = -1;
                game.turnIndex = game.players.length - 1; // Last player goes first
            }
            if (firstCard.type === '+2') {
                // First player draws 2 and turn passes? Standard rules say yes, but let's keep it simple: just visual for now or apply effect.
                // Let's apply effect: P1 draws 2 and skips turn.
                const p1 = game.players[game.turnIndex];
                game.hands[p1].push(game.deck.pop(), game.deck.pop());
                game.turnIndex = (game.turnIndex + game.direction + game.players.length) % game.players.length;
            }

            await this.updateGameState(message.channel, game);
            return;
        }

        if (action === 'stop') {
            const game = activeGames.get(channelId);
            if (!game) return message.reply('❌ Gak ada game.');
            if (game.hostId !== userId && !message.member.permissions.has('ADMINISTRATOR')) return message.reply('❌ Cuma host/admin yang bisa stop.');

            // Refund Prize
            db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(game.prize, game.hostId);

            activeGames.delete(channelId);
            return message.reply(`🛑 **Game Dihentikan!** Prize pool dikembalikan ke host.`);
        }
    },

    async handleInteraction(interaction) {
        if (!interaction.customId.startsWith('uno_')) return;

        const channelId = interaction.channelId;
        const game = activeGames.get(channelId);

        if (!game) return interaction.reply({ content: '❌ Game sudah berakhir.', flags: [MessageFlags.Ephemeral] });

        const userId = interaction.user.id;
        const currentPlayer = game.players[game.turnIndex];

        // 1. VIEW HAND
        if (interaction.customId === 'uno_hand') {
            const hand = game.hands[userId];
            if (!hand) return interaction.reply({ content: '❌ Kamu bukan pemain.', flags: [MessageFlags.Ephemeral] });

            const options = hand.map(card => ({
                label: `${card.color === 'wild' ? '' : card.color} ${card.type}`,
                description: card.color === 'wild' ? 'Wild Card' : `${card.color} Card`,
                value: card.id,
                emoji: card.color === 'wild' ? '🌈' : card.color
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('uno_play_card')
                    .setPlaceholder('Pilih kartu untuk dibuang...')
                    .addOptions(options)
            );

            return interaction.reply({
                content: `🃏 **Kartumu (${hand.length}):**`,
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });
        }

        // 2. DRAW CARD
        if (interaction.customId === 'uno_draw') {
            if (userId !== currentPlayer) return interaction.reply({ content: '❌ Bukan giliranmu!', flags: [MessageFlags.Ephemeral] });

            // Thread-safe deck access: check and reshuffle if needed
            let card = game.deck.pop();
            if (!card) {
                // Reshuffle discard (except top) - prevent race condition
                if (game.discardPile.length > 1) {
                    const top = game.discardPile.pop();
                    game.deck = shuffle([...game.discardPile]); // Copy array to prevent mutation issues
                    game.discardPile = [top];
                    card = game.deck.pop();
                } else {
                    // Edge case: no cards to reshuffle, game might be stuck
                    return interaction.reply({ content: '❌ Deck habis! Game mungkin error.', flags: [MessageFlags.Ephemeral] });
                }
            }
            
            if (card) {
                game.hands[userId].push(card);
            }

            await interaction.reply({ content: `📥 Kamu mengambil 1 kartu.`, flags: [MessageFlags.Ephemeral] });

            // Pass turn
            this.nextTurn(game);
            await this.updateGameState(interaction.channel, game);
            return;
        }

        // 3. PLAY CARD
        if (interaction.customId === 'uno_play_card') {
            if (userId !== currentPlayer) return interaction.reply({ content: '❌ Bukan giliranmu!', flags: [MessageFlags.Ephemeral] });

            const cardId = interaction.values[0];
            const hand = game.hands[userId];
            const cardIndex = hand.findIndex(c => c.id === cardId);
            const card = hand[cardIndex];
            const topCard = game.discardPile[game.discardPile.length - 1];

            // Validate Move
            let isValid = false;
            const topCardColor = topCard.color === 'wild' ? topCard.declaredColor || COLORS[0] : topCard.color; // Get declared color if wild
            
            if (card.color === 'wild') {
                // Wild cards can always be played
                isValid = true;
            } else if (card.color === topCardColor || card.type === topCard.type) {
                // Match color (including declared wild color) or type
                isValid = true;
            }

            if (!isValid) {
                const colorDisplay = topCard.color === 'wild' ? (topCard.declaredColor || 'Wild') : topCard.color;
                return interaction.reply({ content: `❌ Kartu tidak valid! Harus sama warna (${colorDisplay}) atau simbol (${topCard.type}).`, flags: [MessageFlags.Ephemeral] });
            }

            // Remove card from hand
            hand.splice(cardIndex, 1);
            game.discardPile.push(card);

            // Check Win
            if (hand.length === 0) {
                // WINNER!
                db.prepare('UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?').run(game.prize, userId);

                const embed = new EmbedBuilder()
                    .setTitle('🎉 UNO WINNER! 🎉')
                    .setDescription(`Selamat <@${userId}>!\nKamu memenangkan Prize Pool sebesar **Rp ${game.prize.toLocaleString('id-ID')}**! 💸`)
                    .setColor('#FFD700');

                await interaction.channel.send({ embeds: [embed] });
                activeGames.delete(channelId);
                return; // End Game
            }

            // Handle Special Effects
            let skipTurn = false;
            if (card.type === '🚫') skipTurn = true;
            if (card.type === '⇄') game.direction *= -1;
            if (card.type === '+2') {
                const nextP = game.players[(game.turnIndex + game.direction + game.players.length) % game.players.length];
                // Draw 2 for next player
                for (let i = 0; i < 2; i++) {
                    const c = game.deck.pop();
                    if (c) game.hands[nextP].push(c);
                }
                skipTurn = true; // Next player loses turn
            }
            if (card.type === '🔥') { // Wild Draw 4
                const nextP = game.players[(game.turnIndex + game.direction + game.players.length) % game.players.length];
                for (let i = 0; i < 4; i++) {
                    const c = game.deck.pop();
                    if (c) game.hands[nextP].push(c);
                }
                skipTurn = true;
            }

            // If Wild, set declared color for next player
            if (card.color === 'wild') {
                // Randomly pick a color for next player to match (improved: store as declaredColor)
                const declaredColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                card.declaredColor = declaredColor; // Store declared color
                await interaction.reply({ content: `🌈 Wild Card! Warna berubah menjadi **${declaredColor}**`, flags: [MessageFlags.Ephemeral] });
            } else {
                await interaction.deferUpdate();
            }

            // Next Turn
            this.nextTurn(game, skipTurn);
            await this.updateGameState(interaction.channel, game);
        }
    },

    nextTurn(game, skip = false) {
        let steps = 1;
        if (skip) steps = 2;
        game.turnIndex = (game.turnIndex + (game.direction * steps)) % game.players.length;
        if (game.turnIndex < 0) game.turnIndex += game.players.length;
    },

    async updateGameState(channel, game) {
        const topCard = game.discardPile[game.discardPile.length - 1];
        const currentPlayer = game.players[game.turnIndex];

        // Build Player List with Hand Counts
        const playerStatus = game.players.map((pid, i) => {
            const isTurn = pid === currentPlayer;
            const handSize = game.hands[pid].length;
            const indicator = isTurn ? '▶️' : '  ';
            const unoAlert = handSize === 1 ? '🔥 **UNO!**' : '';
            return `${indicator} <@${pid}>: ${handSize} 🎴 ${unoAlert}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`🃏 UNO GAME (Prize: Rp ${game.prize.toLocaleString('id-ID')})`)
            .setDescription(
                `**Top Card:**\n# ${topCard.color === 'wild' ? '🌈' : topCard.color} **[ ${topCard.type} ]**\n\n` +
                `**Giliran:** <@${currentPlayer}>\n\n` +
                `**Players:**\n${playerStatus}`
            )
            .setColor(topCard.color === 'wild' ? '#FFFFFF' : (topCard.color === '🔴' ? '#FF0000' : (topCard.color === '🔵' ? '#0000FF' : (topCard.color === '🟢' ? '#00FF00' : '#FFFF00'))));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('uno_hand')
                .setLabel('Lihat Kartu / Main')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('uno_draw')
                .setLabel('Ambil Kartu (Draw)')
                .setStyle(ButtonStyle.Secondary)
        );

        // Try to edit existing message to reduce spam, or send new if too old
        try {
            if (game.messageId) {
                const msg = await channel.messages.fetch(game.messageId);
                await msg.edit({ embeds: [embed], components: [row] });
            } else {
                const msg = await channel.send({ embeds: [embed], components: [row] });
                game.messageId = msg.id;
            }
        } catch (e) {
            const msg = await channel.send({ embeds: [embed], components: [row] });
            game.messageId = msg.id;
        }
    }
};
