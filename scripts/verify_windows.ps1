#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Minimal verify script for Windows projects.
# Replace the commands below with your project's real checks (pytest, npm test, make verify, etc).

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

# Prefer project virtualenv if available
$venvActivate = Join-Path $root ".venv\\Scripts\\Activate.ps1"
if (Test-Path $venvActivate) {
    . $venvActivate
}

# Lightweight bootstrap: install dev deps only when pytest is missing
if (-not (Get-Command pytest -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $root "requirements-dev.txt"))) {
    Write-Host "[verify] pytest not found; installing requirements-dev.txt (one-time)"
    $venvDir = Join-Path $root ".venv"
    if (-not (Test-Path $venvDir)) {
        python -m venv $venvDir
        if (Test-Path $venvActivate) { . $venvActivate }
    }
    python -m pip install --upgrade pip *> $null
    python -m pip install -r (Join-Path $root "requirements-dev.txt")
}

Write-Host "[verify] scanning repo (including .codex_runs/.codex-loop) for secret-like patterns"
python -m codex_loop_suite.security --root $root
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

$ranCheck = $false

if ((Get-Command pytest -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $root "tests"))) {
    Write-Host "[verify] running pytest -q"
    python -m pytest -q
    $pyExit = $LASTEXITCODE
    if ($pyExit -eq 5) {
        Write-Host "[verify] pytest reported no tests collected; treating as pass"
    } elseif ($pyExit -ne 0) {
        exit $pyExit
    }
    $ranCheck = $true
}

if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    $dotnetTarget = Get-ChildItem -Path $root -Recurse -Include *.sln,*.csproj -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($dotnetTarget) {
        $results = Join-Path ([System.IO.Path]::GetTempPath()) ("dotnet-test-" + [System.IO.Path]::GetRandomFileName())
        New-Item -ItemType Directory -Path $results -Force | Out-Null
        Write-Host "[verify] running dotnet test (results: $results)"
        dotnet test --nologo --results-directory $results --logger "trx;LogFileName=verify.trx"
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
        $ranCheck = $true
    }
}

if (-not $ranCheck) {
    Write-Host "[verify] No project-specific checks configured."
    Write-Host "[verify] Edit scripts\\verify_windows.ps1 to add your project's verify commands."
}
