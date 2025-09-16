#!/bin/bash

# Fly.io Secrets Management Script
# Helps manage environment variables securely

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if app name is provided
if [ -z "$1" ]; then
    print_error "Please provide your Fly.io app name"
    echo "Usage: $0 <app-name> [action]"
    echo ""
    echo "Actions:"
    echo "  set     - Set all secrets from .env.fly file"
    echo "  list    - List current secrets (values hidden)"
    echo "  update  - Update specific secrets interactively"
    echo "  backup  - Backup current secrets to file"
    echo ""
    exit 1
fi

APP_NAME=$1
ACTION=${2:-set}

case $ACTION in
    "set")
        print_info "Setting secrets from .env.fly file"
        
        if [ ! -f ".env.fly" ]; then
            print_error ".env.fly file not found!"
            print_info "Create it from .env.fly.example and add your values"
            exit 1
        fi
        
        # Read .env.fly and set secrets
        while IFS= read -r line; do
            # Skip comments and empty lines
            if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
                continue
            fi
            
            # Extract key=value
            if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"
                value="${BASH_REMATCH[2]}"
                
                # Skip if value is placeholder
                if [[ $value == *"your_"* ]] || [[ $value == *"_here"* ]]; then
                    print_warning "Skipping placeholder value for $key"
                    continue
                fi
                
                print_info "Setting $key..."
                flyctl secrets set "$key=$value" --app "$APP_NAME"
            fi
        done < .env.fly
        
        print_success "All secrets set successfully!"
        ;;
        
    "list")
        print_info "Current secrets for app: $APP_NAME"
        flyctl secrets list --app "$APP_NAME"
        ;;
        
    "update")
        print_info "Interactive secret update for app: $APP_NAME"
        
        echo "Available secrets to update:"
        echo "1. GOOGLE_API_KEY"
        echo "2. OPENAI_API_KEY" 
        echo "3. NEXTAUTH_SECRET"
        echo "4. NEXT_PUBLIC_APP_URL"
        echo "5. Custom secret"
        echo ""
        
        read -p "Which secret do you want to update? (1-5): " choice
        
        case $choice in
            1)
                read -p "Enter new Google API Key: " value
                flyctl secrets set GOOGLE_API_KEY="$value" --app "$APP_NAME"
                ;;
            2)
                read -p "Enter new OpenAI API Key: " value
                flyctl secrets set OPENAI_API_KEY="$value" --app "$APP_NAME"
                ;;
            3)
                value=$(openssl rand -hex 32)
                flyctl secrets set NEXTAUTH_SECRET="$value" --app "$APP_NAME"
                print_info "Generated new NEXTAUTH_SECRET"
                ;;
            4)
                read -p "Enter new app URL: " value
                flyctl secrets set NEXT_PUBLIC_APP_URL="$value" --app "$APP_NAME"
                ;;
            5)
                read -p "Enter secret name: " key
                read -p "Enter secret value: " value
                flyctl secrets set "$key=$value" --app "$APP_NAME"
                ;;
            *)
                print_error "Invalid choice"
                exit 1
                ;;
        esac
        
        print_success "Secret updated successfully!"
        ;;
        
    "backup")
        print_info "Backing up secrets for app: $APP_NAME"
        
        backup_file="secrets-backup-$(date +%Y%m%d-%H%M%S).txt"
        flyctl secrets list --app "$APP_NAME" > "$backup_file"
        
        print_success "Secrets list backed up to: $backup_file"
        print_warning "Note: This only backs up secret names, not values"
        ;;
        
    *)
        print_error "Unknown action: $ACTION"
        echo "Valid actions: set, list, update, backup"
        exit 1
        ;;
esac