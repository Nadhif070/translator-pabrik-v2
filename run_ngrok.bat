@echo off
title Terowongan Ngrok - Live Translator
echo ======================================================
echo 🌐 Menghubungkan Server Lokal ke Internet (Jepang)
echo ======================================================
echo Pastikan server Node.js Anda sudah menyala (npm start)
echo.
echo Mengaktifkan terowongan Ngrok Laragon pada port 3000...
echo.
C:\laragon\bin\ngrok\ngrok.exe http 3000
pause
