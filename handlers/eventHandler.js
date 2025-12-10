const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

module.exports = {
    async handleEvent(message, command, args) {
        const subCommand = args[1]; // !event <subcommand>

        // 1. CREATE EVENT (Admin Only)
        if (subCommand === 'create') {
            if (!message.member.permissions.has('Administrator')) return message.reply('❌ Admin Only!');

            // Format: !event create <name> <fee> <modal> <duration_hours>
            // Example: !event create "Turnamen Slot" 0 10000000 24

            // Parsing arguments is tricky with quotes. Let's use regex or simple split if no spaces in name.
            // For simplicity: Name must be single word or quoted? Let's assume simple for now or use " "

            const regex = /"([^"]+)"|(\S+)/g;
            const matches = [];
            let match;
            while ((match = regex.exec(message.content)) !== null) {
                matches.push(match[1] || match[2]);
            }
            // matches[0] = !event, matches[1] = create, matches[2] = name, matches[3] = fee, matches[4] = modal, matches[5] = duration

            const name = matches[2];
            const fee = parseInt(matches[3]);
            const modal = parseInt(matches[4]);
            const duration = parseInt(matches[5]);

            if (!name || isNaN(fee) || isNaN(modal) || isNaN(duration)) {
                return message.reply('❌ Format: `!event create "Nama Event" <fee> <modal> <durasi_jam>`\nContoh: `!event create "Turnamen Slot" 0 10000000 24`');
            }

            const result = db.createEvent(name, fee, modal, duration, message.author.id);
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🎉 EVENT BARU DIMULAI!')
                    .setDescription(`**${name}** telah dibuka!`)
                    .addFields(
                        { name: '💰 Modal Awal', value: `Rp ${formatMoney(modal)}`, inline: true },
                        { name: '🎟️ Biaya Masuk', value: fee === 0 ? 'GRATIS' : `Rp ${formatMoney(fee)}`, inline: true },
                        { name: '⏳ Durasi', value: `${duration} Jam`, inline: true }
                    )
                    .setColor('#00FF00')
                    .setFooter({ text: 'Ketik "!event join" untuk ikutan!' });

                return message.channel.send({ embeds: [embed] });
            } else {
                return message.reply(`❌ Gagal membuat event: ${result.error}`);
            }
        }

        // 2. JOIN EVENT
        if (subCommand === 'join') {
            const activeEvent = db.getActiveEvent();
            if (!activeEvent) return message.reply('❌ Tidak ada event aktif saat ini.');

            const result = db.joinEvent(message.author.id, activeEvent.id);
            if (result.success) {
                return message.reply(`✅ **Berhasil Join!**\nKamu masuk ke event **${result.eventName}**.\nSaldo Event: **Rp ${formatMoney(result.initialBalance)}**.\n\n*Semua game sekarang menggunakan Saldo Event.*`);
            } else {
                return message.reply(`❌ Gagal join: ${result.error}`);
            }
        }

        // 3. STOP EVENT (Admin Only)
        if (subCommand === 'stop') {
            if (!message.member.permissions.has('Administrator')) return message.reply('❌ Admin Only!');

            const activeEvent = db.getActiveEvent();
            if (!activeEvent) return message.reply('❌ Tidak ada event aktif.');

            const result = db.stopEvent(activeEvent.id);
            if (result.success) {
                return message.reply(`🛑 **EVENT DIHENTIKAN!**\nEvent **${activeEvent.name}** selesai.\n${result.processed} peserta mendapatkan 10% sisa saldo event ke dompet utama.`);
            } else {
                return message.reply(`❌ Gagal stop event: ${result.error}`);
            }
        }

        // 4. INFO EVENT
        if (subCommand === 'info') {
            const activeEvent = db.getActiveEvent();
            if (!activeEvent) return message.reply('ℹ️ Tidak ada event aktif saat ini.');

            const participant = db.getUserActiveEvent(message.author.id);
            const status = participant ? `✅ Terdaftar (Saldo: Rp ${formatMoney(participant.event_balance)})` : '❌ Belum Join';

            const embed = new EmbedBuilder()
                .setTitle(`📅 INFO EVENT: ${activeEvent.name}`)
                .addFields(
                    { name: 'Status Kamu', value: status },
                    { name: 'Selesai Dalam', value: `<t:${Math.floor(activeEvent.end_time / 1000)}:R>` },
                    { name: 'Biaya Masuk', value: `Rp ${formatMoney(activeEvent.entry_fee)}`, inline: true },
                    { name: 'Modal Awal', value: `Rp ${formatMoney(activeEvent.initial_balance)}`, inline: true }
                )
                .setColor('#00AAFF');

            return message.reply({ embeds: [embed] });
        }

        // 5. KICK USER (Admin Only)
        if (subCommand === 'kick') {
            if (!message.member.permissions.has('Administrator')) return message.reply('❌ Admin Only!');

            const target = message.mentions.users.first();
            if (!target) return message.reply('❌ Tag user yang mau di-kick.');

            const activeEvent = db.getActiveEvent();
            if (!activeEvent) return message.reply('❌ Tidak ada event aktif.');

            if (db.kickFromEvent(target.id, activeEvent.id)) {
                return message.reply(`✅ **${target.username}** telah ditendang dari event.`);
            } else {
                return message.reply('❌ Gagal kick user (Mungkin belum join).');
            }
        }

        // HELP
        return message.reply('ℹ️ **Event Commands:**\n`!event create "Nama" <fee> <modal> <jam>`\n`!event join`\n`!event info`\n`!event stop`\n`!event kick @user`');
    }
};
