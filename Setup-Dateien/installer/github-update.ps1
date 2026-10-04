# Aurelune Studio - holt die neueste Version von GitHub und startet deren Updater.
# Ohne Internet wird automatisch das lokale Paket verwendet.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
$Repo   = 'adiabi265/Aurelune-convert-frequency-live'
$Branch = 'main'
$PS     = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$Tmp    = Join-Path $env:TEMP 'AureluneUpdate'
$Log    = Join-Path $env:TEMP 'AureluneSetup\github-update.log'
New-Item -ItemType Directory -Force -Path (Split-Path $Log) | Out-Null
function Log([string]$m) { Add-Content -Path $Log -Value ((Get-Date -Format 'HH:mm:ss') + '  ' + $m) -Encoding UTF8 }
$target = Join-Path $PSScriptRoot 'update.ps1'
try {
    if (Test-Path $Tmp) { Remove-Item $Tmp -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $Tmp | Out-Null
    $zip = Join-Path $Tmp 'update.zip'
    Log "download $Repo@$Branch"
    Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/$Repo/zip/refs/heads/$Branch" -OutFile $zip -TimeoutSec 60
    Expand-Archive -Path $zip -DestinationPath $Tmp -Force
    $u = Get-ChildItem -Path $Tmp -Recurse -Filter 'update.ps1' | Where-Object {
        $_.Directory.Name -eq 'installer' -and (Test-Path (Join-Path $_.Directory.Parent.FullName 'app\version.txt')) } | Select-Object -First 1
    if ($u) { $target = $u.FullName; Log "using GitHub package: $target" } else { Log 'GitHub package incomplete - using local package' }
} catch {
    Log ('GitHub not reachable (' + $_.Exception.Message + ') - using local package')
}
if (-not (Test-Path $target)) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show('Update konnte nicht geladen werden. Bitte Internet pruefen. / Update could not be downloaded.', 'Aurelune Studio', 'OK', 'Warning') | Out-Null
    exit 1
}
Start-Process -FilePath $PS -ArgumentList "-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File `"$target`""
