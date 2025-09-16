# Testing Guide

This document outlines how to test the ATC Assistant application to ensure everything works correctly.

## 🧪 Quick Testing Checklist

### 1. Environment Setup Test
```bash
# Copy and verify environment
cp .env.example .env
# Edit .env with your API keys

# Verify environment variables
grep -v '^#' .env | grep -v '^$'
```

### 2. Service Health Check
```bash
# Start services
./setup.sh dev  # or setup.ps1 dev

# Check service status
docker-compose -f docker-compose.dev.yml ps

# Test health endpoint
curl http://localhost:3000/api/health
```

Expected health response:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy", 
    "qdrant": "healthy"
  }
}
```

### 3. Database Connection Test
```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U airassist_user -d airassist

# Run test queries
\dt                                    # List tables
SELECT COUNT(*) FROM knowledge_base;   # Check knowledge base
\q                                     # Exit
```

### 4. Vector Search Test
```bash
# Test embedding generation (after starting app)
curl -X POST http://localhost:3000/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "What are IFR separation requirements?"}'

# Test semantic search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "runway incursion procedures", "limit": 5}'
```

### 5. AI Chat Test
```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is the minimum separation for IFR aircraft?"
      }
    ]
  }'
```

### 6. Streaming Test
```bash
# Test streaming endpoint
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "Explain approach clearance procedures"
      }
    ]
  }'
```

## 🎯 Manual UI Testing

### 1. Basic Functionality
1. Open http://localhost:3000
2. Verify welcome screen appears
3. Click a quick prompt or type a question
4. Verify AI responds with proper formatting
5. Test conversation continuity

### 2. Streaming Features  
1. Ask a complex question
2. Verify "thinking" indicator appears
3. Watch for real-time streaming response
4. Confirm final response is complete

### 3. Chat History
1. Start multiple conversations
2. Switch between chat sessions
3. Verify history persists
4. Test "New Chat" functionality

### 4. UI Components
1. Test sidebar collapse/expand
2. Try different screen sizes (responsive)
3. Verify copy/feedback buttons work
4. Test keyboard shortcuts (Enter, Shift+Enter)

## 🔧 Performance Testing

### 1. Load Testing
```bash
# Install hey (HTTP load testing)
# macOS: brew install hey
# Linux: Download from GitHub releases

# Test basic endpoint
hey -n 100 -c 10 http://localhost:3000/api/health

# Test chat endpoint (lighter load due to API costs)
hey -n 10 -c 2 -m POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}' \
  http://localhost:3000/api/chat
```

### 2. Memory Usage
```bash
# Monitor Docker container resources
docker stats

# Check specific containers
docker stats airassist-postgres airassist-redis airassist-qdrant
```

### 3. Database Performance
```sql
-- Connect to database and run performance queries
\c airassist

-- Check slow queries (requires pg_stat_statements)
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'knowledge_base';

-- Check vector index performance
EXPLAIN ANALYZE SELECT * FROM knowledge_base 
ORDER BY embedding <-> '[0,0,0,...]' 
LIMIT 10;
```

## 🐛 Troubleshooting Common Issues

### Issue: Health Check Fails
```bash
# Check service status
docker-compose -f docker-compose.dev.yml ps

# Check logs
docker-compose -f docker-compose.dev.yml logs postgres
docker-compose -f docker-compose.dev.yml logs redis
docker-compose -f docker-compose.dev.yml logs qdrant

# Restart services
docker-compose -f docker-compose.dev.yml restart
```

### Issue: Database Connection Error
```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.dev.yml exec postgres pg_isready

# Check connection string
echo $DATABASE_URL

# Test manual connection
psql $DATABASE_URL -c "SELECT version();"
```

### Issue: Vector Search Not Working
```bash
# Check pgvector extension
docker-compose -f docker-compose.dev.yml exec postgres psql -U airassist_user -d airassist -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Check embedding data
docker-compose -f docker-compose.dev.yml exec postgres psql -U airassist_user -d airassist -c "SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL;"

# Test Qdrant connection
curl http://localhost:6333/collections
```

### Issue: API Rate Limits
```bash
# Check API key validity
curl -H "Authorization: Bearer $GOOGLE_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models"

# Monitor API usage in Google Cloud Console
# Check OpenAI usage dashboard

# Implement request queuing/throttling
```

### Issue: Streaming Not Working
```bash
# Check if streaming endpoint responds
curl -N -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'

# Check browser developer tools for SSE connection
# Verify Content-Type: text/event-stream header
```

## 📊 Monitoring & Alerts

### 1. Application Monitoring
```bash
# Check application logs
docker-compose logs -f app

# Monitor error rates
docker-compose logs app | grep -i error | tail -20

# Check response times
tail -f /var/log/nginx/access.log | awk '{print $10}'
```

### 2. Database Monitoring
```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

-- Database size
SELECT pg_size_pretty(pg_database_size('airassist'));

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Redis Monitoring
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check memory usage
INFO memory

# Check cache hit rates
INFO stats

# Monitor slow queries
SLOWLOG GET 10
```

## ✅ Production Testing

### 1. Pre-deployment Checklist
- [ ] All environment variables set
- [ ] SSL certificates configured
- [ ] Database backups tested
- [ ] Rate limiting configured
- [ ] Monitoring/alerting setup
- [ ] Security headers enabled

### 2. Post-deployment Verification
```bash
# Test production health
curl https://your-domain.com/api/health

# Check HTTPS configuration
curl -I https://your-domain.com

# Verify security headers
curl -I https://your-domain.com | grep -E "(X-Frame|X-Content|Referrer)"

# Test under load
hey -n 1000 -c 50 https://your-domain.com/api/health
```

### 3. Rollback Plan
```bash
# Keep previous version available
docker tag airassist_app:latest airassist_app:previous

# Quick rollback command
docker-compose down
docker-compose up -d --no-build

# Database rollback (if needed)
psql $DATABASE_URL < backup_before_deployment.sql
```

## 📝 Test Documentation

### Test Cases Template
```markdown
## Test Case: [Feature Name]
**Objective**: What are you testing?
**Prerequisites**: What needs to be set up?
**Steps**: 
1. Step one
2. Step two
3. Step three
**Expected Result**: What should happen?
**Actual Result**: What actually happened?
**Status**: Pass/Fail
**Notes**: Any additional observations
```

### Bug Report Template
```markdown
## Bug Report: [Issue Title]
**Severity**: Critical/High/Medium/Low
**Environment**: Development/Staging/Production
**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three
**Expected Behavior**: What should happen?
**Actual Behavior**: What actually happened?
**Screenshots/Logs**: Attach relevant files
**Browser/OS**: If UI-related
```

---

For comprehensive testing, run through all sections systematically. Report any issues found during testing to help improve the application.