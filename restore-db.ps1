# PowerShell script to restore production database
Write-Host "🔄 Restoring production database from dump..." -ForegroundColor Blue

# Check if dump file exists
$dumpFile = "dumps/production-db-latest.sql"
if (-not (Test-Path $dumpFile)) {
    Write-Host "❌ Production dump file not found: $dumpFile" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Found dump file: $dumpFile" -ForegroundColor Green

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Restore the database
Write-Host "📥 Restoring database..." -ForegroundColor Blue
try {
    # Using psql to restore the dump
    $env:PGPASSWORD = "dev_password_123"
    psql -h localhost -p 5433 -U airassist_user -d airassist -f $dumpFile

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database restoration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Database restoration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error during database restoration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎯 Database is ready for development!" -ForegroundColor Green