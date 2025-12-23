# PowerShell Script untuk Push ke Repository Baru
# Warung Mang Ujang Bot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GITHUB REPOSITORY SETUP - WARUNG BOT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Git Status
Write-Host "Step 1: Checking Git Status..." -ForegroundColor Yellow
git status
Write-Host ""

# Step 2: Get Repository URL
Write-Host "Step 2: Enter your GitHub repository URL:" -ForegroundColor Yellow
Write-Host "        Format: https://github.com/USERNAME/REPOSITORY-NAME.git" -ForegroundColor Gray
$repoUrl = Read-Host "Repository URL"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "Error: Repository URL cannot be empty!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 3: Remove old remote
Write-Host ""
Write-Host "Step 3: Removing old remote (if exists)..." -ForegroundColor Yellow
git remote remove origin 2>$null

# Step 4: Add new remote
Write-Host "Step 4: Adding new remote..." -ForegroundColor Yellow
git remote add origin $repoUrl

# Step 5: Check remote
Write-Host "Step 5: Checking remote..." -ForegroundColor Yellow
git remote -v
Write-Host ""

# Step 6: Ask about commit
Write-Host "Step 6: Do you want to commit all changes? (Y/N)" -ForegroundColor Yellow
$commitChoice = Read-Host "Choice"

if ($commitChoice -eq "Y" -or $commitChoice -eq "y") {
    Write-Host ""
    Write-Host "Adding all files..." -ForegroundColor Yellow
    git add .
    
    Write-Host "Enter commit message (or press Enter for default):" -ForegroundColor Yellow
    $commitMsg = Read-Host "Commit message"
    
    if ([string]::IsNullOrWhiteSpace($commitMsg)) {
        $commitMsg = "Initial commit - Warung Mang Ujang Bot v2.5"
    }
    
    Write-Host "Committing..." -ForegroundColor Yellow
    git commit -m $commitMsg
    Write-Host ""
}

# Step 7: Set branch to main
Write-Host "Step 7: Setting branch to main..." -ForegroundColor Yellow
git branch -M main

# Step 8: Push
Write-Host "Step 8: Pushing to new repository..." -ForegroundColor Yellow
Write-Host "        This will push to: $repoUrl" -ForegroundColor Gray
Write-Host ""
$pushChoice = Read-Host "Ready to push? (Y/N)"

if ($pushChoice -eq "Y" -or $pushChoice -eq "y") {
    Write-Host ""
    Write-Host "Pushing..." -ForegroundColor Yellow
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host " SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Repository URL: $repoUrl" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host " ERROR: Push failed!" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible reasons:" -ForegroundColor Yellow
        Write-Host "- Repository not found or URL incorrect" -ForegroundColor Gray
        Write-Host "- Authentication required (check GitHub credentials)" -ForegroundColor Gray
        Write-Host "- Branch conflict (try: git push -u origin main --force)" -ForegroundColor Gray
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "Push cancelled. You can push manually later with:" -ForegroundColor Yellow
    Write-Host "  git push -u origin main" -ForegroundColor Gray
}

Write-Host ""
Read-Host "Press Enter to exit"



