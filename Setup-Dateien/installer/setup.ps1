# Aurelune Studio – Windows Installer (English / Deutsch)
# Detects Python, WebView2 and VB-CABLE, installs only what is missing and configures VB-CABLE.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$Version    = (Get-Content -Raw -Path (Join-Path (Split-Path -Parent $PSScriptRoot) 'app\version.txt')).Trim()
$Root       = Split-Path -Parent $PSScriptRoot
$AppSrc     = Join-Path $Root 'app'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\Aurelune Studio'
$Temp       = Join-Path $env:TEMP 'AureluneSetup'
$LogFile    = Join-Path $Temp 'setup.log'
$SwitchExe  = Join-Path $InstallDir 'AudioSwitch.exe'
$VenvPy     = Join-Path $InstallDir '.venv\Scripts\python.exe'
$VenvPyw    = Join-Path $InstallDir '.venv\Scripts\pythonw.exe'
$PyUrl      = 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe'
$CableUrls  = @('https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip',
                'https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack43.zip')
$WebView2Url = 'https://go.microsoft.com/fwlink/p/?LinkId=2124703'
$RegKey     = 'HKCU:\Software\Aurelune'
New-Item -ItemType Directory -Force -Path $Temp | Out-Null
Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue

$script:PythonExe = $null
$script:NeedReboot = $false
$script:Busy = $false
$script:Done = $false
$script:MainOut = $null

# ------------------------------------------------------------------ texts
$TXT = @{
  en = @{
    title = 'Aurelune Studio – Setup'; sub = 'Your whole PC sound in 432 Hz & Solfeggio  ·  Version {0}'
    intro = 'The installer checks what is already there and sets up only what is missing – including VB-CABLE. You do not need to do anything else.'
    s_python = 'Python 3.12'; d_python = 'Runtime for the app'
    s_webview = 'Microsoft WebView2'; d_webview = 'Renders the app window'
    s_app = 'Aurelune Studio'; d_app = 'App files & device switcher'
    s_cable = 'VB-CABLE audio driver'; d_cable = 'Install, enable & configure (48 kHz, volume, ducking)'
    s_deps = 'Audio components'; d_deps = 'numpy, sounddevice, pywebview'
    s_finish = 'Finishing'; d_finish = 'Shortcuts, autostart, uninstaller'
    cbDesktop = 'Desktop shortcut'; cbAuto = 'Start with Windows'; cbLaunch = 'Open afterwards'
    install = 'Install'; close = 'Close'; ready = 'Ready – click "Install".'; scanning = 'Checking your system …'
    loading = 'Loading …'; preparing = 'Preparing setup …'
    already = 'Already installed ({0})'; willInstall = 'Will be installed automatically'; willInstallPy = 'Will be installed automatically (about 25 MB)'
    update = 'Present – will be updated'; check = 'Checking …'; download = 'Downloading …'; installing = 'Installing …'
    installed = 'Installed ({0})'; copy = 'Copying files …'; buildSwitch = 'Building device switcher …'
    appOk = 'Installed in {0}'; appWarn = 'Installed – automatic device switching not available'
    cableInstalledCheck = 'Installed – settings will be checked'; cableWillInstall = 'Will be installed (Windows asks for permission once)'
    cableInstallUac = 'Installing & configuring – please click "Yes" in the Windows prompt …'
    cableFixUac = 'Enabling / setting 48 kHz – please click "Yes" …'
    uacStatus = 'Windows now asks ONCE for administrator rights (maybe also "Install driver?") – please confirm.'
    cableOpts = 'Volume & Windows options …'
    cableOk = 'Installed, enabled & configured ({0}) · output: {1}'; cableOkReboot = 'Installed & configured ({0}) – restart recommended'
    cableReboot = 'Installed – becomes active after a restart'; cableSkip = 'Ready ({0}, enabled, 100 %) · output: {1}'
    cableDisabled = 'VB-CABLE is disabled in Windows – it will be enabled.'
    pyOk = 'Installed (Python {0})'; pyBusy = 'Python is being installed … (about 1 minute)'
    wvWarn = 'Not confirmed – the app then uses Microsoft Edge as window'; wvSkip = 'Skipped – the app then uses Microsoft Edge as window'
    depsPrep = 'Preparing environment …'; depsLoad = 'Downloading components (about 40 MB) …'; depsOk = 'Installed'
    depsWarn = 'Installed – window module missing, app opens in Edge'
    links = 'Creating shortcuts …'; done = 'Done'
    doneReboot = 'Done! Please restart once so the audio driver becomes active.'; doneOk = 'Done! Aurelune Studio is ready.'
    btnReboot = 'Restart now'; btnOpen = 'Open Aurelune'; retry = 'Try again'; interrupted = 'Installation interrupted – you can simply try again.'
    rebootQ = 'The PC will restart now. Please save your work first.'; details = 'Details'
    e_py = 'Python could not be installed (code {0}).'; e_venv = 'The Python environment could not be created.'
    e_deps = 'The components could not be installed. Please check your internet connection.'; e_audio = 'Audio components are broken (numpy/sounddevice).'
    e_cdl = 'VB-CABLE could not be downloaded. Please check your internet connection.'; e_cpkg = 'VB-CABLE setup not found in the package.'
    e_switch = 'Device switcher missing – VB-CABLE cannot be configured.'; e_uac = 'VB-CABLE setup was cancelled (administrator permission required).'
    e_dl = 'Download of {0} incomplete.'; dl = '{0} downloading … {1:N1} / {2:N1} MB'; dl2 = '{0} downloading … {1:N1} MB'
    sm_app = 'Aurelune Studio'; sm_reset = 'Reset sound'; sm_un = 'Uninstall Aurelune'; sm_guide = 'Guide (manual setup)'
    langTitle = 'Choose your language'; langSub = 'Select the language for setup and app.'; continue = 'Continue'
  }
  de = @{
    title = 'Aurelune Studio – Installation'; sub = 'Dein ganzer PC-Sound in 432 Hz & Solfeggio  ·  Version {0}'
    intro = 'Der Installer prüft, was schon vorhanden ist, und richtet nur das Fehlende ein – inklusive VB-CABLE. Du musst nichts weiter tun.'
    s_python = 'Python 3.12'; d_python = 'Laufzeitumgebung für die App'
    s_webview = 'Microsoft WebView2'; d_webview = 'Darstellung des App-Fensters'
    s_app = 'Aurelune Studio'; d_app = 'App-Dateien & Geräte-Umschalter'
    s_cable = 'VB-CABLE Audiotreiber'; d_cable = 'Installieren, aktivieren & einstellen (48 kHz, Lautstärke, Ducking)'
    s_deps = 'Audio-Komponenten'; d_deps = 'numpy, sounddevice, pywebview'
    s_finish = 'Abschluss'; d_finish = 'Verknüpfungen, Autostart, Deinstallation'
    cbDesktop = 'Desktop-Verknüpfung'; cbAuto = 'Mit Windows starten'; cbLaunch = 'Danach öffnen'
    install = 'Installieren'; close = 'Schließen'; ready = 'Bereit – klicke auf „Installieren“.'; scanning = 'Prüfe dein System …'
    loading = 'Wird geladen …'; preparing = 'Installation wird vorbereitet …'
    already = 'Bereits installiert ({0})'; willInstall = 'Wird automatisch installiert'; willInstallPy = 'Wird automatisch installiert (ca. 25 MB)'
    update = 'Vorhanden – wird aktualisiert'; check = 'Prüfe …'; download = 'Wird heruntergeladen …'; installing = 'Wird installiert …'
    installed = 'Installiert ({0})'; copy = 'Kopiere Dateien …'; buildSwitch = 'Baue Geräte-Umschalter …'
    appOk = 'Installiert in {0}'; appWarn = 'Installiert – automatisches Geräte-Umschalten nicht verfügbar'
    cableInstalledCheck = 'Bereits installiert – Einstellungen werden geprüft'; cableWillInstall = 'Wird installiert (Windows fragt einmal nach Erlaubnis)'
    cableInstallUac = 'Installiere & richte ein – bitte im Windows-Fenster „Ja“ klicken …'
    cableFixUac = 'Aktiviere / stelle 48 kHz ein – bitte „Ja“ klicken …'
    uacStatus = 'Windows fragt jetzt EINMAL nach Administrator-Rechten (ggf. auch „Treiber installieren?“) – bitte bestätigen.'
    cableOpts = 'Lautstärke & Windows-Optionen …'
    cableOk = 'Installiert, aktiviert & eingerichtet ({0}) · Ausgabe: {1}'; cableOkReboot = 'Installiert & eingerichtet ({0}) – Neustart empfohlen'
    cableReboot = 'Installiert – wird nach einem Neustart aktiv'; cableSkip = 'Bereit ({0}, aktiviert, 100 %) · Ausgabe: {1}'
    cableDisabled = 'VB-CABLE ist in Windows deaktiviert – wird aktiviert.'
    pyOk = 'Installiert (Python {0})'; pyBusy = 'Python wird installiert … (ca. 1 Minute)'
    wvWarn = 'Nicht bestätigt – App nutzt dann Microsoft Edge als Fenster'; wvSkip = 'Übersprungen – App nutzt dann Microsoft Edge als Fenster'
    depsPrep = 'Bereite Umgebung vor …'; depsLoad = 'Lade Komponenten (ca. 40 MB) …'; depsOk = 'Installiert'
    depsWarn = 'Installiert – Fenster-Modul fehlt, App öffnet sich in Edge'
    links = 'Erstelle Verknüpfungen …'; done = 'Fertig'
    doneReboot = 'Fertig! Bitte einmal neu starten, damit der Audiotreiber aktiv wird.'; doneOk = 'Fertig! Aurelune Studio ist bereit.'
    btnReboot = 'Jetzt neu starten'; btnOpen = 'Aurelune öffnen'; retry = 'Erneut versuchen'; interrupted = 'Installation unterbrochen – du kannst es einfach erneut versuchen.'
    rebootQ = 'Der PC wird jetzt neu gestartet. Bitte vorher alles speichern.'; details = 'Details'
    e_py = 'Python konnte nicht installiert werden (Code {0}).'; e_venv = 'Die Python-Umgebung konnte nicht erstellt werden.'
    e_deps = 'Die Komponenten konnten nicht installiert werden. Bitte Internetverbindung prüfen.'; e_audio = 'Audio-Komponenten fehlerhaft (numpy/sounddevice).'
    e_cdl = 'VB-CABLE konnte nicht heruntergeladen werden. Bitte Internetverbindung prüfen.'; e_cpkg = 'VB-CABLE Setup nicht im Paket gefunden.'
    e_switch = 'Geräte-Umschalter fehlt – VB-CABLE kann nicht eingerichtet werden.'; e_uac = 'Die Einrichtung von VB-CABLE wurde abgebrochen (Administrator-Erlaubnis nötig).'
    e_dl = 'Download von {0} unvollständig.'; dl = '{0} herunterladen … {1:N1} / {2:N1} MB'; dl2 = '{0} herunterladen … {1:N1} MB'
    sm_app = 'Aurelune Studio'; sm_reset = 'Ton zurücksetzen'; sm_un = 'Aurelune deinstallieren'; sm_guide = 'Anleitung (manuelle Einrichtung)'
    langTitle = 'Sprache wählen'; langSub = 'Wähle die Sprache für Installation und App.'; continue = 'Weiter'
  }
}
$script:Lang = 'en'
function T([string]$k) {
    $v = $TXT[$script:Lang][$k]
    if ($null -eq $v) { $v = $TXT['en'][$k] }
    if ($null -eq $v) { $v = $k }
    if ($args.Count -gt 0) { return ($v -f $args) }
    return $v
}

# ------------------------------------------------------------------ colours / helpers
$C_BG    = [Drawing.Color]::FromArgb(14, 12, 22)
$C_CARD  = [Drawing.Color]::FromArgb(26, 23, 38)
$C_FG    = [Drawing.Color]::FromArgb(243, 240, 251)
$C_MUT   = [Drawing.Color]::FromArgb(163, 158, 184)
$C_ACC   = [Drawing.Color]::FromArgb(245, 185, 113)
$C_ACC2  = [Drawing.Color]::FromArgb(139, 108, 255)
$C_OK    = [Drawing.Color]::FromArgb(109, 255, 168)
$C_WARN  = [Drawing.Color]::FromArgb(255, 207, 92)
$C_ERR   = [Drawing.Color]::FromArgb(255, 110, 130)
$IconPath = Join-Path $AppSrc 'aurelune.ico'
$LogoPath = Join-Path $AppSrc 'ui\icon.png'
function Pump { [System.Windows.Forms.Application]::DoEvents() }
function New-Label($text, $x, $y, $w, $h, $size, $bold, $color) {
    $l = New-Object Windows.Forms.Label
    $l.Text = $text; $l.SetBounds($x, $y, $w, $h); $l.BackColor = [Drawing.Color]::Transparent
    $fam = 'Segoe UI'; if ($bold) { $fam = 'Segoe UI Semibold' }
    $l.Font = New-Object Drawing.Font($fam, $size); if ($color) { $l.ForeColor = $color }
    return $l
}
function New-Logo($x, $y, $s) {
    $p = New-Object Windows.Forms.PictureBox
    $p.SetBounds($x, $y, $s, $s); $p.SizeMode = 'Zoom'; $p.BackColor = [Drawing.Color]::Transparent
    try { $p.Image = [Drawing.Image]::FromFile($LogoPath) } catch {}
    return $p
}

# ------------------------------------------------------------------ 1) language selection
$prevLang = $null
try { $prevLang = (Get-ItemProperty -Path $RegKey -ErrorAction Stop).Language } catch {}
$lf = New-Object Windows.Forms.Form
$lf.Text = 'Aurelune Studio'; $lf.ClientSize = New-Object Drawing.Size(420, 330); $lf.StartPosition = 'CenterScreen'
$lf.FormBorderStyle = 'FixedSingle'; $lf.MaximizeBox = $false; $lf.MinimizeBox = $false; $lf.BackColor = $C_BG; $lf.ForeColor = $C_FG
$lf.Font = New-Object Drawing.Font('Segoe UI', 10)
try { $lf.Icon = New-Object Drawing.Icon $IconPath } catch {}
$lf.Controls.Add((New-Logo 175 22 70))
$lfTitle = New-Label 'Choose your language' 20 100 380 34 15 $true $C_FG; $lfTitle.TextAlign = 'MiddleCenter'; $lf.Controls.Add($lfTitle)
$lfSub = New-Label 'Select the language for setup and app.' 20 134 380 22 9.5 $false $C_MUT; $lfSub.TextAlign = 'MiddleCenter'; $lf.Controls.Add($lfSub)
$langBtns = @{}
$bx = 40
foreach ($code in @('en', 'de')) {
    $b = New-Object Windows.Forms.Button
    $b.SetBounds($bx, 172, 160, 64); $b.FlatStyle = 'Flat'; $b.Cursor = 'Hand'; $b.Tag = $code
    if ($code -eq 'en') { $b.Text = "English" } else { $b.Text = "Deutsch" }
    $b.Font = New-Object Drawing.Font('Segoe UI Semibold', 12)
    $b.ForeColor = $C_FG; $b.BackColor = $C_CARD; $b.FlatAppearance.BorderSize = 2; $b.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(60, 55, 80)
    $lf.Controls.Add($b); $langBtns[$code] = $b; $bx += 180
}
function Select-Lang([string]$code) {
    $script:Lang = $code
    foreach ($k in $langBtns.Keys) {
        if ($k -eq $code) { $langBtns[$k].FlatAppearance.BorderColor = $C_ACC; $langBtns[$k].BackColor = [Drawing.Color]::FromArgb(48, 38, 52) }
        else { $langBtns[$k].FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(60, 55, 80); $langBtns[$k].BackColor = $C_CARD }
    }
    $lfTitle.Text = T 'langTitle'; $lfSub.Text = T 'langSub'; $lfGo.Text = T 'continue'
}
$lfGo = New-Object Windows.Forms.Button
$lfGo.SetBounds(110, 262, 200, 44); $lfGo.FlatStyle = 'Flat'; $lfGo.FlatAppearance.BorderSize = 0; $lfGo.BackColor = $C_ACC
$lfGo.ForeColor = [Drawing.Color]::FromArgb(26, 18, 34); $lfGo.Font = New-Object Drawing.Font('Segoe UI Semibold', 11); $lfGo.Cursor = 'Hand'
$lfGo.Text = 'Continue'; $lfGo.DialogResult = 'OK'
$lf.Controls.Add($lfGo); $lf.AcceptButton = $lfGo
foreach ($k in $langBtns.Keys) { $langBtns[$k].add_Click({ param($s, $e) Select-Lang $s.Tag }) }
$langBtns['en'].add_DoubleClick({ $lf.DialogResult = 'OK' }); $langBtns['de'].add_DoubleClick({ $lf.DialogResult = 'OK' })
if ($prevLang -eq 'de') { Select-Lang 'de' } else { Select-Lang 'en' }   # default: English
$lf.add_Shown({ $lf.Activate(); $lfGo.Focus() })
if ($lf.ShowDialog() -ne 'OK') { exit 0 }
$lf.Dispose()
try { if (-not (Test-Path $RegKey)) { New-Item -Path $RegKey -Force | Out-Null }; Set-ItemProperty -Path $RegKey -Name 'Language' -Value $script:Lang } catch {}

# ------------------------------------------------------------------ 2) loading screen
$splash = New-Object Windows.Forms.Form
$splash.FormBorderStyle = 'None'; $splash.ClientSize = New-Object Drawing.Size(460, 280); $splash.StartPosition = 'CenterScreen'
$splash.BackColor = $C_BG; $splash.ShowInTaskbar = $true; $splash.Text = 'Aurelune Studio'; $splash.TopMost = $true
try { $splash.Icon = New-Object Drawing.Icon $IconPath } catch {}
$splash.add_Paint({
    param($s, $e)
    $r = $s.ClientRectangle
    $b = New-Object Drawing.Drawing2D.LinearGradientBrush($r, [Drawing.Color]::FromArgb(40, 28, 78), [Drawing.Color]::FromArgb(70, 44, 30), [single]35)
    $e.Graphics.FillRectangle($b, $r); $b.Dispose()
    $pen = New-Object Drawing.Pen([Drawing.Color]::FromArgb(70, 255, 255, 255)); $e.Graphics.DrawRectangle($pen, 0, 0, $r.Width - 1, $r.Height - 1); $pen.Dispose()
})
$splash.Controls.Add((New-Logo 190 36 80))
$spT = New-Label 'Aurelune Studio' 20 124 420 40 20 $true ([Drawing.Color]::White); $spT.TextAlign = 'MiddleCenter'; $splash.Controls.Add($spT)
$spS = New-Label (T 'loading') 20 166 420 24 10 $false ([Drawing.Color]::FromArgb(225, 218, 240)); $spS.TextAlign = 'MiddleCenter'; $splash.Controls.Add($spS)
$spTrack = New-Object Windows.Forms.Panel; $spTrack.SetBounds(80, 210, 300, 6); $spTrack.BackColor = [Drawing.Color]::FromArgb(88, 72, 112)
$spBlock = New-Object Windows.Forms.Panel; $spBlock.SetBounds(-90, 0, 90, 6); $spBlock.BackColor = $C_ACC
$spTrack.Controls.Add($spBlock); $splash.Controls.Add($spTrack)
$spV = New-Label "v$Version" 20 244 420 20 8.5 $false ([Drawing.Color]::FromArgb(170, 160, 190)); $spV.TextAlign = 'MiddleCenter'; $splash.Controls.Add($spV)
$spTimer = New-Object Windows.Forms.Timer; $spTimer.Interval = 16
$spTimer.add_Tick({ $x = $spBlock.Left + 6; if ($x -gt 300) { $x = -90 }; $spBlock.Left = $x })
$spTimer.Start()
$splash.Show(); Pump
function Splash([string]$m) { $spS.Text = $m; Pump }
Splash (T 'preparing')

# ------------------------------------------------------------------ 3) main window
$form = New-Object Windows.Forms.Form
$form.Text = T 'title'
$form.ClientSize = New-Object Drawing.Size(560, 690)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.BackColor = $C_BG
$form.ForeColor = $C_FG
$form.Font = New-Object Drawing.Font('Segoe UI', 10)
try { $form.Icon = New-Object Drawing.Icon $IconPath } catch {}

$hdr = New-Object Windows.Forms.Panel
$hdr.SetBounds(0, 0, 560, 130)
$hdr.add_Paint({
    param($s, $e)
    $r = $s.ClientRectangle
    $b = New-Object Drawing.Drawing2D.LinearGradientBrush($r, [Drawing.Color]::FromArgb(88, 62, 160), [Drawing.Color]::FromArgb(176, 112, 64), [single]15)
    $e.Graphics.FillRectangle($b, $r); $b.Dispose()
})
$form.Controls.Add($hdr)
$hdr.Controls.Add((New-Logo 28 30 70))
$hdr.Controls.Add((New-Label 'Aurelune Studio' 112 28 420 44 22 $true ([Drawing.Color]::White)))
$hdr.Controls.Add((New-Label (T 'sub' $Version) 115 74 430 24 10 $false ([Drawing.Color]::FromArgb(235, 228, 250))))
Pump

$form.Controls.Add((New-Label (T 'intro') 28 142 504 42 10 $false $C_MUT))

$stepsPanel = New-Object Windows.Forms.Panel
$stepsPanel.SetBounds(24, 190, 512, 288); $stepsPanel.BackColor = $C_CARD
$form.Controls.Add($stepsPanel)

$stepKeys = @('python', 'webview', 'app', 'cable', 'deps', 'finish')
$rows = @{}
$y = 12
foreach ($k in $stepKeys) {
    $g = New-Object Windows.Forms.Label
    $g.SetBounds(16, $y, 30, 30); $g.Font = New-Object Drawing.Font('Segoe UI Symbol', 14); $g.ForeColor = $C_MUT; $g.Text = '○'
    $tl = New-Label (T "s_$k") 52 ($y - 1) 440 22 10.5 $true $C_FG
    $d = New-Label (T "d_$k") 52 ($y + 20) 450 20 9 $false $C_MUT
    $stepsPanel.Controls.AddRange(@($g, $tl, $d))
    $rows[$k] = @{ g = $g; d = $d }
    $y += 46
}

$cbDesktop = New-Object Windows.Forms.CheckBox
$cbDesktop.Text = T 'cbDesktop'; $cbDesktop.Checked = $true; $cbDesktop.SetBounds(28, 488, 200, 24)
$cbAuto = New-Object Windows.Forms.CheckBox
$cbAuto.Text = T 'cbAuto'; $cbAuto.Checked = $true; $cbAuto.SetBounds(232, 488, 180, 24)
$cbLaunch = New-Object Windows.Forms.CheckBox
$cbLaunch.Text = T 'cbLaunch'; $cbLaunch.Checked = $true; $cbLaunch.SetBounds(412, 488, 130, 24)
$form.Controls.AddRange(@($cbDesktop, $cbAuto, $cbLaunch))

$barBg = New-Object Windows.Forms.Panel
$barBg.SetBounds(28, 522, 504, 8); $barBg.BackColor = [Drawing.Color]::FromArgb(40, 36, 56)
$bar = New-Object Windows.Forms.Panel
$bar.SetBounds(0, 0, 0, 8); $bar.BackColor = $C_ACC
$shine = New-Object Windows.Forms.Panel
$shine.SetBounds(-60, 0, 60, 8); $shine.BackColor = [Drawing.Color]::FromArgb(255, 226, 180); $shine.Visible = $false
$barBg.Controls.Add($shine); $barBg.Controls.Add($bar); $form.Controls.Add($barBg)
$shine.BringToFront()
# animated "working" shimmer so the window never looks frozen
$busyTimer = New-Object Windows.Forms.Timer; $busyTimer.Interval = 20
$busyTimer.add_Tick({ $x = $shine.Left + 7; if ($x -gt 504) { $x = -60 }; $shine.Left = $x })

$statusLbl = New-Label (T 'scanning') 28 536 504 22 10 $false $C_MUT
$form.Controls.Add($statusLbl)

$logBox = New-Object Windows.Forms.TextBox
$logBox.Multiline = $true; $logBox.ReadOnly = $true; $logBox.ScrollBars = 'Vertical'
$logBox.SetBounds(28, 562, 504, 60); $logBox.BackColor = [Drawing.Color]::FromArgb(20, 18, 30); $logBox.ForeColor = $C_MUT
$logBox.BorderStyle = 'None'; $logBox.Font = New-Object Drawing.Font('Consolas', 8.5)
$form.Controls.Add($logBox)

$btn = New-Object Windows.Forms.Button
$btn.Text = T 'install'; $btn.SetBounds(332, 634, 200, 42)
$btn.FlatStyle = 'Flat'; $btn.FlatAppearance.BorderSize = 0; $btn.BackColor = $C_ACC; $btn.ForeColor = [Drawing.Color]::FromArgb(26, 18, 34)
$btn.Font = New-Object Drawing.Font('Segoe UI Semibold', 11); $btn.Cursor = 'Hand'
$form.Controls.Add($btn)
$btnClose = New-Object Windows.Forms.Button
$btnClose.Text = T 'close'; $btnClose.SetBounds(212, 634, 110, 42)
$btnClose.FlatStyle = 'Flat'; $btnClose.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(60, 55, 80); $btnClose.ForeColor = $C_FG
$btnClose.add_Click({ $form.Close() })
$form.Controls.Add($btnClose)
Pump

function Log([string]$m) {
    $line = (Get-Date -Format 'HH:mm:ss') + '  ' + $m
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    $logBox.AppendText($line + "`r`n"); Pump
}
function Status([string]$m) { $statusLbl.Text = $m; Pump }
function Progress([double]$p) { $bar.Width = [int](504 * [Math]::Min(1, [Math]::Max(0, $p))); Pump }
function Step([string]$key, [string]$state, [string]$detail) {
    $r = $rows[$key]
    switch ($state) {
        'run'  { $r.g.Text = '◉'; $r.g.ForeColor = $C_ACC }
        'ok'   { $r.g.Text = '✔'; $r.g.ForeColor = $C_OK }
        'skip' { $r.g.Text = '✔'; $r.g.ForeColor = [Drawing.Color]::FromArgb(120, 210, 200) }
        'warn' { $r.g.Text = '!'; $r.g.ForeColor = $C_WARN }
        'err'  { $r.g.Text = '✖'; $r.g.ForeColor = $C_ERR }
        default { $r.g.Text = '○'; $r.g.ForeColor = $C_MUT }
    }
    if ($detail) { $r.d.Text = $detail }
    Pump
}

function Run-Wait([string]$file, [string]$arguments, [switch]$Elevate, [string]$tailLabel) {
    Log "> $([IO.Path]::GetFileName($file)) $arguments"
    $out = $null
    if ($Elevate) {
        $p = Start-Process -FilePath $file -ArgumentList $arguments -Verb RunAs -PassThru
    } else {
        $out = Join-Path $Temp ('proc_' + [guid]::NewGuid().ToString('N') + '.log')
        $p = Start-Process -FilePath $file -ArgumentList $arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError ($out + '.err')
    }
    $null = $p.Handle
    while (-not $p.HasExited) {
        if ($tailLabel -and $out -and (Test-Path $out)) {
            try {
                $last = Get-Content -Path $out -Tail 1 -ErrorAction Stop
                if ($last) { $tt = "$last".Trim(); if ($tt.Length -gt 70) { $tt = $tt.Substring(0, 70) + '…' }; Status "$tailLabel  $tt" }
            } catch {}
        }
        Pump; Start-Sleep -Milliseconds 40
    }
    $p.WaitForExit()
    if ($out -and (Test-Path $out)) {
        Get-Content $out -ErrorAction SilentlyContinue | Add-Content -Path $LogFile -Encoding UTF8
        Get-Content ($out + '.err') -ErrorAction SilentlyContinue | Add-Content -Path $LogFile -Encoding UTF8
    }
    Log "  Exit-Code $($p.ExitCode)"
    return $p.ExitCode
}

function Download([string]$url, [string]$dest, [string]$label) {
    Log "GET $url"
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AureluneSetup'
    $req.AllowAutoRedirect = $true
    $req.Timeout = 30000
    $resp = $req.GetResponse()
    $total = $resp.ContentLength
    $in = $resp.GetResponseStream()
    $fs = [IO.File]::Create($dest)
    $buf = New-Object byte[] 131072
    $sum = 0; $tick = 0
    try {
        while (($n = $in.Read($buf, 0, $buf.Length)) -gt 0) {
            $fs.Write($buf, 0, $n); $sum += $n
            if ((++$tick % 6) -eq 0) {
                if ($total -gt 0) { Status (T 'dl' $label ($sum / 1MB) ($total / 1MB)) }
                else { Status (T 'dl2' $label ($sum / 1MB)) }
            }
        }
    } finally { $fs.Close(); $in.Close(); $resp.Close() }
    if ($sum -lt 10000) { throw (T 'e_dl' $label) }
}

# ------------------------------------------------------------------ detection
function Test-Py([string]$exe, [string[]]$pre) {
    try {
        $code = "import sys;print('%d.%d|%s' % (sys.version_info[0], sys.version_info[1], sys.executable))"
        $out = & $exe @pre -c $code 2>$null | Select-Object -Last 1
        if ($LASTEXITCODE -eq 0 -and "$out" -match '^(\d+)\.(\d+)\|(.+)$') {
            $maj = [int]$Matches[1]; $min = [int]$Matches[2]
            if ($maj -eq 3 -and $min -ge 10 -and $min -le 13) { return @{ exe = $Matches[3].Trim(); ver = "$maj.$min" } }
        }
    } catch {}
    return $null
}
function Find-Python {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        foreach ($v in '3.12', '3.11', '3.13', '3.10') { $r = Test-Py 'py' @("-$v"); if ($r) { return $r }; Pump }
    }
    $dirs = @("$env:LOCALAPPDATA\Programs\Python\Python312", "$env:LOCALAPPDATA\Programs\Python\Python311", "$env:LOCALAPPDATA\Programs\Python\Python313",
              "$env:ProgramFiles\Python312", "$env:ProgramFiles\Python311", "$env:ProgramFiles\Python313", "$env:LOCALAPPDATA\Programs\Python\Python310")
    foreach ($d in $dirs) { $e = Join-Path $d 'python.exe'; if (Test-Path $e) { $r = Test-Py $e @(); if ($r) { return $r } } }
    $c = Get-Command python -ErrorAction SilentlyContinue
    if ($c -and $c.Source -notlike '*WindowsApps*') { $r = Test-Py $c.Source @(); if ($r) { return $r } }
    return $null
}
function Test-WebView2 {
    $id = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    foreach ($k in @("HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\$id", "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\$id", "HKCU:\Software\Microsoft\EdgeUpdate\Clients\$id")) {
        try { $pv = (Get-ItemProperty -Path $k -ErrorAction Stop).pv; if ($pv -and $pv -ne '0.0.0.0') { return $pv } } catch {}
    }
    return $null
}
function Test-Cable {
    # driver present? (registry is fast and also finds disabled devices)
    try {
        $cls = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e96c-e325-11ce-bfc1-08002be10318}'
        $hit = Get-ChildItem $cls -ErrorAction SilentlyContinue | ForEach-Object { (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DriverDesc } | Where-Object { $_ -match 'VB-Audio' -and $_ -match 'Cable' }
        if ($hit) { return $true }
    } catch {}
    Pump
    try {
        $d = Get-CimInstance -ClassName Win32_SoundDevice -ErrorAction Stop | Where-Object { $_.Name -match 'VB-Audio' -and $_.Name -match 'CABLE' }
        if ($d) { return $true }
    } catch {}
    if (Get-CableEndpoints) { return $true }
    return $false
}
# all CABLE endpoints in all states (needs AudioSwitch): flow, state (1 active, 2 disabled, 4 not present, 8 unplugged)
function Get-CableEndpoints {
    $res = @()
    if (-not (Test-Path $SwitchExe)) { return $res }
    try {
        foreach ($l in @(& $SwitchExe devices 2>$null)) {
            $p = "$l" -split "`t"
            if ($p.Count -ge 6 -and $p[3] -eq '1') { $res += @{ flow = $p[0]; state = [int]$p[1]; id = $p[4]; name = $p[5] } }
        }
    } catch {}
    return $res
}
function Get-DefaultOutput {
    if (-not (Test-Path $SwitchExe)) { return $null }
    try {
        foreach ($l in (& $SwitchExe list 2>$null)) { $p = "$l" -split "`t"; if ($p.Count -ge 3 -and $p[2].Trim() -eq '1') { return @{ id = $p[0]; name = $p[1] } } }
    } catch {}
    return $null
}
function Is-Cable([string]$n) { $l = "$n".ToLower(); return ($l.Contains('cable') -and ($l.Contains('vb-audio') -or $l.StartsWith('cable'))) }
function Get-RealOutputs {
    $res = @()
    if (-not (Test-Path $SwitchExe)) { return $res }
    foreach ($l in (& $SwitchExe list 2>$null)) { $p = "$l" -split "`t"; if ($p.Count -ge 3 -and -not (Is-Cable $p[1])) { $res += @{ id = $p[0]; name = $p[1] } } }
    return $res
}

function Scan {
    Splash (T 'scanning')
    $py = Find-Python
    if ($py) { $script:PythonExe = $py.exe; Step 'python' 'skip' (T 'already' "Python $($py.ver)") } else { Step 'python' 'wait' (T 'willInstallPy') }
    Splash ((T 'scanning') + '  WebView2')
    $wv = Test-WebView2
    if ($wv) { Step 'webview' 'skip' (T 'already' $wv) } else { Step 'webview' 'wait' (T 'willInstall') }
    if (Test-Path (Join-Path $InstallDir 'app.py')) { Step 'app' 'wait' (T 'update') }
    Splash ((T 'scanning') + '  VB-CABLE')
    if (Test-Cable) {
        $eps = @(Get-CableEndpoints)
        if ($eps | Where-Object { $_.state -eq 2 }) { Step 'cable' 'warn' (T 'cableDisabled') } else { Step 'cable' 'skip' (T 'cableInstalledCheck') }
    } else { Step 'cable' 'wait' (T 'cableWillInstall') }
    if (Test-Path $VenvPy) { Step 'deps' 'wait' (T 'update') }
}

# ------------------------------------------------------------------ install steps
function Install-Python {
    Step 'python' 'run' (T 'check')
    $py = Find-Python
    if ($py) { $script:PythonExe = $py.exe; Step 'python' 'skip' (T 'already' "Python $($py.ver)"); return }
    $f = Join-Path $Temp 'python-3.12.10-amd64.exe'
    Step 'python' 'run' (T 'download')
    Download $PyUrl $f 'Python'
    Step 'python' 'run' (T 'installing'); Status (T 'pyBusy')
    $code = Run-Wait $f '/quiet InstallAllUsers=0 PrependPath=1 Include_launcher=1 InstallLauncherAllUsers=0 Include_test=0 Include_doc=0 Shortcuts=0'
    $py = Find-Python
    if (-not $py) { throw (T 'e_py' $code) }
    $script:PythonExe = $py.exe
    Step 'python' 'ok' (T 'pyOk' $py.ver)
}

function Install-WebView2 {
    Step 'webview' 'run' (T 'check')
    $wv = Test-WebView2
    if ($wv) { Step 'webview' 'skip' (T 'already' $wv); return }
    try {
        $f = Join-Path $Temp 'MicrosoftEdgeWebview2Setup.exe'
        Download $WebView2Url $f 'WebView2'
        Step 'webview' 'run' (T 'installing')
        Run-Wait $f '/silent /install' | Out-Null
        $wv = Test-WebView2
        if ($wv) { Step 'webview' 'ok' (T 'installed' $wv) } else { Step 'webview' 'warn' (T 'wvWarn') }
    } catch { Log $_.Exception.Message; Step 'webview' 'warn' (T 'wvSkip') }
}

function Stop-RunningApp {
    try {
        Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" -ErrorAction Stop |
            Where-Object { $_.CommandLine -like "*Aurelune Studio*" } |
            ForEach-Object { Log "Stop running app (PID $($_.ProcessId))"; Invoke-CimMethod -InputObject $_ -MethodName Terminate | Out-Null }
        Start-Sleep -Milliseconds 600
    } catch {}
}

function Install-AppFiles {
    Step 'app' 'run' (T 'copy')
    Stop-RunningApp
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    Get-ChildItem -Path $AppSrc | Where-Object { $_.Name -ne '__pycache__' } | ForEach-Object { Copy-Item -Path $_.FullName -Destination $InstallDir -Recurse -Force; Pump }
    Copy-Item -Path (Join-Path $PSScriptRoot 'uninstall.ps1') -Destination $InstallDir -Force
    $upd = Join-Path $PSScriptRoot 'update.ps1'; if (Test-Path $upd) { Copy-Item -Path $upd -Destination $InstallDir -Force }
    Set-Content -Path (Join-Path $InstallDir 'installed-version.txt') -Value $Version -Encoding ASCII
    foreach ($rd in @('MANUAL-SETUP.txt', 'MANUELLE-EINRICHTUNG.txt')) { $f = Join-Path $Root $rd; if (Test-Path $f) { Copy-Item -Path $f -Destination $InstallDir -Force } }
    Step 'app' 'run' (T 'buildSwitch')
    $csc = @("$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe", "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
    $ok = $false
    if ($csc) {
        if (Test-Path $SwitchExe) { Remove-Item $SwitchExe -Force -ErrorAction SilentlyContinue }
        $code = Run-Wait $csc "/nologo /optimize+ /target:exe /platform:anycpu /out:`"$SwitchExe`" `"$(Join-Path $InstallDir 'AudioSwitch.cs')`""
        $ok = ($code -eq 0) -and (Test-Path $SwitchExe)
    }
    if ($ok) { Step 'app' 'ok' (T 'appOk' $InstallDir) }
    else { Step 'app' 'warn' (T 'appWarn') }
}

function Get-CableStatus {
    $res = @()
    if (-not (Test-Path $SwitchExe)) { return $res }
    foreach ($l in @(& $SwitchExe cable-status 2>$null)) { $p = "$l" -split "`t"; if ($p.Count -ge 4) { $res += @{ flow = $p[0]; name = $p[1]; rate = [int]$p[2]; bits = [int]$p[3] } } }
    return $res
}

function Install-Cable {
    Step 'cable' 'run' (T 'check')
    $before = Get-DefaultOutput
    if ($before) { Log "Default output before setup: $($before.name)" }
    $installed = Test-Cable
    $setupExe = $null
    if (-not $installed) {
        $zip = Join-Path $Temp 'vbcable.zip'
        $got = $false
        foreach ($u in $CableUrls) { try { Step 'cable' 'run' (T 'download'); Download $u $zip 'VB-CABLE'; $got = $true; break } catch { Log $_.Exception.Message } }
        if (-not $got) { throw (T 'e_cdl') }
        $dir = Join-Path $Temp 'vbcable'
        if (Test-Path $dir) { Remove-Item $dir -Recurse -Force }
        Expand-Archive -Path $zip -DestinationPath $dir -Force
        $name = 'VBCABLE_Setup_x64.exe'
        if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -and (Get-ChildItem -Path $dir -Recurse -Filter 'VBCABLE_Setup_arm64.exe')) { $name = 'VBCABLE_Setup_arm64.exe' }
        elseif (-not [Environment]::Is64BitOperatingSystem) { $name = 'VBCABLE_Setup.exe' }
        $f = Get-ChildItem -Path $dir -Recurse -Filter $name | Select-Object -First 1
        if (-not $f) { throw (T 'e_cpkg') }
        $setupExe = $f.FullName
        $keep = Join-Path $InstallDir 'vbcable'
        New-Item -ItemType Directory -Force -Path $keep | Out-Null
        Copy-Item -Path (Join-Path $f.DirectoryName '*') -Destination $keep -Recurse -Force -ErrorAction SilentlyContinue
    }
    # is it enabled and at 48 kHz?
    $eps = @(Get-CableEndpoints)
    $disabled = @($eps | Where-Object { $_.state -eq 2 }).Count -gt 0
    if ($disabled) { Log 'VB-CABLE endpoints are disabled in Windows -> will be enabled' }
    $st = @(Get-CableStatus)
    $formatOk = $installed -and $st.Count -ge 2 -and -not ($st | Where-Object { $_.rate -ne 48000 })
    if ($setupExe -or $disabled -or -not $formatOk) {
        if (-not (Test-Path $SwitchExe)) { throw (T 'e_switch') }
        if ($setupExe) { Step 'cable' 'run' (T 'cableInstallUac') } else { Step 'cable' 'run' (T 'cableFixUac') }
        Status (T 'uacStatus')
        $adminLog = Join-Path $Temp 'admin.log'
        $a = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$(Join-Path $PSScriptRoot 'elevated.ps1')`" -SwitchExe `"$SwitchExe`" -LogFile `"$adminLog`""
        if ($setupExe) { $a += " -CableSetup `"$setupExe`"" }
        try { Run-Wait "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" $a -Elevate | Out-Null }
        catch { throw (T 'e_uac') }
        if (Test-Path $adminLog) { Get-Content $adminLog | ForEach-Object { Log $_ }; Remove-Item $adminLog -Force -ErrorAction SilentlyContinue }
    }
    Step 'cable' 'run' (T 'cableOpts')
    $found = $false
    for ($i = 0; $i -lt 30; $i++) { if (@(Get-CableStatus).Count -ge 2) { $found = $true; break }; for ($j = 0; $j -lt 6; $j++) { Pump; Start-Sleep -Milliseconds 80 } }
    if ($found) { & $SwitchExe cable-volume | ForEach-Object { Log "Volume 100 %: $_" } }
    # Windows must not lower the volume during calls / Discord
    try { $ak = 'HKCU:\Software\Microsoft\Multimedia\Audio'; if (-not (Test-Path $ak)) { New-Item -Path $ak | Out-Null }; Set-ItemProperty -Path $ak -Name 'UserDuckingPreference' -Value 3 -Type DWord } catch {}
    # main speaker for Aurelune = the device that was the Windows default (e.g. "SteelSeries Sonar - Gaming")
    $main = $null
    if ($before -and -not (Is-Cable $before.name)) { $main = $before }
    else {
        $reals = @(Get-RealOutputs)
        $main = $reals | Where-Object { $_.name -match 'Sonar' -and $_.name -match 'Gaming' } | Select-Object -First 1
        if (-not $main -and $reals.Count) { $main = $reals[0] }
    }
    if ($main -and (Test-Path $SwitchExe)) { & $SwitchExe set $main.id | Out-Null; Log "Main speaker: $($main.name)" }
    $script:MainOut = $main
    $mainName = '–'; if ($main) { $mainName = $main.name }
    $st = @(Get-CableStatus)
    $desc = ($st | ForEach-Object { "$($_.rate / 1000) kHz" } | Select-Object -Unique) -join ', '
    $eps = @(Get-CableEndpoints)
    $active = @($eps | Where-Object { $_.state -eq 1 }).Count -ge 2
    if ($setupExe -or -not $active) {
        if ($found -and $active) { Step 'cable' 'ok' (T 'cableOk' $desc $mainName); if ($setupExe) { $script:NeedReboot = $true } }
        else { $script:NeedReboot = $true; Step 'cable' 'warn' (T 'cableReboot') }
    } else {
        Step 'cable' 'skip' (T 'cableSkip' $desc $mainName)
    }
}

function Install-Deps {
    Step 'deps' 'run' (T 'depsPrep')
    $needNew = -not (Test-Path $VenvPy)
    if (-not $needNew) {
        & $VenvPy -c "import sys" 2>$null
        if ($LASTEXITCODE -ne 0) { $needNew = $true; Remove-Item (Join-Path $InstallDir '.venv') -Recurse -Force -ErrorAction SilentlyContinue }
    }
    if ($needNew) {
        $code = Run-Wait $script:PythonExe "-m venv `"$(Join-Path $InstallDir '.venv')`""
        if ($code -ne 0 -or -not (Test-Path $VenvPy)) { throw (T 'e_venv') }
    }
    Step 'deps' 'run' (T 'depsLoad')
    Run-Wait $VenvPy '-m pip install --disable-pip-version-check --upgrade pip' -tailLabel 'pip:' | Out-Null
    $code = Run-Wait $VenvPy "-m pip install --disable-pip-version-check --prefer-binary --upgrade -r `"$(Join-Path $InstallDir 'requirements.txt')`"" -tailLabel 'pip:'
    if ($code -ne 0) { throw (T 'e_deps') }
    & $VenvPy -c "import numpy, sounddevice" 2>$null
    if ($LASTEXITCODE -ne 0) { throw (T 'e_audio') }
    & $VenvPy -c "import webview, clr" 2>$null
    if ($LASTEXITCODE -ne 0) { Step 'deps' 'warn' (T 'depsWarn'); return }
    Step 'deps' 'ok' (T 'depsOk')
}

function New-Shortcut([string]$path, [string]$target, [string]$arguments, [string]$desc) {
    $ws = New-Object -ComObject WScript.Shell
    $l = $ws.CreateShortcut($path)
    $l.TargetPath = $target; $l.Arguments = $arguments; $l.WorkingDirectory = $InstallDir
    $l.IconLocation = (Join-Path $InstallDir 'aurelune.ico') + ',0'; $l.Description = $desc
    $l.Save()
}

function Write-AppSettings {
    $cfgDir = Join-Path $env:USERPROFILE '.aurelune'
    $cfg = Join-Path $cfgDir 'settings.json'
    New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
    $o = $null
    if (Test-Path $cfg) { try { $o = Get-Content -Raw -Path $cfg -Encoding UTF8 | ConvertFrom-Json } catch { $o = $null } }
    if (-not $o) { $o = New-Object PSObject -Property @{ power = $true; device_mode = 'auto'; out_choice = 'auto' }; $o | Add-Member -NotePropertyName ui -NotePropertyValue (New-Object PSObject -Property @{ presetHz = 432 }) }
    $o | Add-Member -NotePropertyName lang -NotePropertyValue $script:Lang -Force
    if ($script:MainOut) { $o | Add-Member -NotePropertyName real_out -NotePropertyValue (New-Object PSObject -Property @{ id = $script:MainOut.id; name = $script:MainOut.name; default = $true }) -Force }
    [IO.File]::WriteAllText($cfg, ($o | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding($false)))
    if ($script:MainOut) { [IO.File]::WriteAllText((Join-Path $cfgDir 'real_device.txt'), $script:MainOut.id, (New-Object Text.UTF8Encoding($false))) }
}

function Install-Finish {
    Step 'finish' 'run' (T 'links')
    $appArgs = "`"$(Join-Path $InstallDir 'app.py')`""
    $menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Aurelune Studio'
    if (Test-Path $menu) { Remove-Item (Join-Path $menu '*.lnk') -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Force -Path $menu | Out-Null
    New-Shortcut (Join-Path $menu ((T 'sm_app') + '.lnk')) $VenvPyw $appArgs 'Aurelune Studio – 432 Hz & Solfeggio'
    if (Test-Path $SwitchExe) { New-Shortcut (Join-Path $menu ((T 'sm_reset') + '.lnk')) $SwitchExe 'restore' (T 'sm_reset') }
    New-Shortcut (Join-Path $menu ((T 'sm_un') + '.lnk')) "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $InstallDir 'uninstall.ps1')`"" (T 'sm_un')
    $guide = 'MANUAL-SETUP.txt'; if ($script:Lang -eq 'de') { $guide = 'MANUELLE-EINRICHTUNG.txt' }
    $readmeI = Join-Path $InstallDir $guide
    if (Test-Path $readmeI) { New-Shortcut (Join-Path $menu ((T 'sm_guide') + '.lnk')) "$env:WINDIR\notepad.exe" "`"$readmeI`"" (T 'sm_guide') }
    $desk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Aurelune Studio.lnk'
    if ($cbDesktop.Checked) { New-Shortcut $desk $VenvPyw $appArgs 'Aurelune Studio' } elseif (Test-Path $desk) { Remove-Item $desk -Force }

    $run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
    if ($cbAuto.Checked) { Set-ItemProperty -Path $run -Name 'AureluneStudio' -Value "`"$VenvPyw`" $appArgs --minimized" }
    else { Remove-ItemProperty -Path $run -Name 'AureluneStudio' -ErrorAction SilentlyContinue }

    $un = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\AureluneStudio'
    New-Item -Path $un -Force | Out-Null
    $vals = @{ DisplayName = 'Aurelune Studio'; DisplayVersion = $Version; Publisher = 'Aurelune'; InstallLocation = $InstallDir
               DisplayIcon = (Join-Path $InstallDir 'aurelune.ico')
               UninstallString = "`"$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe`" -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $InstallDir 'uninstall.ps1')`"" }
    foreach ($k in $vals.Keys) { Set-ItemProperty -Path $un -Name $k -Value $vals[$k] }
    Set-ItemProperty -Path $un -Name 'NoModify' -Value 1 -Type DWord
    Set-ItemProperty -Path $un -Name 'NoRepair' -Value 1 -Type DWord

    Write-AppSettings
    if ($script:NeedReboot -and -not $cbAuto.Checked) {
        Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'AureluneStudio' -Value "`"$VenvPyw`" $appArgs"
    }
    Step 'finish' 'ok' (T 'done')
}

function Install-All {
    $script:Busy = $true
    $btn.Enabled = $false; $btnClose.Enabled = $false
    $cbDesktop.Enabled = $false; $cbAuto.Enabled = $false; $cbLaunch.Enabled = $false
    $shine.Visible = $true; $busyTimer.Start()
    $current = 'python'
    try {
        Log "Aurelune Studio $Version – setup started ($($script:Lang))"
        $plan = @(@('python', { Install-Python }), @('webview', { Install-WebView2 }), @('app', { Install-AppFiles }),
                  @('cable', { Install-Cable }), @('deps', { Install-Deps }), @('finish', { Install-Finish }))
        $i = 0
        foreach ($s in $plan) {
            $current = $s[0]
            Status ((T "s_$current") + ' …')
            & $s[1]
            $i++; Progress ($i / $plan.Count)
        }
        $script:Done = $true
        Log 'Setup finished.'
        if ($script:NeedReboot) {
            Status (T 'doneReboot')
            $btn.Text = (T 'btnReboot')
            # driver fresh but CABLE endpoints already active -> the app works now, start it anyway
            $activeEps = @(Get-CableEndpoints | Where-Object { $_.state -eq 1 }).Count
            Log "NeedReboot, active CABLE endpoints: $activeEps"
            if ($cbLaunch.Checked -and $activeEps -ge 2) { Start-Process -FilePath $VenvPyw -ArgumentList "`"$(Join-Path $InstallDir 'app.py')`"" -WorkingDirectory $InstallDir }
        } else {
            Status (T 'doneOk')
            $btn.Text = T 'btnOpen'
            if ($cbLaunch.Checked) { Start-Process -FilePath $VenvPyw -ArgumentList "`"$(Join-Path $InstallDir 'app.py')`"" -WorkingDirectory $InstallDir }
        }
    } catch {
        $msg = $_.Exception.Message
        Log "ERROR: $msg"
        Step $current 'err' $msg
        Status (T 'interrupted')
        $btn.Text = T 'retry'
        [System.Windows.Forms.MessageBox]::Show("$msg`n`n$(T 'details'): $LogFile", 'Aurelune Studio', 'OK', 'Warning') | Out-Null
    } finally {
        $busyTimer.Stop(); $shine.Visible = $false
        $script:Busy = $false
        $btn.Enabled = $true; $btnClose.Enabled = $true
        $cbDesktop.Enabled = $true; $cbAuto.Enabled = $true; $cbLaunch.Enabled = $true
    }
}

$btn.add_Click({
    if ($script:Done) {
        if ($script:NeedReboot) {
            $r = [System.Windows.Forms.MessageBox]::Show((T 'rebootQ'), 'Aurelune Studio', 'OKCancel', 'Information')
            if ($r -eq 'OK') { Restart-Computer -Force }
        } else {
            Start-Process -FilePath $VenvPyw -ArgumentList "`"$(Join-Path $InstallDir 'app.py')`"" -WorkingDirectory $InstallDir
            $form.Close()
        }
        return
    }
    Install-All
})
$form.add_FormClosing({ param($s, $e) if ($script:Busy) { $e.Cancel = $true } })

# ------------------------------------------------------------------ run: loading screen -> scan -> main window
$t0 = Get-Date
Scan
while (((Get-Date) - $t0).TotalMilliseconds -lt 1400) { Pump; Start-Sleep -Milliseconds 15 }
$spTimer.Stop(); $splash.Close(); $splash.Dispose()
Status (T 'ready')
$form.add_Shown({ $form.Activate() })
[void]$form.ShowDialog()
