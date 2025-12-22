const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const db = require("../database.js");

// Map untuk menyimpan state duel aktif
// Key: channelId (Asumsi 1 duel per channel biar ga chaos, atau bisa pake user pair key)
// Kita pakai key: `challengerId-targetId` biar bisa multiple duel di server tapi unik per pasangan.
const activeDuels = new Map();

module.exports = {
  activeDuels,

  async handlePalakRequest(message, targetUser, amount) {
    const challenger = message.author;
    const duelKey = `${challenger.id}-${targetUser.id}`;

    if (activeDuels.has(duelKey)) {
      return message.reply("❌ Kalian sedang dalam duel! Selesaikan dulu.");
    }

    // Simpan State Awal
    activeDuels.set(duelKey, {
      challenger: challenger.id,
      target: targetUser.id,
      amount: amount,
      round: 1,
      scores: { [challenger.id]: 0, [targetUser.id]: 0 },
      moves: {}, // { userId: 'rock' }
      messageId: null,
    });

    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("👊 TANTANGAN PALAK!")
      .setDescription(
        `${targetUser}, **${
          challenger.username
        }** mau malak kamu sebesar **Rp ${amount.toLocaleString(
          "id-ID"
        )}**!\n\n` +
          `"Kalo berani, ayo duel Batu Gunting Kertas (Best of 3)!"\n` +
          `Yang kalah harus bayar.`
      )
      .setFooter({ text: "Terima tantangan ini?" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`palak_accept_${challenger.id}`)
        .setLabel("TERIMA 👊")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`palak_decline_${challenger.id}`)
        .setLabel("TOLAK 🏃")
        .setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.channel.send({
      content: `${targetUser}`,
      embeds: [embed],
      components: [row],
    });

    // Update state dengan messageId untuk edit nanti
    const state = activeDuels.get(duelKey);
    state.messageId = msg.id;
    state.channelId = msg.channel.id;
  },

  async handleButton(interaction) {
    const { customId, user } = interaction;

    // 1. HANDLE ACCEPT / DECLINE
    if (customId.startsWith("palak_")) {
      const challengerId = customId.split("_")[2];
      const duelKey = `${challengerId}-${user.id}`;
      const state = activeDuels.get(duelKey);

      if (!state) {
        // Cek kebalikannya (mungkin user yang klik adalah challenger yang mau cancel? Tapi logic tombol di atas buat target)
        return interaction.reply({
          content: "❌ Duel tidak ditemukan atau sudah kadaluarsa.",
          flags: [MessageFlags.Ephemeral],
        });
      }

      if (customId.startsWith("palak_decline")) {
        activeDuels.delete(duelKey);
        return interaction.update({
          content: `🏃 **${user.username}** kabur (menolak tantangan).`,
          embeds: [],
          components: [],
        });
      }

      if (customId.startsWith("palak_accept")) {
        // Validasi balance sebelum mulai game
        const challengerBalance = db.getBalance(state.challenger);
        const targetBalance = db.getBalance(state.target);
        
        if (challengerBalance < state.amount) {
          activeDuels.delete(duelKey);
          return interaction.update({
            content: `❌ **Duel dibatalkan!** <@${state.challenger}> tidak punya cukup uang (Rp ${state.amount.toLocaleString('id-ID')}).`,
            embeds: [],
            components: [],
          });
        }
        
        if (targetBalance < state.amount) {
          activeDuels.delete(duelKey);
          return interaction.update({
            content: `❌ **Duel dibatalkan!** <@${state.target}> tidak punya cukup uang (Rp ${state.amount.toLocaleString('id-ID')}).`,
            embeds: [],
            components: [],
          });
        }
        
        // Mulai Game
        await this.startRound(interaction, state, duelKey);
      }
    }

    // 2. HANDLE RPS MOVE
    if (customId.startsWith("rps_")) {
      // Format: rps_move_challengerId_targetId
      const parts = customId.split("_");
      const move = parts[1]; // rock, paper, scissors
      const cId = parts[2];
      const tId = parts[3];
      const duelKey = `${cId}-${tId}`;
      const state = activeDuels.get(duelKey);

      if (!state)
        return interaction.reply({
          content: "❌ Duel tidak aktif.",
          flags: [MessageFlags.Ephemeral],
        });
      if (user.id !== cId && user.id !== tId)
        return interaction.reply({
          content: "❌ Bukan urusanmu!",
          flags: [MessageFlags.Ephemeral],
        });

      if (state.moves[user.id]) {
        return interaction.reply({
          content: "⚠️ Kamu sudah memilih!",
          flags: [MessageFlags.Ephemeral],
        });
      }

      // Simpan Move
      state.moves[user.id] = move;

      // Cek apakah kedua pemain sudah memilih
      if (state.moves[cId] && state.moves[tId]) {
        await this.resolveRound(interaction, state, duelKey);
      } else {
        await interaction.reply({
          content: `✅ Kamu memilih **${move.toUpperCase()}**. Menunggu lawan...`,
          flags: [MessageFlags.Ephemeral],
        });
      }
    }
  },

  async startRound(interaction, state, duelKey) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rps_rock_${state.challenger}_${state.target}`)
        .setEmoji("🪨")
        .setLabel("BATU")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rps_paper_${state.challenger}_${state.target}`)
        .setEmoji("📄")
        .setLabel("KERTAS")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rps_scissors_${state.challenger}_${state.target}`)
        .setEmoji("✂️")
        .setLabel("GUNTING")
        .setStyle(ButtonStyle.Primary)
    );

    const desc =
      `Skor Sementara:\n` +
      `<@${state.challenger}>: **${state.scores[state.challenger]}**\n` +
      `<@${state.target}>: **${state.scores[state.target]}**\n\n` +
      (state.lastRoundSummary ? `${state.lastRoundSummary}\n\n` : "") +
      `Silakan pilih senjatamu!`;

    const embed = new EmbedBuilder()
      .setColor("#FFFF00")
      .setTitle(`🥊 RONDE ${state.round} / 3`)
      .setDescription(desc);

    try {
      if (interaction.message) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: `🔥 **DUEL DIMULAI!**`,
            embeds: [embed],
            components: [row],
          });
        } else {
          await interaction.update({
            content: `🔥 **DUEL DIMULAI!**`,
            embeds: [embed],
            components: [row],
          });
        }
      } else {
        const channel = interaction.client.channels.cache.get(state.channelId);
        if (channel) {
          try {
            const msg = await channel.messages.fetch(state.messageId);
            await msg.edit({ embeds: [embed], components: [row] });
          } catch (e) {
            // Message not found or error, ignore
          }
        }
      }
    } catch (error) {
      console.error('[GameHandler] Error in startRound:', error);
    }
  },

  async resolveRound(interaction, state, duelKey) {
    const cId = state.challenger;
    const tId = state.target;
    const mC = state.moves[cId];
    const mT = state.moves[tId];

    let winnerId = null;
    let resultText = "";

    // Logic RPS
    if (mC === mT) {
      resultText = "🤝 **SERI!** (Draw)";
    } else if (
      (mC === "rock" && mT === "scissors") ||
      (mC === "paper" && mT === "rock") ||
      (mC === "scissors" && mT === "paper")
    ) {
      winnerId = cId;
      state.scores[cId]++;
      resultText = `🎉 <@${cId}> Menang Ronde ini!`;
    } else {
      winnerId = tId;
      state.scores[tId]++;
      resultText = `🎉 <@${tId}> Menang Ronde ini!`;
    }

    const moveEmojis = { rock: "🪨", paper: "📄", scissors: "✂️" };

    const summary =
      `Hasil Ronde ${state.round}:\n` +
      `<@${cId}>: ${moveEmojis[mC]} vs <@${tId}>: ${moveEmojis[mT]}\n` +
      `${resultText}`;
    state.lastRoundSummary = summary;

    // Reset Moves
    state.moves = {};

    // Cek Win Condition (Best of 3)
    const channel =
      interaction.channel ||
      interaction.client.channels.cache.get(state.channelId);
    // Game ends if: someone wins 2 rounds OR all 3 rounds completed
    // state.round starts at 1, increments after each round
    // After round 3 completes, round becomes 4, so check > 3
    if (state.scores[cId] >= 2 || state.scores[tId] >= 2 || state.round > 3) {
      await this.endGame(channel, state, duelKey);
    } else {
      state.round++;
      await this.startRound(
        { client: interaction.client, message: null },
        state,
        duelKey
      );
    }
  },

  async endGame(channel, state, duelKey) {
    const cId = state.challenger;
    const tId = state.target;
    const scoreC = state.scores[cId];
    const scoreT = state.scores[tId];
    const amount = state.amount;

    // Validasi balance sebelum transfer
    const challengerBalance = db.getBalance(cId);
    const targetBalance = db.getBalance(tId);

    let finalEmbed = new EmbedBuilder().setTitle("🏆 DUEL SELESAI");

    if (scoreC > scoreT) {
      // Challenger Wins
      if (targetBalance < amount) {
        // Target tidak punya cukup uang, kembalikan uang challenger
        db.prepare(
          "UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?"
        ).run(amount, cId);
        finalEmbed
          .setDescription(
            `🎉 **<@${cId}> MENANG!**\nSkor: ${scoreC} - ${scoreT}\n\n⚠️ **<@${tId}> tidak punya cukup uang!** Uang dikembalikan ke <@${cId}>.`
          )
          .setColor("#FFFF00");
      } else {
        db.prepare(
          "UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?"
        ).run(amount, cId);
        db.prepare(
          "UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?"
        ).run(amount, tId);
        finalEmbed
          .setDescription(
            `🎉 **<@${cId}> MENANG!**\nSkor: ${scoreC} - ${scoreT}\n\n💰 **Rp ${amount.toLocaleString(
              "id-ID"
            )}** berhasil dipalak dari <@${tId}>!`
          )
          .setColor("#00FF00");
      }
    } else if (scoreT > scoreC) {
      // Target Wins (Counter-Palak)
      if (challengerBalance < amount) {
        // Challenger tidak punya cukup uang, kembalikan uang target
        db.prepare(
          "UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?"
        ).run(amount, tId);
        finalEmbed
          .setDescription(
            `🛡️ **<@${tId}> MENANG!** (Gagal Dipalak)\nSkor: ${scoreT} - ${scoreC}\n\n⚠️ **<@${cId}> tidak punya cukup uang!** Uang dikembalikan ke <@${tId}>.`
          )
          .setColor("#FFFF00");
      } else {
        db.prepare(
          "UPDATE user_economy SET uang_jajan = uang_jajan + ? WHERE user_id = ?"
        ).run(amount, tId);
        db.prepare(
          "UPDATE user_economy SET uang_jajan = uang_jajan - ? WHERE user_id = ?"
        ).run(amount, cId);
        finalEmbed
          .setDescription(
            `🛡️ **<@${tId}> MENANG!** (Gagal Dipalak)\nSkor: ${scoreT} - ${scoreC}\n\n💰 Malah **<@${cId}>** yang rugi **Rp ${amount.toLocaleString(
              "id-ID"
            )}**!`
          )
          .setColor("#0000FF");
      }
    } else {
      // Draw - Tidak ada uang yang berpindah (karena tidak ada deduct di awal)
      finalEmbed
        .setDescription(
          `🤝 **SERI!**\nSkor: ${scoreC} - ${scoreT}\n\nTidak ada uang yang berpindah tangan.`
        )
        .setColor("#808080");
    }

    try {
      const msg = await channel.messages.fetch(state.messageId);
      await msg.edit({ embeds: [finalEmbed], components: [] });
    } catch (e) {
      await channel.send({ embeds: [finalEmbed] });
    }
    activeDuels.delete(duelKey);
  },
};
