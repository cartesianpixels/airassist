# ATC Assistant Fly.io Deployment Script for Windows PowerShell
# This script automates the deployment process for non-technical users

param(
    [string]$GoogleApiKey = $env:GOOGLE_API_KEY,
    [string]$OpenAiApiKey = $env:OPENAI_API_KEY
)

# Colors for output
function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n🚀 $Message" -ForegroundColor Blue
    Write-Host "----------------------------------------" -ForegroundColor Blue
}

function Check-Flyctl {
    try {
        flyctl version | Out-Null
        Write-Success "Fly.io CLI is installed"
        return $true
    } catch {
        Write-Error "Fly.io CLI (flyctl) is not installed!"
        Write-Host ""
        Write-Info "Please install it first:"
        Write-Host "  • Download from: https://fly.io/docs/flyctl/install/"
        Write-Host "  • Or use Scoop: scoop install flyctl"
        Write-Host ""
        Write-Host "After installation, restart PowerShell and run this script again."
        return $false
    }
}

function Check-Auth {
    try {
        $user = flyctl auth whoami 2>$null
        Write-Success "Logged in as: $user"
        return $true
    } catch {
        Write-Warning "You're not logged in to Fly.io"
        Write-Info "Opening login page..."
        flyctl auth login
        return $true
    }
}

function Generate-Secrets {
    Write-Step "Generating Secure Secrets"
    
    # Generate secure random strings
    $script:NextAuthSecret = [System.Web.Security.Membership]::GeneratePassword(64, 0)
    $script:PostgresPassword = [System.Web.Security.Membership]::GeneratePassword(32, 0)
    
    Write-Success "Generated NEXTAUTH_SECRET"
    Write-Success "Generated POSTGRES_PASSWORD"
}

function Setup-App {
    Write-Step "Setting Up Fly.io App"
    
    # Check if app exists
    $existingApps = flyctl apps list --json | ConvertFrom-Json
    $existingApp = $existingApps | Where-Object { $_.Name -like "*airassist*" }
    
    if ($existingApp) {
        Write-Info "App '$($existingApp.Name)' already exists"
        $script:AppName = $existingApp.Name
    } else {
        Write-Info "Creating new app 'airassist'"
        flyctl apps create airassist --generate-name
        
        # Get the created app name
        $apps = flyctl apps list --json | ConvertFrom-Json
        $script:AppName = ($apps | Where-Object { $_.Name -like "*airassist*" } | Select-Object -First 1).Name
    }
    
    Write-Success "Using app: $script:AppName"
}

function Setup-Databases {
    Write-Step "Setting Up Databases"
    
    # PostgreSQL
    $postgresExists = flyctl postgres list --json | ConvertFrom-Json | Where-Object { $_.Name -eq "$script:AppName-db" }
    
    if ($postgresExists) {
        Write-Info "PostgreSQL database already exists"
    } else {
        Write-Info "Creating PostgreSQL database..."
        flyctl postgres create --name "$script:AppName-db" --region ord --vm-size shared-cpu-1x --volume-size 3
        flyctl postgres attach "$script:AppName-db" --app "$script:AppName"
    }
    
    # Redis
    $redisExists = flyctl redis list --json | ConvertFrom-Json | Where-Object { $_.Name -eq "$script:AppName-redis" }
    
    if ($redisExists) {
        Write-Info "Redis cache already exists"
    } else {
        Write-Info "Creating Redis cache..."
        flyctl redis create --name "$script:AppName-redis" --region ord
        flyctl redis attach "$script:AppName-redis" --app "$script:AppName"
    }
    
    Write-Success "Databases configured"
}

function Set-Secrets {
    Write-Step "Configuring Environment Variables"
    
    # Check for API keys
    if (-not $GoogleApiKey) {
        $GoogleApiKey = Read-Host "Enter your Google Gemini API Key"
    }
    
    if (-not $OpenAiApiKey) {
        $OpenAiApiKey = Read-Host "Enter your OpenAI API Key"
    }
    
    # Set secrets in Fly.io
    Write-Info "Setting secure environment variables..."
    
    flyctl secrets set `
        GOOGLE_API_KEY="$GoogleApiKey" `
        OPENAI_API_KEY="$OpenAiApiKey" `
        NEXTAUTH_SECRET="$script:NextAuthSecret" `
        NODE_ENV="production" `
        NEXT_PUBLIC_APP_URL="https://$script:AppName.fly.dev" `
        --app "$script:AppName"
    
    Write-Success "Environment variables configured securely"
}

function Deploy-App {
    Write-Step "Deploying Application"
    
    Write-Info "Building and deploying to Fly.io..."
    flyctl deploy --dockerfile Dockerfile.fly --app "$script:AppName"
    
    Write-Success "Application deployed successfully!"
}

function Run-Migrations {
    Write-Step "Running Database Migrations"
    
    Write-Info "Setting up database schema..."
    flyctl ssh console --app "$script:AppName" --command "cd /app && npm run db:migrate"
    
    Write-Success "Database migrations completed"
}

function Main {
    # Load System.Web for password generation
    Add-Type -AssemblyName System.Web
    
    Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║      ATC Assistant Deployment        ║" -ForegroundColor Cyan
    Write-Host "║           Fly.io Platform            ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Info "This script will deploy your ATC Assistant to Fly.io"
    Write-Warning "Make sure you have your API keys ready!"
    Write-Host ""
    
    $continue = Read-Host "Do you want to continue? (y/N)"
    if ($continue -notmatch '^[Yy]$') {
        Write-Host "Deployment cancelled."
        exit 1
    }
    
    if (-not (Check-Flyctl)) { exit 1 }
    if (-not (Check-Auth)) { exit 1 }
    
    Generate-Secrets
    Setup-App
    Setup-Databases
    Set-Secrets
    Deploy-App
    Run-Migrations
    
    Write-Step "🎉 Deployment Complete!"
    
    Write-Host ""
    Write-Success "Your ATC Assistant is now live at:"
    Write-Host "  https://$script:AppName.fly.dev" -ForegroundColor Yellow
    Write-Host ""
    Write-Info "Important next steps:"
    Write-Host "  1. Test the application at the URL above"
    Write-Host "  2. Set up monitoring: flyctl dashboard $script:AppName"
    Write-Host "  3. View logs: flyctl logs --app $script:AppName"
    Write-Host "  4. Scale if needed: flyctl scale count 2 --app $script:AppName"
    Write-Host ""
    Write-Warning "Keep your API keys secure and never share them!"
}

# Run main function
Main