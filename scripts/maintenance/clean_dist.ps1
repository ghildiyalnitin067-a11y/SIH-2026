# =============================================================================
# PolarNav — Clean Frontend Build Artifacts
# Run from repo root: .\scripts\maintenance\clean_dist.ps1
# =============================================================================

Write-Host "Cleaning frontend build artifacts..." -ForegroundColor Cyan

$distPath = Resolve-Path (Join-Path $PSScriptRoot ".." ".." "SIH26059" "frontend" "dist")

if (Test-Path $distPath) {
    Remove-Item $distPath -Recurse -Force
    Write-Host "  Removed: $distPath" -ForegroundColor Yellow
} else {
    Write-Host "  No dist/ folder found, nothing to clean." -ForegroundColor Gray
}

Write-Host "`nDone." -ForegroundColor Green
