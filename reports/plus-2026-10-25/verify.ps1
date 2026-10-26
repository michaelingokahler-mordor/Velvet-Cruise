param(
    [string]$PythonExe = 'python',
    [string]$WebBaseURL = 'http://127.0.0.1:4191/',
    [string]$DemoBaseURL = 'http://127.0.0.1:4192/'
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Resolve-Path (Join-Path $PSScriptRoot '../..'))
if (-not $env:NODE_PATH) {
    $env:NODE_PATH = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
}
function Invoke-PlusCheck {
    param([string]$Program, [string[]]$Arguments)
    Write-Output ("RUN " + $Program + " " + ($Arguments -join ' '))
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Verification failed: $Program $Arguments" }
}
foreach ($suite in @('check','qa:local-services','qa:balance','qa:course-map','qa:grade','qa:demo')) {
    Invoke-PlusCheck -Program 'npm.cmd' -Arguments @('run',$suite)
}
foreach ($suite in @(
    'check-goal-progress.mjs','check-graphics-surfaces.mjs','check-graphics-profiles.mjs',
    'check-plus-loading.mjs','check-plus-assets.mjs','check-light-generation.mjs',
    'check-native-copy.mjs','check-input-bindings.mjs','check-menu-settings.mjs',
    'check-garage-weather.mjs','check-palm-cove-contract.mjs'
)) {
    $qaArguments = @("tools/qa/$suite")
    if ($suite -eq 'check-plus-assets.mjs') { $qaArguments += '--release' }
    Invoke-PlusCheck -Program 'node' -Arguments $qaArguments
}
Invoke-PlusCheck -Program $PythonExe -Arguments @('tools/qa/check-garage-sprites.py')
Invoke-PlusCheck -Program 'node' -Arguments @('tools/qa/check-stage-refresh.mjs','output/stage-depth','--graphics-only')
Invoke-PlusCheck -Program 'node' -Arguments @('tools/qa/check-stage-depth.mjs','--graphics-only')
foreach ($suite in @('graphics-profiles-browser.cjs','check-goal-progress-browser.cjs','plus-native-browser.cjs','menu-settings-browser.cjs','check-plus-device-page.cjs','check-rain-entry.cjs')) {
    Invoke-PlusCheck -Program 'node' -Arguments @("tools/qa/$suite",$WebBaseURL)
}
Invoke-PlusCheck -Program 'node' -Arguments @('tools/qa/plus-demo-browser.cjs',$DemoBaseURL)
$benchmark = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'desktop-after-rain-fix.json') | ConvertFrom-Json
if ($benchmark.status -ne 'PASS' -or $benchmark.profiles.Count -ne 2) { throw 'Missing passing desktop benchmark' }
foreach ($profile in $benchmark.profiles) {
    if ($profile.status -ne 'PASS' -or $profile.elapsedSeconds -lt 600 -or $profile.p95Ms -gt 20 -or
        $profile.qualifyingGameplay.drivingSeconds -lt 480 -or $profile.qualifyingGameplay.rainDrivingSeconds -lt 30) {
        throw "Incomplete desktop gameplay benchmark: $($profile.mode)"
    }
}
$phone = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'iphone-status.json') | ConvertFrom-Json
if ($phone.status -ne 'deferred-by-user' -or $null -ne $phone.numericPerformancePassed) { throw 'Incorrect iPhone acceptance claim' }
$packages = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'package-report.json') | ConvertFrom-Json
if ($packages.status -ne 'PASS' -or $packages.plusFiles.web -ne 45 -or $packages.plusFiles.windows -ne 45) { throw 'Incomplete package coverage' }
foreach ($package in $packages.packages) {
    $archive = Join-Path 'output/plus/packages-rainfix-20261025' $package.file
    $digest = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead((Join-Path (Get-Location) $archive))
    try { $actualHash = [BitConverter]::ToString($digest.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
    finally { $stream.Dispose(); $digest.Dispose() }
    if ($actualHash -ne $package.sha256) { throw "Package hash mismatch: $archive" }
}
$native = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'native-windows.json') | ConvertFrom-Json
if ($native.status -ne 'PASS' -or $native.native.drawingWidth -ne 640 -or $native.native.drawingHeight -ne 360) { throw 'Missing native Windows evidence' }
Write-Output 'PASS final Plus regressions, actual browser builds, desktop measurement evidence and package hashes; physical iPhone acceptance explicitly deferred by user.'
