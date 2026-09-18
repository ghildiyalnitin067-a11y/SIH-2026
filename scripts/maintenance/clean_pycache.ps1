# =============================================================================
# PolarNav — Clean Python Bytecode Caches
# Run from repo root: .\scripts\maintenance\clean_pycache.ps1
# =============================================================================

Write-Host "Cleaning Python __pycache__ and .pyc files..." -ForegroundColor Cyan

$root = Resolve-Path (Join-Path $PSScriptRoot ".." "..")

Get-ChildItem -Path $root -Recurse -Directory -Filter "__pycache__" |
    ForEach-Object {
        Write-Host "  Removing: $($_.FullName)"
        Remove-Item $_.FullName -Recurse -Force
    }

Get-ChildItem -Path $root -Recurse -File -Include "*.pyc","*.pyo","*.pyd" |
    ForEach-Object {
        Write-Host "  Removing: $($_.FullName)"
        Remove-Item $_.FullName -Force
    }

Get-ChildItem -Path $root -Recurse -Directory -Filter ".pytest_cache" |
    ForEach-Object {
        Write-Host "  Removing: $($_.FullName)"
        Remove-Item $_.FullName -Recurse -Force
    }

Write-Host "`nDone. All caches cleaned." -ForegroundColor Green
