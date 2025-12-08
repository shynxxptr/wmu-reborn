const { cleanupOldLogs } = require('./cleanupLogs.js');

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

module.exports = { initCleanupScheduler, initLeaderboardScheduler };
