@echo off
title Terowongan SSH - Live Translator
echo ======================================================
echo 🌐 Menghubungkan Server Lokal ke Internet (Jepang)
echo ======================================================
echo Pastikan server Node.js Anda sudah menyala (npm start)
echo.
echo Menghubungkan melalui terowongan SSH gratis (serveo.net)...
echo Tanpa perlu daftar akun atau memasukkan token authtoken!
echo.
echo PERHATIAN:
echo Jika ditanya "Are you sure you want to continue connecting (yes/no/[fingerprint])?"
echo Ketik: yes   (lalu tekan Enter)
echo.
ssh -R 80:localhost:3000 serveo.net
pause
