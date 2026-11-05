@echo off
title TAF Oil Petroleum Next.js Web Server
color 0B
echo ====================================================================
echo        TAF OIL ETHIOPIA - NEXT.JS WEB INTERFACE (PORT 3000)
echo ====================================================================
echo.
echo Opening browser and starting Next.js application...
start http://localhost:3000
echo.
where pnpm >nul 2>nul
if %errorlevel% equ 0 (
    pnpm dev
) else (
    npm run dev
)
