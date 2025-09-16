#!/bin/bash

# Deploy to Fly.io with Pre-built Database
# This script deploys the app and restores the production database

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Find the latest production dump
LATEST_DUMP=$(ls -t dumps/production-db-*.sql 2>/dev/null | head -n1)

if [ -z "$LATEST_DUMP" ]; then
    print_error "No production database dump found!"
    print_info "Please run: ./scripts/build-production-db.sh first"
    exit 1
fi

echo "🚀 Deploying to Fly.io with Pre-built Database"
echo "=============================================="
print_info "Using database dump: $LATEST_DUMP"

# Deploy the application first (using existing deploy script)
print_info "Deploying application..."
./deploy-fly.sh

# Get app name from fly.toml or flyctl
APP_NAME=$(flyctl config show | grep app | cut -d'"' -f4 2>/dev/null || echo "airassist")

print_info "Restoring production database to Fly.io..."

# Create a temporary dump upload script
cat > temp_restore.sh << EOF
#!/bin/bash
# Restore database in Fly.io environment
psql \$DATABASE_URL -c "DROP TABLE IF EXISTS knowledge_base CASCADE;"
psql \$DATABASE_URL -c "DROP TABLE IF EXISTS messages CASCADE;"  
psql \$DATABASE_URL -c "DROP TABLE IF EXISTS chat_sessions CASCADE;"
psql \$DATABASE_URL < /tmp/production-dump.sql
EOF

# Upload and execute restoration
flyctl ssh sftp shell --app "$APP_NAME" << SFTP_COMMANDS
put "$LATEST_DUMP" /tmp/production-dump.sql
put temp_restore.sh /tmp/restore.sh
SFTP_COMMANDS

flyctl ssh console --app "$APP_NAME" --command "chmod +x /tmp/restore.sh && /tmp/restore.sh"

# Clean up temporary files
rm temp_restore.sh

# Verify deployment
print_info "Verifying deployment..."
APP_URL="https://$APP_NAME.fly.dev"
curl -f "$APP_URL/api/health" > /dev/null

print_success "Deployment completed successfully!"
echo ""
print_info "Your ATC Assistant is now live at:"
echo "  $APP_URL"
echo ""
print_warning "Database is pre-loaded with embeddings - no API costs for setup!"
echo ""
print_info "Next steps:"
echo "  1. Test the application: curl $APP_URL/api/health"
echo "  2. Monitor: flyctl dashboard $APP_NAME"
echo "  3. View logs: flyctl logs --app $APP_NAME"