@echo off
rem Aurelune Studio - Update (keeps settings, Python and VB-CABLE)
set "SRC=%~dp0Setup-Dateien\installer\update.ps1"
if not exist "%SRC%" set "SRC=%~dp0installer\update.ps1"
if not exist "%SRC%" (
  echo.
  echo  Please extract the ZIP first / Bitte die ZIP-Datei zuerst entpacken.
  echo.
  pause
  exit /b 1
)
set "PS=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
start "" "%PS%" -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "%SRC%"
