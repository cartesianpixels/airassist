#!/bin/bash

# ATC Assistant Setup Script
set -e

echo "🚀 Setting up ATC Assistant..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker and try again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your actual API keys and configuration before starting the services."
else
    print_status ".env file already exists."
fi

# Function to setup development environment
setup_dev() {
    print_status "Setting up development environment..."
    
    # Start only the databases for development
    docker-compose -f docker-compose.dev.yml up -d
    
    print_status "Installing dependencies..."
    npm install
    
    print_status "Waiting for databases to be ready..."
    sleep 10
    
    print_status "Running database migrations..."
    npm run db:migrate || print_warning "Database migration failed - check PostgreSQL connection"
    
    print_status "Seeding database with knowledge base..."
    npm run seed || print_warning "Seeding failed - check your data/ directory and API keys"
    
    print_status "Development environment is ready!"
    echo ""
    print_status "To start the development server:"
    echo "  npm run dev"
    echo ""
    print_status "Services running:"
    echo "  • PostgreSQL: localhost:5432"
    echo "  • Qdrant: localhost:6333"
    echo "  • Redis: localhost:6379"
    echo ""
    print_status "To view logs:"
    echo "  docker-compose -f docker-compose.dev.yml logs -f"
}

# Function to setup production environment
setup_prod() {
    print_status "Setting up production environment..."
    
    # Build and start all services
    docker-compose up --build -d
    
    print_status "Waiting for services to be ready..."
    sleep 15
    
    print_status "Production environment is ready!"
    echo ""
    print_status "Services running:"
    echo "  • Application: http://localhost:3000"
    echo "  • PostgreSQL: localhost:5432"
    echo "  • Qdrant: localhost:6333"
    echo "  • Redis: localhost:6379"
    echo ""
    print_status "To view logs:"
    echo "  docker-compose logs -f"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up..."
    docker-compose down -v
    docker-compose -f docker-compose.dev.yml down -v
    docker system prune -f
    print_status "Cleanup completed!"
}

# Function to show help
show_help() {
    echo "ATC Assistant Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev       Setup development environment (databases only)"
    echo "  prod      Setup production environment (full stack)"
    echo "  cleanup   Remove all containers and volumes"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev     # Setup for development"
    echo "  $0 prod    # Setup for production"
    echo "  $0 cleanup # Clean up everything"
}

# Main script logic
case "${1:-dev}" in
    "dev")
        setup_dev
        ;;
    "prod")
        setup_prod
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac