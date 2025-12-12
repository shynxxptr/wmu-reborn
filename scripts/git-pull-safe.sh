#!/bin/bash

# Safe Git Pull Script for AWS
# Handles local changes automatically

cd ~/warung-mang-ujang || exit 1

echo "🔄 Checking for local changes..."

# Check if there are local changes
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ No local changes, pulling updates..."
    git pull --no-rebase
else
    echo "⚠️  Local changes detected, stashing..."
    git stash
    
    echo "📥 Pulling updates..."
    git pull --no-rebase
    
    echo "✅ Pull complete!"
    echo "💡 To restore stashed changes, run: git stash pop"
fi

echo "🔄 Restarting bot..."
pm2 restart warung-mang-ujang

echo "✅ Done!"

