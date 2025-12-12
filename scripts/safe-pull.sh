#!/bin/bash

# Safe Git Pull Script for Production
# This script backs up database before pulling

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🔄 [GIT PULL] Starting safe pull process..."

# 1. Backup database
echo "💾 [BACKUP] Backing up database..."
if [ -f "custom_roles.db" ]; then
    BACKUP_FILE="custom_roles.db.backup-$(date +%Y%m%d_%H%M%S)"
    cp custom_roles.db "$BACKUP_FILE"
    echo "✅ [BACKUP] Database backed up to: $BACKUP_FILE"
else
    echo "⚠️ [BACKUP] Database file not found, skipping backup"
fi

# 2. Check git status
echo "📊 [GIT] Checking git status..."
git status

# 3. Fetch latest
echo "📥 [GIT] Fetching latest changes..."
git fetch origin

# 4. Check if there are local changes
if [ -n "$(git status -s)" ]; then
    echo "⚠️ [GIT] You have local changes. Stashing..."
    git stash save "Auto-stash before pull $(date +%Y%m%d_%H%M%S)"
    STASHED=true
else
    STASHED=false
fi

# 5. Pull with merge strategy
echo "⬇️ [GIT] Pulling with merge strategy..."
git pull --no-rebase || {
    echo "❌ [GIT] Pull failed!"
    
    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        echo "🔄 [GIT] Restoring stashed changes..."
        git stash pop || true
    fi
    
    exit 1
}

# 6. Apply stashed changes if any
if [ "$STASHED" = true ]; then
    echo "🔄 [GIT] Applying stashed changes..."
    git stash pop || {
        echo "⚠️ [GIT] Stash pop had conflicts, check manually"
    }
fi

# 7. Install dependencies if package.json changed
if git diff HEAD@{1} HEAD --name-only | grep -q "package.json\|package-lock.json"; then
    echo "📦 [NPM] package.json changed, installing dependencies..."
    npm install
fi

# 8. Success
echo "✅ [GIT PULL] Pull completed successfully!"
echo "📋 [NEXT] Run 'pm2 restart warung-mang-ujang' to apply changes"

exit 0

