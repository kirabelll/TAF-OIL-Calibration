@echo off
title TAF Oil Petroleum Next.js Engine
color 0A
echo ====================================================================
echo        TAF OIL ETHIOPIA - PETROLEUM SYSTEM (DEV SERVER)
echo ====================================================================
echo.
where pnpm >nul 2>nul
if %errorlevel% equ 0 (
    pnpm dev
) else (
    npm run dev
)
pause
