param([string]$Destination = (Join-Path $PSScriptRoot '..\output\itch-tools\butler'))
$ErrorActionPreference = 'Stop'
$butlerDirectory = [IO.Path]::GetFullPath($Destination)
$butlerExecutable = Join-Path $butlerDirectory 'butler.exe'
if (-not (Test-Path -LiteralPath $butlerExecutable)) {
    New-Item -ItemType Directory -Force -Path $butlerDirectory | Out-Null
    $butlerArchive = Join-Path $butlerDirectory 'butler-download.zip'
    Invoke-WebRequest -Uri 'https://broth.itch.zone/butler/windows-amd64/LATEST/archive/default' -OutFile $butlerArchive
    Expand-Archive -LiteralPath $butlerArchive -DestinationPath $butlerDirectory -Force
}
& $butlerExecutable version
if ($LASTEXITCODE -ne 0) { throw 'Butler could not start.' }
Write-Output "Butler is ready: $butlerExecutable"
Write-Output 'Authenticate when ready with: & <butler-path> login'
