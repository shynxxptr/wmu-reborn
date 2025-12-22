@echo off
echo ========================================
echo  GITHUB REPOSITORY SETUP - WARUNG BOT
echo ========================================
echo.

echo Step 1: Checking Git Status...
git status
echo.

echo Step 2: Please create a new repository on GitHub first!
echo         Go to: https://github.com/new
echo         Then come back and press any key...
pause
echo.

echo Step 3: Enter your GitHub repository URL:
echo         Format: https://github.com/USERNAME/REPOSITORY-NAME.git
set /p REPO_URL="Repository URL: "

if "%REPO_URL%"=="" (
    echo Error: Repository URL cannot be empty!
    pause
    exit /b 1
)

echo.
echo Step 4: Removing old remote (if exists)...
git remote remove origin 2>nul

echo Step 5: Adding new remote...
git remote add origin %REPO_URL%

echo Step 6: Checking remote...
git remote -v
echo.

echo Step 7: Do you want to commit all changes? (Y/N)
set /p COMMIT_CHOICE="Choice: "

if /i "%COMMIT_CHOICE%"=="Y" (
    echo.
    echo Adding all files...
    git add .
    
    echo Enter commit message (or press Enter for default):
    set /p COMMIT_MSG="Commit message: "
    
    if "%COMMIT_MSG%"=="" (
        set COMMIT_MSG="Initial commit - Warung Mang Ujang Bot v2.5"
    )
    
    echo Committing...
    git commit -m %COMMIT_MSG%
    echo.
)

echo Step 8: Setting branch to main...
git branch -M main

echo Step 9: Pushing to new repository...
echo         This will push to: %REPO_URL%
echo.
set /p PUSH_CHOICE="Ready to push? (Y/N): "

if /i "%PUSH_CHOICE%"=="Y" (
    echo.
    echo Pushing...
    git push -u origin main
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo  SUCCESS! Code pushed to GitHub!
        echo ========================================
        echo.
        echo Repository URL: %REPO_URL%
    ) else (
        echo.
        echo ========================================
        echo  ERROR: Push failed!
        echo ========================================
        echo.
        echo Possible reasons:
        echo - Repository not found or URL incorrect
        echo - Authentication required (check GitHub credentials)
        echo - Branch conflict (try: git push -u origin main --force)
        echo.
    )
) else (
    echo.
    echo Push cancelled. You can push manually later with:
    echo   git push -u origin main
)

echo.
pause

