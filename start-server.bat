@echo off
echo ========================================
echo  The Answer Trap Risk Profile Survey
echo  Email Server Startup
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
)

echo Node.js found! Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    echo Please reinstall Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo npm found! Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        echo Please check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

echo.
echo Starting the survey server with enhanced management...
echo.
echo The survey will be available at: http://localhost:3000
echo.
echo To stop the server, press Ctrl+C
echo.
echo ========================================
echo.

node server-manager.js start