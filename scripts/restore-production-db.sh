#!/bin/bash

# Restore Production Database from Dump
# This script restores a pre-built database with embeddings

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

DUMP_FILE=${1:-"dumps/production-db-latest.sql"}

if [ ! -f "$DUMP_FILE" ]; then
    print_error "Dump file not found: $DUMP_FILE"
    echo ""
    print_info "Available dumps:"
    ls -la dumps/*.sql 2>/dev/null || echo "  No dumps found in dumps/ directory"
    echo ""
    print_info "Usage: $0 [dump-file.sql]"
    exit 1
fi

echo "🔄 Restoring Production Database"
echo "==============================="
print_info "Using dump: $DUMP_FILE"

# Ensure database is running
print_info "Starting PostgreSQL..."
docker-compose -f docker-compose.dev.yml up -d postgres

print_info "Waiting for PostgreSQL..."
sleep 10

# Drop and recreate database to ensure clean state
print_info "Preparing database..."
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U airassist_user -d postgres -c "DROP DATABASE IF EXISTS airassist;"
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U airassist_user -d postgres -c "CREATE DATABASE airassist;"

# Restore the dump
print_info "Restoring database from dump..."
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U airassist_user -d airassist < "$DUMP_FILE"

# Verify restoration
print_info "Verifying restoration..."
COUNTS=$(docker-compose -f docker-compose.dev.yml exec -T postgres psql -U airassist_user -d airassist -c "
SELECT 
    COUNT(*) as total_docs,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
FROM knowledge_base;" -t)

echo "$COUNTS"

print_success "Database restored successfully!"
print_info "You can now start the application with: npm run dev"