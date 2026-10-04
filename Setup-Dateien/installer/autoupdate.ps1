# Aurelune Studio - Hintergrund-Updater / background updater (v3.13)
# Laeuft unsichtbar ab der Windows-Anmeldung, prueft alle 3 Minuten GitHub (main) und installiert neue
# Versionen sofort - auch wenn das Aurelune-Fenster gerade nicht offen ist. Aus, wenn in den Einstellungen
# "Automatische Updates" ausgeschaltet ist (auto_update = false in %USERPROFILE%\.aurelune\settings.json).
param([switch]$Once)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
$Repo       = 'adiabi265/Aurelune-convert-frequency-live'
$Branch     = 'main'
$Interval   = 180
$InstallDir = $PSScriptRoot
$PS         = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$Tmp        = Join-Path $env:TEMP 'AureluneAutoUpdate'
$Log        = Join-Path $env:TEMP 'AureluneSetup\autoupdate.log'
New-Item -ItemType Directory -Force -Path (Split-Path $Log) | Out-Null
function Log([string]$m) {
    try {
        if ((Test-Path $Log) -and (Get-Item $Log).Length -gt 200KB) { Remove-Item $Log -Force }
        Add-Content -Path $Log -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $m) -Encoding UTF8
    } catch {}
}
function V([string]$s) {
    $n = @([regex]::Matches(($s + ''), '\d+') | Select-Object -First 4 | ForEach-Object { [int]$_.Value })
    while ($n.Count -lt 4) { $n += 0 }
    return New-Object Version($n[0], $n[1], $n[2], $n[3])
}
function AutoOn {
    try {
        $f = Join-Path $env:USERPROFILE '.aurelune\settings.json'
        if (Test-Path $f) { $c = Get-Content -Raw -Path $f | ConvertFrom-Json; if ($c.auto_update -eq $false) { return $false } }
    } catch {}
    return $true
}
function Get([string]$url) {
    $wc = New-Object Net.WebClient
    $wc.Headers.Add('User-Agent', 'AureluneStudio-AutoUpdate')
    $wc.Headers.Add('Cache-Control', 'no-cache')
    $wc.Encoding = [Text.Encoding]::UTF8
    return $wc.DownloadString($url)
}

# only one watcher at a time
$created = $false
$mutex = New-Object Threading.Mutex($true, 'Local\AureluneStudioAutoUpdate', [ref]$created)
if (-not $created) { exit 0 }
Log "watcher started (pid $PID)"
while ($true) {
    try {
        if ((AutoOn) -and (Test-Path (Join-Path $InstallDir 'app.py'))) {
            $t = [DateTime]::UtcNow.Ticks
            $latest = (Get "https://raw.githubusercontent.com/$Repo/$Branch/Setup-Dateien/app/version.txt?t=$t").Trim([char]0xFEFF, ' ', "`r", "`n", "`t")
            $inst = '0'
            $f = Join-Path $InstallDir 'installed-version.txt'
            if (Test-Path $f) { $inst = (Get-Content -Raw -Path $f).Trim() }
            $failed = Join-Path $env:TEMP 'AureluneSetup\update-failed.txt'
            $skip = (Test-Path $failed) -and ((Get-Content -Raw -Path $failed).Trim() -eq $latest) -and ((Get-Item $failed).LastWriteTime -gt (Get-Date).AddHours(-6))
            if ($skip) { Log "version $latest failed recently - retry later" }
            elseif ((V $latest) -gt (V $inst)) {
                Log "new version $latest (installed $inst) - downloading"
                if (Test-Path $Tmp) { Remove-Item $Tmp -Recurse -Force }
                New-Item -ItemType Directory -Force -Path $Tmp | Out-Null
                $zip = Join-Path $Tmp 'update.zip'
                $wc = New-Object Net.WebClient
                $wc.Headers.Add('User-Agent', 'AureluneStudio-AutoUpdate')
                $wc.DownloadFile("https://codeload.github.com/$Repo/zip/refs/heads/$Branch", $zip)
                Expand-Archive -Path $zip -DestinationPath $Tmp -Force
                $u = Get-ChildItem -Path $Tmp -Recurse -Filter 'update.ps1' | Where-Object {
                    $_.Directory.Name -eq 'installer' -and (Test-Path (Join-Path $_.Directory.Parent.FullName 'app\version.txt')) } | Select-Object -First 1
                if (-not $u) { throw 'update package incomplete' }
                $pkgVer = (Get-Content -Raw -Path (Join-Path $u.Directory.Parent.FullName 'app\version.txt')).Trim()
                if ((V $pkgVer) -gt (V $inst)) {
                    Log "starting update $inst -> $pkgVer"
                    $mutex.ReleaseMutex(); $mutex.Dispose()
                    Start-Process -FilePath $PS -ArgumentList "-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File `"$($u.FullName)`" -Background" -WorkingDirectory $u.DirectoryName
                    exit 0   # update.ps1 starts the (new) watcher again when it is done
                }
                Log "package still $pkgVer - GitHub cache, retrying later"
            }
        }
    } catch { Log ('check failed: ' + $_.Exception.Message) }
    if ($Once) { break }
    Start-Sleep -Seconds $Interval
}
