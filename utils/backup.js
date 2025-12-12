const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Database Backup Utility
 * Backup custom_roles.db to local backups folder and optionally to S3
 */

const DB_FILE = path.join(__dirname, '../custom_roles.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_LOCAL_BACKUPS = 30; // Keep last 30 backups locally

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log(`📁 [BACKUP] Created backup directory: ${BACKUP_DIR}`);
    }
}

/**
 * Backup database to local file
 * @returns {string} Path to backup file
 */
function backupDatabase() {
    try {
        ensureBackupDir();

        // Check if database file exists
        if (!fs.existsSync(DB_FILE)) {
            console.error(`❌ [BACKUP] Database file not found: ${DB_FILE}`);
            return null;
        }

        // Generate timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const backupFileName = `custom_roles_${timestamp}.db`;
        const backupFilePath = path.join(BACKUP_DIR, backupFileName);

        // Copy database file
        fs.copyFileSync(DB_FILE, backupFilePath);

        // Get file size
        const stats = fs.statSync(backupFilePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`✅ [BACKUP] Database backed up: ${backupFileName} (${fileSizeMB} MB)`);

        // Cleanup old backups (keep only last MAX_LOCAL_BACKUPS)
        cleanupOldBackups();

        return backupFilePath;
    } catch (error) {
        console.error('❌ [BACKUP] Error backing up database:', error);
        return null;
    }
}

/**
 * Cleanup old backup files, keep only last MAX_LOCAL_BACKUPS
 */
function cleanupOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('custom_roles_') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file),
                time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort by newest first

        // Delete old backups
        if (files.length > MAX_LOCAL_BACKUPS) {
            const toDelete = files.slice(MAX_LOCAL_BACKUPS);
            let deletedCount = 0;
            for (const file of toDelete) {
                try {
                    fs.unlinkSync(file.path);
                    deletedCount++;
                } catch (e) {
                    console.error(`❌ [BACKUP] Failed to delete old backup: ${file.name}`, e);
                }
            }
            if (deletedCount > 0) {
                console.log(`🗑️ [BACKUP] Deleted ${deletedCount} old backup(s)`);
            }
        }
    } catch (error) {
        console.error('❌ [BACKUP] Error cleaning up old backups:', error);
    }
}

/**
 * Upload backup to AWS S3 (optional, requires AWS CLI configured)
 * @param {string} backupFilePath - Path to backup file
 * @returns {Promise<boolean>} Success status
 */
async function uploadToS3(backupFilePath) {
    return new Promise((resolve) => {
        const s3Bucket = process.env.S3_BACKUP_BUCKET;
        const s3Key = `backups/${path.basename(backupFilePath)}`;

        if (!s3Bucket) {
            console.log('ℹ️ [BACKUP] S3_BACKUP_BUCKET not set, skipping S3 upload');
            resolve(false);
            return;
        }

        // Use AWS CLI to upload (requires AWS CLI installed and configured)
        const command = `aws s3 cp "${backupFilePath}" "s3://${s3Bucket}/${s3Key}"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ [BACKUP] S3 upload failed: ${error.message}`);
                console.error(`   Command: ${command}`);
                resolve(false);
                return;
            }
            console.log(`☁️ [BACKUP] Uploaded to S3: s3://${s3Bucket}/${s3Key}`);
            resolve(true);
        });
    });
}

/**
 * Restore database from backup file
 * @param {string} backupFilePath - Path to backup file
 * @returns {boolean} Success status
 */
function restoreDatabase(backupFilePath) {
    try {
        if (!fs.existsSync(backupFilePath)) {
            console.error(`❌ [RESTORE] Backup file not found: ${backupFilePath}`);
            return false;
        }

        // Create backup of current database before restore
        const currentBackup = backupDatabase();
        if (currentBackup) {
            console.log(`💾 [RESTORE] Current database backed up to: ${currentBackup}`);
        }

        // Copy backup file to database location
        fs.copyFileSync(backupFilePath, DB_FILE);
        console.log(`✅ [RESTORE] Database restored from: ${backupFilePath}`);
        return true;
    } catch (error) {
        console.error('❌ [RESTORE] Error restoring database:', error);
        return false;
    }
}

/**
 * List all available backups
 * @returns {Array} Array of backup file info
 */
function listBackups() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return [];
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('custom_roles_') && file.endsWith('.db'))
            .map(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
                    created: stats.birthtime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => b.created - a.created); // Sort by newest first

        return files;
    } catch (error) {
        console.error('❌ [BACKUP] Error listing backups:', error);
        return [];
    }
}

/**
 * Get latest backup file
 * @returns {string|null} Path to latest backup or null
 */
function getLatestBackup() {
    const backups = listBackups();
    return backups.length > 0 ? backups[0].path : null;
}

// Auto-backup on module load (if enabled)
if (process.env.AUTO_BACKUP_ENABLED === 'true') {
    // Run backup immediately
    backupDatabase();

    // Schedule daily backup (24 hours)
    const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24') * 60 * 60 * 1000;
    setInterval(() => {
        const backupFile = backupDatabase();
        if (backupFile && process.env.S3_BACKUP_BUCKET) {
            uploadToS3(backupFile);
        }
    }, backupInterval);

    console.log(`🔄 [BACKUP] Auto-backup enabled (every ${process.env.BACKUP_INTERVAL_HOURS || '24'} hours)`);
}

module.exports = {
    backupDatabase,
    restoreDatabase,
    listBackups,
    getLatestBackup,
    uploadToS3,
    cleanupOldBackups
};

