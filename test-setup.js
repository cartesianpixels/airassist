#!/usr/bin/env node

// Quick test to verify all imports work correctly
console.log('🧪 Testing ATC Assistant setup...\n');

try {
  // Test database imports
  console.log('✓ Testing database imports...');
  const db = require('./src/lib/database-pg');
  console.log('✓ PostgreSQL database module loaded');

  // Test embeddings import
  console.log('✓ Testing embeddings imports...');
  const embeddings = require('./src/lib/embeddings');
  console.log('✓ Embeddings module loaded');

  // Test semantic search import
  console.log('✓ Testing semantic search imports...');
  const search = require('./src/lib/semantic-search');
  console.log('✓ Semantic search module loaded');

  // Test AI assistant import
  console.log('✓ Testing AI assistant imports...');
  const assistant = require('./src/ai/assistant');
  console.log('✓ AI assistant module loaded');

  console.log('\n🎉 All modules loaded successfully!');
  console.log('\n📋 Next steps:');
  console.log('  1. Start databases: npm run docker:dev');
  console.log('  2. Run migrations: npm run db:migrate'); 
  console.log('  3. Seed database: npm run seed');
  console.log('  4. Start dev server: npm run dev');

} catch (error) {
  console.error('❌ Import error:', error.message);
  console.log('\n🔧 This usually means:');
  console.log('  1. Run: npm install');
  console.log('  2. Check your .env file has correct values');
  console.log('  3. Make sure databases are running');
  process.exit(1);
}