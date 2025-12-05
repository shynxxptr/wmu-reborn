const db = require('../database.js');
const fs = require('fs');
const path = require('path');

/**
 * Cleanup old audit logs (older than 30 days) and create backup
 * @returns {Object} { success: boolean, backupFile: string, deletedCount: number }
 */
function cleanupOldLogs() {
    const backupDir = path.join(__dirname, '../backups');

    // Create backups directory if not exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    // Calculate 30 days ago timestamp
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    try {
        // Get old logs
        const oldLogs = db.prepare('SELECT * FROM audit_logs WHERE timestamp < ?').all(thirtyDaysAgo);

        if (oldLogs.length === 0) {
            return { success: true, backupFile: null, deletedCount: 0, message: 'No old logs to clean up' };
        }

        // Create backup file
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const backupFileName = `audit_logs_${timestamp}.json`;
        const backupFilePath = path.join(backupDir, backupFileName);

        // Write backup
        fs.writeFileSync(backupFilePath, JSON.stringify(oldLogs, null, 2), 'utf8');

        // Delete old logs from database
        const result = db.prepare('DELETE FROM audit_logs WHERE timestamp < ?').run(thirtyDaysAgo);

        console.log(`✅ [CLEANUP] Backed up ${oldLogs.length} logs to ${backupFileName}`);
        console.log(`✅ [CLEANUP] Deleted ${result.changes} old logs from database`);

        return {
            success: true,
            backupFile: backupFileName,
            deletedCount: result.changes,
            message: `Successfully cleaned up ${result.changes} logs`
        };
    } catch (error) {
        console.error('❌ [CLEANUP] Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get list of backup files
 * @returns {Array} List of backup files with metadata
 */
function getBackupFiles() {
    const backupDir = path.join(__dirname, '../backups');

    if (!fs.existsSync(backupDir)) {
        return [];
    }

    const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const filePath = path.join(backupDir, f);
            const stats = fs.statSync(filePath);
            return {
                name: f,
                size: stats.size,
                created: stats.mtime,
                path: filePath
            };
        })
        .sort((a, b) => b.created - a.created); // Newest first

    return files;
}

module.exports = { cleanupOldLogs, getBackupFiles };
