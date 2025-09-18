#!/usr/bin/env npx tsx

import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeBaseItem {
  id: string;
  content: string;
  metadata: {
    title: string;
    type: string;
    procedure_type: string;
    chapter: string;
    section: string;
    paragraph: string;
    source: string;
    chunk_index: number;
    total_chunks: number;
    url: string;
    word_count: number;
    char_count: number;
    scraped_at: string;
  };
  displayName: string;
  tags: string[];
  summary: string;
}

function extractActualContent(rawContent: string): string {
  // Remove the standard navigation header and menu that appears in every document

  // 1. Remove the header pattern: "TITLE\n7110.65BB\nSearch!\n7110.65 by Chapter Number"
  const headerPattern = /^[^\n]*\n7110\.65BB\nSearch!\n7110\.65 by Chapter Number\n/;
  let cleaned = rawContent.replace(headerPattern, '');

  // 2. Remove the massive navigation menu that's identical across all documents
  // This starts with "Chapter 1. General..." and ends with "Pilot/Controller Glossary"
  const navigationPattern = /Chapter 1\. General.*?Pilot\/Controller Glossary\n/s;
  cleaned = cleaned.replace(navigationPattern, '');

  // 3. Remove duplicate title at the start of actual content
  // Pattern: "TitleTitle\nSection X. Title"
  const duplicateTitlePattern = /^([^\n]+)\1\n/;
  cleaned = cleaned.replace(duplicateTitlePattern, '');

  // 4. Remove the footer navigation
  const footerPattern = /\nPrevious \| Top.*?Send your comments regarding this website\.$/s;
  cleaned = cleaned.replace(footerPattern, '');

  // 5. Clean up extra whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

function updateWordAndCharCounts(item: KnowledgeBaseItem, cleanedContent: string): KnowledgeBaseItem {
  const wordCount = cleanedContent.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = cleanedContent.length;

  return {
    ...item,
    content: cleanedContent,
    metadata: {
      ...item.metadata,
      word_count: wordCount,
      char_count: charCount
    }
  };
}

function cleanKnowledgeBase() {
  console.log('🧹 Starting knowledge base content cleaning...');

  const inputPath = path.join(__dirname, '../knowledge-base.json');
  const outputPath = path.join(__dirname, '../knowledge-base-cleaned.json');
  const backupPath = path.join(__dirname, '../knowledge-base-backup.json');

  if (!fs.existsSync(inputPath)) {
    console.error('❌ knowledge-base.json not found');
    process.exit(1);
  }

  // Create backup
  console.log('💾 Creating backup...');
  fs.copyFileSync(inputPath, backupPath);

  // Load and process
  console.log('📚 Loading knowledge base...');
  const rawData = fs.readFileSync(inputPath, 'utf8');
  const knowledgeBase: KnowledgeBaseItem[] = JSON.parse(rawData);

  console.log(`📊 Processing ${knowledgeBase.length} documents...`);

  let cleanedCount = 0;
  let totalContentBefore = 0;
  let totalContentAfter = 0;

  const cleanedKnowledgeBase = knowledgeBase.map((item, index) => {
    const originalLength = item.content.length;
    totalContentBefore += originalLength;

    const cleanedContent = extractActualContent(item.content);
    const updatedItem = updateWordAndCharCounts(item, cleanedContent);

    const newLength = cleanedContent.length;
    totalContentAfter += newLength;

    const reductionPercent = ((originalLength - newLength) / originalLength * 100).toFixed(1);

    if (newLength < originalLength) {
      cleanedCount++;
      console.log(`✅ ${item.displayName}: ${originalLength} → ${newLength} chars (-${reductionPercent}%)`);
    } else {
      console.log(`⚠️  ${item.displayName}: No cleaning needed`);
    }

    return updatedItem;
  });

  // Save cleaned version
  console.log('💾 Saving cleaned knowledge base...');
  fs.writeFileSync(outputPath, JSON.stringify(cleanedKnowledgeBase, null, 2));

  // Report results
  const totalReduction = ((totalContentBefore - totalContentAfter) / totalContentBefore * 100).toFixed(1);

  console.log('\n📊 CLEANING RESULTS:');
  console.log(`✅ Documents processed: ${knowledgeBase.length}`);
  console.log(`🧹 Documents cleaned: ${cleanedCount}`);
  console.log(`📉 Total content reduction: ${totalReduction}% (${totalContentBefore} → ${totalContentAfter} chars)`);
  console.log(`💾 Original backed up to: ${backupPath}`);
  console.log(`✨ Cleaned version saved to: ${outputPath}`);

  console.log('\n🔍 Sample cleaned content (Chapter 5 Section 5):');
  const chapter5Section5 = cleanedKnowledgeBase.find(item =>
    item.displayName === 'Chapter 5 - Section 5'
  );

  if (chapter5Section5) {
    console.log('📄 First 500 characters:');
    console.log(chapter5Section5.content.substring(0, 500) + '...');
    console.log(`\n🏷️  Wake turbulence content found: ${chapter5Section5.content.includes('WAKE TURBULENCE') ? 'YES ✅' : 'NO ❌'}`);
  }

  console.log('\n🚀 Next steps:');
  console.log('1. Review the cleaned content in knowledge-base-cleaned.json');
  console.log('2. If satisfied, replace knowledge-base.json with the cleaned version');
  console.log('3. Re-run embedding generation for the cleaned content');
  console.log('4. Test similarity search with wake turbulence queries');
}

// Run the cleaning process
if (require.main === module) {
  cleanKnowledgeBase();
}

export { cleanKnowledgeBase, extractActualContent };