# =============================================================================
# PolarNav — Frontend Setup Script
# Run from repo root: .\scripts\setup\install_frontend.ps1
# =============================================================================

Write-Host "Setting up PolarNav frontend environment..." -ForegroundColor Cyan

$frontendDir = Resolve-Path (Join-Path $PSScriptRoot ".." ".." "SIH26059" "frontend")

Write-Host "Installing Node.js dependencies in $frontendDir..." -ForegroundColor Yellow
Set-Location $frontendDir
npm install

Write-Host "`nFrontend setup complete!" -ForegroundColor Green
Write-Host "To start the dev server, run:" -ForegroundColor Cyan
Write-Host "  cd SIH26059/frontend && npm run dev"
