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

module.exports = { initCleanupScheduler };
