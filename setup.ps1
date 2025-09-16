# ATC Assistant Setup Script for Windows PowerShell
param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "prod", "cleanup", "help")]
    [string]$Command = "dev"
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

Write-Status "🚀 Setting up ATC Assistant..."

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Status "Docker is installed"
} catch {
    Write-Error "Docker is not installed. Please install Docker Desktop and try again."
    exit 1
}

# Check if Docker Compose is installed
try {
    docker-compose --version | Out-Null
    Write-Status "Docker Compose is installed"
} catch {
    try {
        docker compose version | Out-Null
        Write-Status "Docker Compose (V2) is installed"
    } catch {
        Write-Error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    }
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Status "Creating .env file from template..."
    Copy-Item ".env.example" ".env"
    Write-Warning "Please edit .env file with your actual API keys and configuration before starting the services."
} else {
    Write-Status ".env file already exists."
}

function Setup-Dev {
    Write-Status "Setting up development environment..."
    
    # Start only the databases for development
    docker-compose -f docker-compose.dev.yml up -d
    
    Write-Status "Installing dependencies..."
    npm install
    
    Write-Status "Waiting for databases to be ready..."
    Start-Sleep -Seconds 10
    
    Write-Status "Running database migrations..."
    try {
        npm run db:migrate
    } catch {
        Write-Warning "Migration failed or not implemented yet"
    }
    
    Write-Status "Seeding database..."
    try {
        npm run seed
    } catch {
        Write-Warning "Seeding failed or not implemented yet"
    }
    
    Write-Status "Development environment is ready!"
    Write-Host ""
    Write-Status "To start the development server:"
    Write-Host "  npm run dev"
    Write-Host ""
    Write-Status "Services running:"
    Write-Host "  • PostgreSQL: localhost:5432"
    Write-Host "  • Qdrant: localhost:6333"
    Write-Host "  • Redis: localhost:6379"
    Write-Host ""
    Write-Status "To view logs:"
    Write-Host "  docker-compose -f docker-compose.dev.yml logs -f"
}

function Setup-Prod {
    Write-Status "Setting up production environment..."
    
    # Build and start all services
    docker-compose up --build -d
    
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 15
    
    Write-Status "Production environment is ready!"
    Write-Host ""
    Write-Status "Services running:"
    Write-Host "  • Application: http://localhost:3000"
    Write-Host "  • PostgreSQL: localhost:5432"
    Write-Host "  • Qdrant: localhost:6333"
    Write-Host "  • Redis: localhost:6379"
    Write-Host ""
    Write-Status "To view logs:"
    Write-Host "  docker-compose logs -f"
}

function Cleanup {
    Write-Status "Cleaning up..."
    docker-compose down -v
    docker-compose -f docker-compose.dev.yml down -v
    docker system prune -f
    Write-Status "Cleanup completed!"
}

function Show-Help {
    Write-Host "ATC Assistant Setup Script"
    Write-Host ""
    Write-Host "Usage: .\setup.ps1 [COMMAND]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  dev       Setup development environment (databases only)"
    Write-Host "  prod      Setup production environment (full stack)"
    Write-Host "  cleanup   Remove all containers and volumes"
    Write-Host "  help      Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\setup.ps1 dev     # Setup for development"
    Write-Host "  .\setup.ps1 prod    # Setup for production"
    Write-Host "  .\setup.ps1 cleanup # Clean up everything"
}

# Main script logic
switch ($Command) {
    "dev" { Setup-Dev }
    "prod" { Setup-Prod }
    "cleanup" { Cleanup }
    "help" { Show-Help }
    default {
        Write-Error "Unknown command: $Command"
        Show-Help
        exit 1
    }
}