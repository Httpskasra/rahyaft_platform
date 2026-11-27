$ErrorActionPreference = 'Continue'
$projectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tsx = Join-Path $projectDirectory 'node_modules\.bin\tsx.cmd'
if (-not (Test-Path $tsx)) {
  throw 'Dependencies are missing. While internet is available, run: pnpm install --frozen-lockfile'
}
$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$transcriptDirectory = Join-Path $PSScriptRoot '..\captures\runs'
$env:SHAYGAN_RUN_ID = $runStamp
$runDirectory = Join-Path $transcriptDirectory $runStamp
New-Item -ItemType Directory -Force $runDirectory | Out-Null
$transcriptPath = Join-Path $runDirectory 'console.log'

Start-Transcript -Path $transcriptPath -Force
try {
  Push-Location $projectDirectory
  Write-Host 'Step 1/3: read-only connectivity probe'
  & $tsx 'src\cli.ts' probe
  if ($LASTEXITCODE -ne 0) {
    Write-Warning 'Probe failed. Capture is skipped. Check LAN connection and SHAYGAN_API_BASE_URL in .env.local.'
    exit $LASTEXITCODE
  }

  Write-Host 'Step 2/3: sanitized read-only capture'
  & $tsx 'src\cli.ts' capture

  Write-Host 'Step 3/3: coverage verification'
  & $tsx 'src\cli.ts' verify

  $latestFile = Join-Path $PSScriptRoot '..\captures\latest-run.txt'
  if (Test-Path $latestFile) {
    $latestRun = (Get-Content -Raw $latestFile).Trim()
    Write-Host "Result directory: $latestRun"
  }
  Write-Host 'No live write endpoint was called.'
} finally {
  Pop-Location
  Stop-Transcript
}
