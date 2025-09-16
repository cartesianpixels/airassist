#!/bin/bash

# ATC Assistant Fly.io Deployment Script
# This script automates the deployment process for non-technical users

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "\n${BLUE}🚀 $1${NC}"
    echo "----------------------------------------"
}

# Check if flyctl is installed
check_flyctl() {
    if ! command -v flyctl &> /dev/null; then
        print_error "Fly.io CLI (flyctl) is not installed!"
        echo ""
        print_info "Please install it first:"
        echo "  • macOS: brew install flyctl"
        echo "  • Linux: curl -L https://fly.io/install.sh | sh"
        echo "  • Windows: https://fly.io/docs/flyctl/install/"
        echo ""
        echo "After installation, run this script again."
        exit 1
    fi
    print_success "Fly.io CLI is installed"
}

# Check if user is logged in
check_auth() {
    if ! flyctl auth whoami &> /dev/null; then
        print_warning "You're not logged in to Fly.io"
        print_info "Opening login page..."
        flyctl auth login
    fi
    local user=$(flyctl auth whoami)
    print_success "Logged in as: $user"
}

# Generate secure secrets
generate_secrets() {
    print_step "Generating Secure Secrets"
    
    # Generate secure random strings
    NEXTAUTH_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$(date +%s)$(whoami)$(hostname)" | sha256sum | cut -d' ' -f1)
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25 2>/dev/null || cat /proc/sys/kernel/random/uuid)
    
    print_success "Generated NEXTAUTH_SECRET"
    print_success "Generated POSTGRES_PASSWORD"
}

# Create or update app
setup_app() {
    print_step "Setting Up Fly.io App"
    
    # Check if app exists
    if flyctl apps list | grep -q "airassist"; then
        print_info "App 'airassist' already exists"
        EXISTING_APP=true
    else
        print_info "Creating new app 'airassist'"
        flyctl apps create airassist --generate-name
        EXISTING_APP=false
    fi
    
    # Get the actual app name (in case it was modified)
    APP_NAME=$(flyctl apps list | grep airassist | awk '{print $1}' | head -1)
    print_success "Using app: $APP_NAME"
}

# Setup databases
setup_databases() {
    print_step "Setting Up Databases"
    
    # PostgreSQL
    if flyctl postgres list | grep -q "$APP_NAME-db"; then
        print_info "PostgreSQL database already exists"
    else
        print_info "Creating PostgreSQL database..."
        flyctl postgres create --name "$APP_NAME-db" --region ord --vm-size shared-cpu-1x --volume-size 3
        flyctl postgres attach "$APP_NAME-db" --app "$APP_NAME"
    fi
    
    # Redis
    if flyctl redis list | grep -q "$APP_NAME-redis"; then
        print_info "Redis cache already exists"
    else
        print_info "Creating Redis cache..."
        flyctl redis create --name "$APP_NAME-redis" --region ord --plan free
        flyctl redis attach "$APP_NAME-redis" --app "$APP_NAME"
    fi
    
    print_success "Databases configured"
}

# Set environment variables
set_secrets() {
    print_step "Configuring Environment Variables"
    
    # Check for API keys
    if [ -z "$GOOGLE_API_KEY" ]; then
        print_warning "GOOGLE_API_KEY not found in environment"
        read -p "Enter your Google Gemini API Key: " GOOGLE_API_KEY
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        print_warning "OPENAI_API_KEY not found in environment"
        read -p "Enter your OpenAI API Key: " OPENAI_API_KEY
    fi
    
    # Set secrets in Fly.io
    print_info "Setting secure environment variables..."
    
    flyctl secrets set \
        GOOGLE_API_KEY="$GOOGLE_API_KEY" \
        OPENAI_API_KEY="$OPENAI_API_KEY" \
        NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
        NODE_ENV="production" \
        NEXT_PUBLIC_APP_URL="https://$APP_NAME.fly.dev" \
        --app "$APP_NAME"
    
    print_success "Environment variables configured securely"
}

# Deploy application
deploy_app() {
    print_step "Deploying Application"
    
    print_info "Building and deploying to Fly.io..."
    flyctl deploy --dockerfile Dockerfile.fly --app "$APP_NAME"
    
    print_success "Application deployed successfully!"
}

# Run database migrations
run_migrations() {
    print_step "Running Database Migrations"
    
    print_info "Setting up database schema..."
    flyctl ssh console --app "$APP_NAME" --command "cd /app && npm run db:migrate"
    
    print_success "Database migrations completed"
}

# Main deployment function
main() {
    echo "╔══════════════════════════════════════╗"
    echo "║      ATC Assistant Deployment        ║"
    echo "║           Fly.io Platform            ║"
    echo "╚══════════════════════════════════════╝"
    echo ""
    
    print_info "This script will deploy your ATC Assistant to Fly.io"
    print_warning "Make sure you have your API keys ready!"
    echo ""
    
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
    
    check_flyctl
    check_auth
    generate_secrets
    setup_app
    setup_databases
    set_secrets
    deploy_app
    run_migrations
    
    print_step "🎉 Deployment Complete!"
    
    echo ""
    print_success "Your ATC Assistant is now live at:"
    echo "  https://$APP_NAME.fly.dev"
    echo ""
    print_info "Important next steps:"
    echo "  1. Test the application at the URL above"
    echo "  2. Set up monitoring: flyctl dashboard $APP_NAME"
    echo "  3. View logs: flyctl logs --app $APP_NAME"
    echo "  4. Scale if needed: flyctl scale count 2 --app $APP_NAME"
    echo ""
    print_warning "Keep your API keys secure and never share them!"
}

# Run main function
main "$@"