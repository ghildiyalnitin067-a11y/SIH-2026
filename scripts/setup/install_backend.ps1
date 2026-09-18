# =============================================================================
# PolarNav — Backend Setup Script
# Run from repo root: .\scripts\setup\install_backend.ps1
# =============================================================================

Write-Host "Setting up PolarNav backend environment..." -ForegroundColor Cyan

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot ".." "..")
$backendDir = Join-Path $repoRoot "backend"
$requirementsTxt = Join-Path $repoRoot "requirements.txt"

# Create venv if not exists
$venvPath = Join-Path $repoRoot ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment at .venv..." -ForegroundColor Yellow
    python -m venv $venvPath
}

# Activate venv and install dependencies
$activateScript = Join-Path $venvPath "Scripts" "Activate.ps1"
Write-Host "Installing Python dependencies from requirements.txt..." -ForegroundColor Yellow
& $activateScript
pip install --upgrade pip
pip install -r $requirementsTxt

Write-Host "`nBackend setup complete!" -ForegroundColor Green
Write-Host "To start the backend server, run:" -ForegroundColor Cyan
Write-Host "  uvicorn backend.app.server:app --host 0.0.0.0 --port 8000 --reload"
