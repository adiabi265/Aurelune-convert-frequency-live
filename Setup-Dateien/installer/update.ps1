# Aurelune Studio – Updater: updates an existing installation in place (keeps settings, Python, VB-CABLE).
# -Background: started by the background updater (autoupdate.ps1) - invisible if Aurelune is closed, restarts it only if it was open.
param([switch]$Background)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$Root       = Split-Path -Parent $PSScriptRoot
$AppSrc     = Join-Path $Root 'app'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\Aurelune Studio'
$Temp       = Join-Path $env:TEMP 'AureluneSetup'
$LogFile    = Join-Path $Temp 'update.log'
$SwitchExe  = Join-Path $InstallDir 'AudioSwitch.exe'
$VenvPy     = Join-Path $InstallDir '.venv\Scripts\python.exe'
$VenvPyw    = Join-Path $InstallDir '.venv\Scripts\pythonw.exe'
$PS         = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
New-Item -ItemType Directory -Force -Path $Temp | Out-Null
Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue

$de = $false
try { $de = ((Get-ItemProperty -Path 'HKCU:\Software\Aurelune' -ErrorAction Stop).Language -eq 'de') } catch {}
function M([string]$en, [string]$deText) { if ($de) { return $deText } return $en }

$NewVer = (Get-Content -Raw -Path (Join-Path $AppSrc 'version.txt')).Trim()
$OldVer = '?'
$f = Join-Path $InstallDir 'installed-version.txt'
if (Test-Path $f) { $OldVer = (Get-Content -Raw -Path $f).Trim() }
elseif (Test-Path (Join-Path $InstallDir 'version.txt')) { $OldVer = (Get-Content -Raw -Path (Join-Path $InstallDir 'version.txt')).Trim() }

function V([string]$s) {
    $n = @([regex]::Matches(($s + ''), '\d+') | Select-Object -First 4 | ForEach-Object { [int]$_.Value })
    while ($n.Count -lt 4) { $n += 0 }
    return New-Object Version($n[0], $n[1], $n[2], $n[3])
}
# only one update at a time (in-app updater and background updater may both start one)
$created = $false
$runMutex = New-Object Threading.Mutex($true, 'Local\AureluneStudioUpdateRun', [ref]$created)
if (-not $created) { exit 0 }
if ($Background -and ((V $NewVer) -le (V $OldVer))) { exit 0 }
$appRunning = $false
try { $appRunning = @(Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" -ErrorAction Stop | Where-Object { $_.CommandLine -like '*Aurelune Studio*' }).Count -gt 0 } catch {}
$FailedFile = Join-Path $Temp 'update-failed.txt'
function Start-Watcher {
    try {
        $vbs = Join-Path $InstallDir 'autoupdate.vbs'
        if (-not (Test-Path $vbs)) { return }
        $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
        Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'AureluneStudioUpdater' -Value "`"$wscript`" `"$vbs`""
        Start-Process -FilePath $wscript -ArgumentList "`"$vbs`""
    } catch { Log ('watcher: ' + $_.Exception.Message) }
}

# not installed yet (or broken) -> run the full setup instead
if (-not (Test-Path (Join-Path $InstallDir 'app.py')) -or -not (Test-Path $VenvPy)) {
    [System.Windows.Forms.MessageBox]::Show((M 'Aurelune Studio is not installed yet – the full setup starts now.' 'Aurelune Studio ist noch nicht installiert – die vollständige Installation startet jetzt.'), 'Aurelune Studio', 'OK', 'Information') | Out-Null
    Start-Process -FilePath $PS -ArgumentList "-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File `"$(Join-Path $PSScriptRoot 'setup.ps1')`""
    exit 0
}

# ------------------------------------------------------------------ window
$C_BG = [Drawing.Color]::FromArgb(14, 12, 22); $C_ACC = [Drawing.Color]::FromArgb(245, 185, 113)
$C_MUT = [Drawing.Color]::FromArgb(200, 192, 220); $C_OK = [Drawing.Color]::FromArgb(109, 255, 168); $C_ERR = [Drawing.Color]::FromArgb(255, 110, 130)
$w = New-Object Windows.Forms.Form
$w.Text = 'Aurelune Studio – Update'; $w.ClientSize = New-Object Drawing.Size(460, 250); $w.StartPosition = 'CenterScreen'
$w.FormBorderStyle = 'FixedSingle'; $w.MaximizeBox = $false; $w.BackColor = $C_BG; $w.ForeColor = [Drawing.Color]::White
$w.Font = New-Object Drawing.Font('Segoe UI', 10)
try { $w.Icon = New-Object Drawing.Icon (Join-Path $AppSrc 'aurelune.ico') } catch {}
$w.add_Paint({ param($s, $e) $r = New-Object Drawing.Rectangle(0, 0, $s.ClientSize.Width, 6)
    $b = New-Object Drawing.Drawing2D.LinearGradientBrush($r, [Drawing.Color]::FromArgb(139, 108, 255), $C_ACC, [single]0); $e.Graphics.FillRectangle($b, $r); $b.Dispose() })
$logo = New-Object Windows.Forms.PictureBox; $logo.SetBounds(24, 30, 64, 64); $logo.SizeMode = 'Zoom'
try { $logo.Image = [Drawing.Image]::FromFile((Join-Path $AppSrc 'ui\icon.png')) } catch {}
$w.Controls.Add($logo)
$tl = New-Object Windows.Forms.Label; $tl.SetBounds(104, 30, 340, 32); $tl.Font = New-Object Drawing.Font('Segoe UI Semibold', 15); $tl.Text = 'Aurelune Studio – Update'
$vl = New-Object Windows.Forms.Label; $vl.SetBounds(106, 64, 340, 24); $vl.ForeColor = $C_MUT; $vl.Text = "$OldVer  →  $NewVer"
$w.Controls.AddRange(@($tl, $vl))
$track = New-Object Windows.Forms.Panel; $track.SetBounds(24, 120, 412, 8); $track.BackColor = [Drawing.Color]::FromArgb(40, 36, 56)
$fill = New-Object Windows.Forms.Panel; $fill.SetBounds(0, 0, 0, 8); $fill.BackColor = $C_ACC
$shine = New-Object Windows.Forms.Panel; $shine.SetBounds(-60, 0, 60, 8); $shine.BackColor = [Drawing.Color]::FromArgb(255, 226, 180)
$track.Controls.Add($shine); $track.Controls.Add($fill); $shine.BringToFront(); $w.Controls.Add($track)
$st = New-Object Windows.Forms.Label; $st.SetBounds(24, 138, 412, 44); $st.ForeColor = $C_MUT; $st.Text = (M 'Starting …' 'Starte …')
$w.Controls.Add($st)
$btn = New-Object Windows.Forms.Button; $btn.SetBounds(296, 194, 140, 38); $btn.FlatStyle = 'Flat'; $btn.FlatAppearance.BorderSize = 0
$btn.BackColor = $C_ACC; $btn.ForeColor = [Drawing.Color]::FromArgb(26, 18, 34); $btn.Font = New-Object Drawing.Font('Segoe UI Semibold', 10)
$btn.Text = (M 'Close' 'Schließen'); $btn.Enabled = $false; $btn.add_Click({ $w.Close() })
$w.Controls.Add($btn)
$timer = New-Object Windows.Forms.Timer; $timer.Interval = 20
$timer.add_Tick({ $x = $shine.Left + 7; if ($x -gt 412) { $x = -60 }; $shine.Left = $x })

function Pump { [System.Windows.Forms.Application]::DoEvents() }
function Log([string]$m) { Add-Content -Path $LogFile -Value ((Get-Date -Format 'HH:mm:ss') + '  ' + $m) -Encoding UTF8 }
function Status([string]$m, [double]$p) { $st.Text = $m; if ($p -ge 0) { $fill.Width = [int](412 * $p) }; Log $m; Pump }
function Run-Wait([string]$file, [string]$arguments) {
    Log "> $file $arguments"
    $out = Join-Path $Temp ('upd_' + [guid]::NewGuid().ToString('N') + '.log')
    $p = Start-Process -FilePath $file -ArgumentList $arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError ($out + '.err')
    $null = $p.Handle
    while (-not $p.HasExited) { Pump; Start-Sleep -Milliseconds 40 }
    $p.WaitForExit()
    Get-Content $out, ($out + '.err') -ErrorAction SilentlyContinue | Add-Content -Path $LogFile -Encoding UTF8
    return $p.ExitCode
}
function Hash([string]$path) { if (Test-Path $path) { return (Get-FileHash -Path $path -Algorithm SHA256).Hash } return '' }

function Do-Update {
    $backup = Join-Path $Temp 'backup'
    $wasRunning = $false
    try {
        Log "Update $OldVer -> $NewVer"
        Status (M 'Closing Aurelune …' 'Beende Aurelune …') 0.05
        try {
            $procs = @(Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" -ErrorAction Stop | Where-Object { $_.CommandLine -like '*Aurelune Studio*' })
            foreach ($pr in $procs) { $wasRunning = $true; Invoke-CimMethod -InputObject $pr -MethodName Terminate | Out-Null }
            if ($wasRunning) { Start-Sleep -Milliseconds 800 }
        } catch {}
        try {   # stop the old background updater - the new one is started at the end
            Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction Stop | Where-Object { $_.CommandLine -like '*autoupdate.ps1*' -and $_.ProcessId -ne $PID } |
                ForEach-Object { Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null }
        } catch {}
        if ($wasRunning -and (Test-Path $SwitchExe)) { & $SwitchExe restore | Out-Null }   # sound back to the normal speaker meanwhile

        Status (M 'Backing up current version …' 'Sichere aktuelle Version …') 0.15
        if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
        New-Item -ItemType Directory -Force -Path $backup | Out-Null
        Get-ChildItem -Path $InstallDir | Where-Object { $_.Name -notin @('.venv', 'vbcable', '__pycache__') } | ForEach-Object { Copy-Item -Path $_.FullName -Destination $backup -Recurse -Force }
        $oldReq = Hash (Join-Path $InstallDir 'requirements.txt')
        $oldCs = Hash (Join-Path $InstallDir 'AudioSwitch.cs')

        Status (M 'Copying new files …' 'Kopiere neue Dateien …') 0.3
        Get-ChildItem -Path $AppSrc | Where-Object { $_.Name -ne '__pycache__' } | ForEach-Object { Copy-Item -Path $_.FullName -Destination $InstallDir -Recurse -Force; Pump }
        foreach ($x in @('uninstall.ps1', 'update.ps1', 'autoupdate.ps1', 'autoupdate.vbs')) { $s = Join-Path $PSScriptRoot $x; if (Test-Path $s) { Copy-Item $s $InstallDir -Force } }
        foreach ($x in @('MANUAL-SETUP.txt', 'MANUELLE-EINRICHTUNG.txt')) { $s = Join-Path $Root $x; if (Test-Path $s) { Copy-Item $s $InstallDir -Force } }
        Remove-Item (Join-Path $InstallDir '__pycache__') -Recurse -Force -ErrorAction SilentlyContinue

        if (((Hash (Join-Path $InstallDir 'AudioSwitch.cs')) -ne $oldCs) -or -not (Test-Path $SwitchExe)) {
            Status (M 'Rebuilding device switcher …' 'Baue Geräte-Umschalter neu …') 0.45
            $csc = @("$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe", "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
            if ($csc) {
                $tmpExe = Join-Path $InstallDir 'AudioSwitch.new.exe'
                $code = Run-Wait $csc "/nologo /optimize+ /target:exe /platform:anycpu /out:`"$tmpExe`" `"$(Join-Path $InstallDir 'AudioSwitch.cs')`""
                if ($code -eq 0 -and (Test-Path $tmpExe)) { Move-Item $tmpExe $SwitchExe -Force } else { throw (M 'Device switcher could not be built.' 'Geräte-Umschalter konnte nicht gebaut werden.') }
            }
        }

        $needPip = ((Hash (Join-Path $InstallDir 'requirements.txt')) -ne $oldReq)
        if (-not $needPip) { & $VenvPy -c "import numpy, sounddevice, webview" 2>$null; $needPip = ($LASTEXITCODE -ne 0) }
        if ($needPip) {
            Status (M 'Updating components (internet) …' 'Aktualisiere Komponenten (Internet) …') 0.6
            $code = Run-Wait $VenvPy "-m pip install --disable-pip-version-check --prefer-binary --upgrade -r `"$(Join-Path $InstallDir 'requirements.txt')`""
            if ($code -ne 0) { throw (M 'Components could not be updated. Please check your internet connection.' 'Komponenten konnten nicht aktualisiert werden. Bitte Internetverbindung prüfen.') }
        }

        Status (M 'Checking the new version …' 'Prüfe die neue Version …') 0.8
        $chk = "import sys; sys.path.insert(0, r'$InstallDir'); import dsp, winaudio; compile(open(r'$InstallDir\app.py', encoding='utf-8').read(), 'app.py', 'exec'); compile(open(r'$InstallDir\engine.py', encoding='utf-8').read(), 'engine.py', 'exec'); compile(open(r'$InstallDir\guard.py', encoding='utf-8').read(), 'guard.py', 'exec')"
        & $VenvPy -c $chk 2>> $LogFile
        if ($LASTEXITCODE -ne 0) { throw (M 'The new version failed the self-test.' 'Die neue Version hat den Selbsttest nicht bestanden.') }

        Set-Content -Path (Join-Path $InstallDir 'installed-version.txt') -Value $NewVer -Encoding ASCII
        try { Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AureluneStudio' -Name 'DisplayVersion' -Value $NewVer } catch {}
        Remove-Item $backup -Recurse -Force -ErrorAction SilentlyContinue

        Status (M "Done – Aurelune Studio $NewVer is installed. Your settings were kept." "Fertig – Aurelune Studio $NewVer ist installiert. Deine Einstellungen bleiben erhalten.") 1
        $st.ForeColor = $C_OK
        Remove-Item $FailedFile -Force -ErrorAction SilentlyContinue
        if (-not $Background -or $wasRunning) { Start-Process -FilePath $VenvPyw -ArgumentList "`"$(Join-Path $InstallDir 'app.py')`"" -WorkingDirectory $InstallDir }
        $script:AutoClose = $true
    } catch {
        $msg = $_.Exception.Message
        Log "ERROR: $msg"
        try { Set-Content -Path $FailedFile -Value $NewVer -Encoding ASCII } catch {}
        if (Test-Path $backup) {
            Get-ChildItem -Path $backup | ForEach-Object { Copy-Item -Path $_.FullName -Destination $InstallDir -Recurse -Force }
            Log 'Rolled back to the previous version.'
        }
        $st.ForeColor = $C_ERR
        Status ((M 'Update failed – the previous version was restored. ' 'Update fehlgeschlagen – die vorherige Version wurde wiederhergestellt. ') + $msg) -1
        if ($wasRunning) { Start-Process -FilePath $VenvPyw -ArgumentList "`"$(Join-Path $InstallDir 'app.py')`"" -WorkingDirectory $InstallDir }
    } finally {
        $timer.Stop(); $shine.Visible = $false; $btn.Enabled = $true
        Start-Watcher
    }
}

$script:AutoClose = $false
$w.add_Shown({
    $timer.Start(); Pump
    Do-Update
    if ($script:AutoClose) {
        $t2 = New-Object Windows.Forms.Timer; $t2.Interval = 3500; $t2.add_Tick({ $w.Close() }); $t2.Start()
    }
})
if ($Background -and -not $appRunning) { $w.Opacity = 0; $w.ShowInTaskbar = $false }   # silent while Aurelune is closed
[void]$w.ShowDialog()
