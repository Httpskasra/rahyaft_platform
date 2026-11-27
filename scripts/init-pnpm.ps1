$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed: $LASTEXITCODE" } }
foreach ($dir in @('backend','frontend')) {
  Push-Location $dir
  try {
    if (-not (Test-Path pnpm-lock.yaml)) { pnpm import; Check-Exit }
    pnpm install --frozen-lockfile; Check-Exit
  } finally { Pop-Location }
}
