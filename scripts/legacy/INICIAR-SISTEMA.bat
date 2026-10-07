@echo off
cd /d "%~dp0..\.."
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\legacy\run-local.ps1"
pause
