# Runs with administrator rights (one UAC prompt): installs VB-CABLE, enables it and sets its audio format.
param([string]$CableSetup, [string]$SwitchExe, [string]$LogFile)
function L([string]$m) { Add-Content -Path $LogFile -Value ((Get-Date -Format 'HH:mm:ss') + '  [Admin] ' + $m) -Encoding UTF8 }
try {
    if ($CableSetup) {
        L "Installing VB-CABLE: $CableSetup"
        $p = Start-Process -FilePath $CableSetup -ArgumentList '-i', '-h' -PassThru -Wait
        L "VB-CABLE setup finished (code $($p.ExitCode))"
    }
    # enable endpoints that were disabled in Windows sound settings
    $r = @(& $SwitchExe enable-cable 2>&1)
    if ($r.Count) { L ('Enable: ' + ($r -join ' | ')) }
    $ok = $false
    for ($i = 0; $i -lt 40; $i++) {
        $s = @(& $SwitchExe cable-status 2>$null)
        if ($s.Count -ge 2) { $ok = $true; break }
        Start-Sleep -Milliseconds 750
    }
    if ($ok) {
        Start-Sleep -Seconds 1
        $r = @(& $SwitchExe cable-format 48000 2>&1)
        L ('Format: ' + ($r -join ' | '))
    } else { L 'CABLE endpoints not visible yet (restart required)' }
    exit 0
} catch { L ('Error: ' + $_.Exception.Message); exit 1 }
