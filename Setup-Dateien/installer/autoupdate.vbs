' Aurelune Studio - starts the background updater invisibly (no console window)
Option Explicit
Dim sh, fso, dir, ps
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
ps = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
If fso.FileExists(dir & "\autoupdate.ps1") Then
  sh.Run """" & ps & """ -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\autoupdate.ps1""", 0, False
End If
