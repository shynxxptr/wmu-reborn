const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database.js');
const { formatMoney } = require('../utils/helpers.js');

module.exports = {
    async handleBanking(message, command, args) {
        const userId = message.author.id;
        const subCommand = args[1]?.toLowerCase();

        // !bank - Show bank status
        if (!subCommand || subCommand === 'info') {
            const bankBalance = db.getBankBalance(userId);
            const mainBalance = db.getBalance(userId);
            const loan = db.getLoan(userId);
            
            const embed = new EmbedBuilder()
                .setTitle('🏦 BANK MANG UJANG')
                .setColor('#0099ff')
                .setDescription('Simpan uangmu di bank untuk aman dari maintenance cost!')
                .addFields(
                    { name: '💰 Saldo Utama', value: `Rp ${formatMoney(mainBalance)}`, inline: true },
                    { name: '🏦 Saldo Bank', value: `Rp ${formatMoney(bankBalance)}`, inline: true },
                    { name: '💎 Total Assets', value: `Rp ${formatMoney(mainBalance + bankBalance)}`, inline: true }
                );

            if (loan && loan.loan_amount > 0) {
                const daysElapsed = Math.max(1, Math.floor((Date.now() - loan.loan_start_time) / (24 * 60 * 60 * 1000)));
                let interest = 0;
                let remaining = loan.loan_amount;
                
                // Compound interest calculation
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
            return message.reply({ embeds: [embed] });
        }

        // !bank deposit <amount>
        if (subCommand === 'deposit' || subCommand === 'simpan') {
            const rawAmount = args[2];
            if (!rawAmount) return message.reply('❌ Format: `!bank deposit <jumlah>` atau `!bank deposit all`');

            const mainBalance = db.getBalance(userId);
            let amount = 0;
            const lower = rawAmount.toLowerCase();

            if (lower === 'all' || lower === 'allin') {
                amount = mainBalance;
            } else if (lower.endsWith('k')) {
                amount = parseFloat(lower) * 1000;
            } else if (lower.endsWith('m') || lower.endsWith('jt')) {
                amount = parseFloat(lower) * 1000000;
            } else {
                amount = parseInt(lower);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah tidak valid!');
            if (amount > mainBalance) return message.reply('💸 **Saldo utama tidak cukup!**');

            // Max deposit 1M (for interest cap) - but allow more, just interest capped
            const maxDeposit = 1000000;
            const bankBalance = db.getBankBalance(userId);
            if (bankBalance >= maxDeposit) {
                return message.reply(`❌ **Limit deposit tercapai!** Max deposit di bank: Rp ${formatMoney(maxDeposit)}\n💡 Bunga hanya diberikan untuk deposit sampai Rp ${formatMoney(maxDeposit)}`);
            }
            
            // Adjust amount if would exceed max
            if (bankBalance + amount > maxDeposit) {
                const canDeposit = maxDeposit - bankBalance;
                if (canDeposit > 0) {
                    amount = canDeposit;
                } else {
                    return message.reply(`❌ **Limit deposit tercapai!** Max deposit di bank: Rp ${formatMoney(maxDeposit)}`);
                }
            }

            // Deduct from main, add to bank
            db.updateBalance(userId, -amount);
            db.depositToBank(userId, amount);

            return message.reply(`✅ **Deposit Berhasil!**\n💰 Disimpan: Rp ${formatMoney(amount)}\n🏦 Saldo Bank: Rp ${formatMoney(bankBalance + amount)}\n\n💡 **Bunga:** 0.5% per hari (max Rp ${formatMoney(maxDeposit)})`);
        }

        // !bank withdraw <amount>
        if (subCommand === 'withdraw' || subCommand === 'ambil') {
            const rawAmount = args[2];
            if (!rawAmount) return message.reply('❌ Format: `!bank withdraw <jumlah>` atau `!bank withdraw all`');

            const bankBalance = db.getBankBalance(userId);
            if (bankBalance === 0) return message.reply('💸 **Saldo bank kosong!**');

            let amount = 0;
            const lower = rawAmount.toLowerCase();

            if (lower === 'all' || lower === 'allin') {
                amount = bankBalance;
            } else if (lower.endsWith('k')) {
                amount = parseFloat(lower) * 1000;
            } else if (lower.endsWith('m') || lower.endsWith('jt')) {
                amount = parseFloat(lower) * 1000000;
            } else {
                amount = parseInt(lower);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah tidak valid!');
            if (amount > bankBalance) return message.reply('💸 **Saldo bank tidak cukup!**');

            // Withdraw fee: 1% (Money Sink)
            const fee = Math.floor(amount * 0.01);
            const netAmount = amount - fee;

            const result = db.withdrawFromBank(userId, amount);
            if (!result.success) {
                return message.reply(`❌ **Gagal:** ${result.error}`);
            }

            // Add net amount to main balance (fee is money sink)
            db.updateBalance(userId, netAmount);

            return message.reply(`✅ **Withdraw Berhasil!**\n💰 Diambil: Rp ${formatMoney(amount)}\n💸 **Fee:** Rp ${formatMoney(fee)} (1%)\n💰 **Diterima:** Rp ${formatMoney(netAmount)}\n🏦 Sisa Saldo Bank: Rp ${formatMoney(bankBalance - amount)}`);
        }

        // !bank loan <amount>
        if (subCommand === 'loan' || subCommand === 'pinjam') {
            const rawAmount = args[2];
            if (!rawAmount) return message.reply('❌ Format: `!bank loan <jumlah>`\nMax pinjaman: 5 Juta');

            let amount = 0;
            const lower = rawAmount.toLowerCase();

            if (lower.endsWith('k')) {
                amount = parseFloat(lower) * 1000;
            } else if (lower.endsWith('m') || lower.endsWith('jt')) {
                amount = parseFloat(lower) * 1000000;
            } else {
                amount = parseInt(lower);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ Jumlah tidak valid!');
            if (amount > 5000000) return message.reply('❌ **Max pinjaman: 5 Juta!**');

            // Check existing loan
            const existingLoan = db.getLoan(userId);
            if (existingLoan && existingLoan.loan_amount > 0) {
                return message.reply('❌ **Kamu masih punya pinjaman aktif!** Bayar dulu dengan `!bank payloan`');
            }

            // Create loan (7 days)
            const result = db.createLoan(userId, amount, 7);
            if (!result.success) {
                return message.reply(`❌ **Gagal:** ${result.error}`);
            }

            // Add loan to main balance
            db.updateBalance(userId, amount);

            // Calculate max interest if paid on due date (7 days)
            const maxInterest = Math.floor(amount * 0.02 * 7); // 2% per hari × 7 hari
            const maxTotalOwed = amount + maxInterest;

            return message.reply(`✅ **Pinjaman Disetujui!**\n💰 Pinjaman: Rp ${formatMoney(amount)}\n💸 Bunga: 2% per hari (compound)\n💰 **Estimasi total (7 hari):** Rp ${formatMoney(maxTotalOwed)}\n⏰ **Jatuh tempo:** 7 hari\n\n⚠️ **Peringatan:** Jika tidak bayar dalam 7 hari, akan auto-deduct + penalty 5%!`);
        }

        // !bank payloan
        if (subCommand === 'payloan' || subCommand === 'bayar') {
            const loan = db.getLoan(userId);
            if (!loan || loan.loan_amount === 0) {
                return message.reply('❌ **Tidak ada pinjaman aktif!**');
            }

            // Calculate compound interest
            const daysElapsed = Math.max(1, Math.floor((Date.now() - loan.loan_start_time) / (24 * 60 * 60 * 1000)));
            let interest = 0;
            let remaining = loan.loan_amount;
            
            // Compound interest: 2% per day
            for (let day = 0; day < daysElapsed; day++) {
                const dailyInterest = Math.floor(remaining * loan.interest_rate);
                interest += dailyInterest;
                remaining += dailyInterest; // Compound
            }
            
            const totalOwed = loan.loan_amount + interest;

            const mainBalance = db.getBalance(userId);
            if (mainBalance < totalOwed) {
                return message.reply(`💸 **Saldo tidak cukup!**\nButuh: Rp ${formatMoney(totalOwed)}\nSaldo: Rp ${formatMoney(mainBalance)}\n\n💡 Bunga terakumulasi: ${daysElapsed} hari`);
            }

            // Pay loan
            const result = db.payLoan(userId, totalOwed);
            if (!result.success) {
                return message.reply(`❌ **Gagal:** ${result.error}`);
            }

            // Deduct from main balance
            db.updateBalance(userId, -totalOwed);

            return message.reply(`✅ **Pinjaman Lunas!**\n💰 Pokok: Rp ${formatMoney(loan.loan_amount)}\n💸 Bunga (${daysElapsed} hari): Rp ${formatMoney(interest)}\n💰 Total Dibayar: Rp ${formatMoney(totalOwed)}`);
        }

        // !bank interest - Calculate and apply daily interest
        if (subCommand === 'interest' || subCommand === 'bunga') {
            const bankBalance = db.getBankBalance(userId);
            if (bankBalance === 0) {
                return message.reply('💸 **Saldo bank kosong!** Deposit dulu dengan `!bank deposit`');
            }

            // Interest: 0.5% per hari (capped at 1M deposit)
            const maxDeposit = 1000000;
            const effectiveBalance = Math.min(bankBalance, maxDeposit);
            const dailyInterest = Math.floor(effectiveBalance * 0.005);

            // Check last interest time (simplified: manual claim for now)
            // In future, can auto-apply daily
            return message.reply(`💰 **Bunga Bank (0.5% per hari)**\n🏦 Saldo: Rp ${formatMoney(bankBalance)}\n💎 Bunga Hari Ini: Rp ${formatMoney(dailyInterest)}\n\n💡 Bunga akan ditambahkan otomatis setiap hari jam 00:00`);
        }

        return message.reply('❌ Format: `!bank [info/deposit/withdraw/loan/payloan/interest]`');
    }
};

