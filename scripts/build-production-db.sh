#!/bin/bash

# Build Production Database with Pre-computed Embeddings
# This script creates a production-ready database dump with all embeddings

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🏭 Building Production Database with Pre-computed Embeddings"
echo "=========================================================="

# Check if knowledge base exists
if [ ! -d "data" ] && [ ! -d "src/data" ]; then
    print_error "No knowledge base found in data/ or src/data/"
    print_info "Please add your JSON knowledge base files before building"
    exit 1
fi

# Since we're dumping an existing database, no API keys needed
print_info "Using existing database with pre-computed embeddings"

print_info "Starting development databases..."
docker-compose -f docker-compose.dev.yml up -d

print_info "Waiting for PostgreSQL to be ready..."
sleep 15

print_info "Verifying database has embeddings..."
COUNTS=$(docker-compose -f docker-compose.dev.yml exec -T postgres psql -U airassist_user -d airassist -c "SELECT COUNT(*) as total_docs FROM knowledge_base;" -t)
print_info "Found database with$COUNTS documents"

print_info "Creating production database dump..."
mkdir -p dumps

# Create comprehensive dump
DUMP_FILE="dumps/production-db-$(date +%Y%m%d-%H%M%S).sql"
docker-compose -f docker-compose.dev.yml exec -T postgres pg_dump -U airassist_user airassist > "$DUMP_FILE"

# Create embeddings-only dump
EMBEDDINGS_DUMP="dumps/embeddings-$(date +%Y%m%d-%H%M%S).sql"
docker-compose -f docker-compose.dev.yml exec -T postgres pg_dump -U airassist_user -t knowledge_base airassist > "$EMBEDDINGS_DUMP"

# Create statistics
STATS_FILE="dumps/db-stats-$(date +%Y%m%d-%H%M%S).txt"
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U airassist_user -d airassist -c "
SELECT 
    'Total Documents' as metric, COUNT(*) as value FROM knowledge_base
UNION ALL
SELECT 
    'With Embeddings' as metric, COUNT(*) as value FROM knowledge_base WHERE embedding IS NOT NULL
UNION ALL
SELECT 
    'Database Size' as metric, pg_size_pretty(pg_database_size('airassist'))::text as value
;" > "$STATS_FILE"

print_success "Production database built successfully!"
echo ""
print_info "Files created:"
echo "  📄 Full dump: $DUMP_FILE"
echo "  🧠 Embeddings only: $EMBEDDINGS_DUMP"
echo "  📊 Statistics: $STATS_FILE"
echo ""
print_info "Next steps:"
echo "  1. Test the dump: ./scripts/test-production-db.sh $DUMP_FILE"
echo "  2. Commit to git: git add dumps/ && git commit -m 'Add production database'"
echo "  3. Deploy: ./deploy-fly.sh"
echo ""
print_warning "Keep dumps/ folder in git but add dumps/*.sql to .gitignore for large files"