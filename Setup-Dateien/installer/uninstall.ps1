# Aurelune Studio – Uninstall (English / Deutsch)
Add-Type -AssemblyName System.Windows.Forms
$dir = $PSScriptRoot
$de = $false
try { $de = ((Get-ItemProperty -Path 'HKCU:\Software\Aurelune' -ErrorAction Stop).Language -eq 'de') } catch {}
function M([string]$en, [string]$deText) { if ($de) { return $deText } return $en }
$r = [System.Windows.Forms.MessageBox]::Show((M "Really remove Aurelune Studio?`n`nPython stays installed." "Aurelune Studio wirklich entfernen?`n`nPython bleibt installiert."), 'Aurelune Studio', 'YesNo', 'Question')
if ($r -ne 'Yes') { exit }
Set-Location $env:TEMP
try {
    Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" |
        Where-Object { $_.CommandLine -like '*Aurelune Studio*' } | ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null }
    Start-Sleep -Milliseconds 600
} catch {}
$sw = Join-Path $dir 'AudioSwitch.exe'
if (Test-Path $sw) { & $sw restore | Out-Null }
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'AureluneStudio' -ErrorAction SilentlyContinue
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'AureluneStudio' -ErrorAction SilentlyContinue
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'AureluneStudioUpdater' -ErrorAction SilentlyContinue
try {
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*autoupdate.ps1*' } |
        ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null }
} catch {}
Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AureluneStudio' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath('Programs')) 'Aurelune Studio') -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Aurelune Studio.lnk') -Force -ErrorAction SilentlyContinue
$vb = Get-ChildItem -Path (Join-Path $dir 'vbcable') -Filter 'VBCABLE_Setup_x64.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($vb) {
    $q = [System.Windows.Forms.MessageBox]::Show((M 'Also remove the VB-CABLE audio driver?' 'Soll auch der VB-CABLE Audiotreiber entfernt werden?'), 'Aurelune Studio', 'YesNo', 'Question')
    if ($q -eq 'Yes') { try { Start-Process -FilePath $vb.FullName -ArgumentList '-u', '-h' -Verb RunAs -Wait } catch {} }
}
Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item 'HKCU:\Software\Aurelune' -Recurse -Force -ErrorAction SilentlyContinue
[System.Windows.Forms.MessageBox]::Show((M 'Aurelune Studio has been removed. Sound plays through your normal speakers again.' 'Aurelune Studio wurde entfernt. Der Ton läuft wieder über deine normalen Lautsprecher.'), 'Aurelune Studio', 'OK', 'Information') | Out-Null
