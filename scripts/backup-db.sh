#!/bin/bash

# Database Backup Script for AWS
# Run this script via cron job for automatic backups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_FILE="$PROJECT_DIR/custom_roles.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/custom_roles_$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database file exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ [BACKUP] Database file not found: $DB_FILE"
    exit 1
fi

# Create backup
cp "$DB_FILE" "$BACKUP_FILE"

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ [BACKUP] Database backed up: $(basename $BACKUP_FILE) ($FILE_SIZE)"

# Upload to S3 if configured
if [ ! -z "$S3_BACKUP_BUCKET" ]; then
    S3_KEY="backups/custom_roles_$TIMESTAMP.db"
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BACKUP_BUCKET/$S3_KEY" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "☁️ [BACKUP] Uploaded to S3: s3://$S3_BACKUP_BUCKET/$S3_KEY"
    else
        echo "⚠️ [BACKUP] S3 upload failed (check AWS credentials)"
    fi
fi

# Cleanup old backups (keep last 30)
cd "$BACKUP_DIR"
ls -t custom_roles_*.db 2>/dev/null | tail -n +31 | xargs -r rm
echo "🗑️ [BACKUP] Old backups cleaned up"

exit 0

