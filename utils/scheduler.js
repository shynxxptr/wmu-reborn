const { cleanupOldLogs } = require('./cleanupLogs.js');
const db = require('../database.js');
const { formatMoney } = require('./helpers.js');

/**
 * Initialize monthly cleanup scheduler
 */
function initCleanupScheduler() {
    // Run cleanup on 1st day of every month at 00:00
    const checkAndRunCleanup = () => {
        const now = new Date();
        const day = now.getDate();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Run on 1st day of month at 00:00-00:01
        if (day === 1 && hour === 0 && minute === 0) {
            console.log('🗑️ [SCHEDULER] Running monthly cleanup...');
            const result = cleanupOldLogs();
            if (result.success) {
                console.log(`✅ [SCHEDULER] ${result.message}`);
            } else {
                console.error(`❌ [SCHEDULER] Cleanup failed: ${result.error}`);
            }
        }
    };

    // Check every minute
    setInterval(checkAndRunCleanup, 60 * 1000);
    console.log('📅 [SCHEDULER] Monthly cleanup scheduler initialized');
}

/**
 * Initialize Banking Scheduler
 * Runs daily at 00:00 to apply bank interest and process overdue loans
 */
function initBankingScheduler() {
    let lastRunDate = null;

    const checkAndRunBanking = () => {
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Run once per day at 00:00-00:01
        if (lastRunDate !== today && hour === 0 && minute === 0) {
            console.log('💰 [SCHEDULER] Running daily bank interest...');
            lastRunDate = today;

            try {
                // 1. Bank Interest (0.5% per hari, max 1M deposit)
                const bankUsers = db.prepare('SELECT user_id, bank_balance FROM user_banking WHERE bank_balance > 0').all();
                let totalInterest = 0;
                let interestUsers = 0;

                bankUsers.forEach(user => {
                    const maxDeposit = 1000000;
                    const effectiveBalance = Math.min(user.bank_balance, maxDeposit);
                    const dailyInterest = Math.floor(effectiveBalance * 0.005); // 0.5% per hari
                    
                    if (dailyInterest > 0) {
                        db.depositToBank(user.user_id, dailyInterest);
                        totalInterest += dailyInterest;
                        interestUsers++;
                    }
                });

                console.log(`✅ [SCHEDULER] Bank interest: ${interestUsers} users, Total: Rp ${formatMoney(totalInterest)}`);

                // 2. Loan Interest & Auto-Deduct (if overdue)
                const loans = db.prepare('SELECT * FROM user_banking WHERE loan_amount > 0').all();
                let overdueLoans = 0;

                loans.forEach(loan => {
                    const now = Date.now();
                    if (now > loan.loan_due_time) {
                        // Overdue: Auto-deduct + 5% penalty
                        const daysElapsed = Math.floor((now - loan.loan_start_time) / (24 * 60 * 60 * 1000));
                        const interest = Math.floor(loan.loan_amount * loan.loan_interest_rate * daysElapsed);
                        const penalty = Math.floor(loan.loan_amount * 0.05); // 5% penalty
                        const totalOwed = loan.loan_amount + interest + penalty;

                        const userBalance = db.getBalance(loan.user_id);
                        if (userBalance >= totalOwed) {
                            db.updateBalance(loan.user_id, -totalOwed);
                            db.prepare('UPDATE user_banking SET loan_amount = 0, loan_start_time = 0, loan_due_time = 0 WHERE user_id = ?').run(loan.user_id);
                            overdueLoans++;
                        } else {
                            // Can't pay: reduce balance to 0, keep loan
                            if (userBalance > 0) {
                                db.updateBalance(loan.user_id, -userBalance);
                            }
                        }
                    }
                });

                if (overdueLoans > 0) {
                    console.log(`⚠️ [SCHEDULER] Processed ${overdueLoans} overdue loans`);
                }

            } catch (error) {
                console.error('❌ [SCHEDULER] Daily tasks failed:', error);
            }
        }
    };

    // Check every minute
    setInterval(checkAndRunBanking, 60 * 1000);
    console.log('💰 [SCHEDULER] Banking scheduler initialized');
}

/**
 * Initialize Leaderboard Role Rotation Scheduler
 * Runs every 10 minutes
 */
function initLeaderboardScheduler(client) {
    const { updateLeaderboardRoles } = require('../handlers/leaderboardHandler.js');

    const runRotation = async () => {
        // console.log('🔄 [SCHEDULER] Running leaderboard role rotation...');
        await updateLeaderboardRoles(client);
    };

    // Run immediately on start
    runRotation();

    // Then every 10 minutes
    setInterval(runRotation, 10 * 60 * 1000);
    console.log('👑 [SCHEDULER] Leaderboard role rotation initialized');
}

module.exports = { initCleanupScheduler, initLeaderboardScheduler, initBankingScheduler };
