# Database Dumps

This directory contains pre-built PostgreSQL database dumps with embeddings.

## 📁 File Types

- `production-db-YYYYMMDD-HHMMSS.sql` - Full database dumps
- `embeddings-YYYYMMDD-HHMMSS.sql` - Embeddings table only
- `db-stats-YYYYMMDD-HHMMSS.txt` - Database statistics

## 🚀 Usage

### Build Production Database
```bash
./scripts/build-production-db.sh
```

### Restore from Dump
```bash
./scripts/restore-production-db.sh dumps/production-db-latest.sql
```

### Deploy with Pre-built Data
```bash
./scripts/deploy-with-dump.sh
```

## 💡 Benefits

- ✅ **Zero embedding costs** in production
- ✅ **Instant startup** - no API calls during deployment
- ✅ **Consistent data** across all deployments
- ✅ **Version control** of knowledge base state

## 📋 Workflow

1. **Development**: Build embeddings locally with API key
2. **Export**: Create database dump with all embeddings
3. **Commit**: Add dump to version control
4. **Deploy**: Restore dump in production (no API calls needed)

This approach is perfect for knowledge bases that don't change frequently!