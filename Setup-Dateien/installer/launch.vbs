' Aurelune Studio - starts the setup with 64-bit Windows PowerShell (hidden), independent of PATH
Option Explicit
Dim sh, fso, dir, win, ps, rc
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
win = sh.ExpandEnvironmentStrings("%SystemRoot%")
ps = win & "\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
If Not fso.FileExists(ps) Then ps = win & "\System32\WindowsPowerShell\v1.0\powershell.exe"
If Not fso.FileExists(ps) Then
  MsgBox "Windows PowerShell was not found:" & vbCrLf & ps, 16, "Aurelune Studio"
  WScript.Quit 1
End If
rc = sh.Run("""" & ps & """ -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File """ & dir & "\setup.ps1""", 0, True)
WScript.Quit rc
