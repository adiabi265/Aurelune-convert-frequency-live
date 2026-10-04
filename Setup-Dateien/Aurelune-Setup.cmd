@echo off
cd /d "%~dp0"
if not exist "%~dp0installer\setup.ps1" (
  echo.
  echo  Please extract the ZIP first / Bitte die ZIP-Datei zuerst entpacken.
  echo.
  pause
  exit /b 1
)
set "PS=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
start "" "%PS%" -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "%~dp0installer\setup.ps1"
