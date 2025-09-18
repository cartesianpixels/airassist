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

interface DocumentAnalysis {
  id: string;
  title: string;
  size: number;
  topicCount: number;
  mainTopics: string[];
  contentDensity: number;
  embeddingQuality: 'focused' | 'mixed' | 'diluted';
  needsChunking: boolean;
  chunkingPriority: 'high' | 'medium' | 'low';
}

// Key topics and procedures to identify in documents
const PROCEDURE_TOPICS = [
  'wake turbulence',
  'separation minima',
  'approach procedures',
  'departure procedures',
  'radar separation',
  'emergency procedures',
  'weather minimums',
  'runway incursion',
  'aircraft categories',
  'clearance procedures',
  'navigation procedures',
  'communication procedures'
];

function analyzeTopicDiversity(content: string): { topicCount: number; mainTopics: string[] } {
  const lowerContent = content.toLowerCase();
  const foundTopics: string[] = [];

  for (const topic of PROCEDURE_TOPICS) {
    if (lowerContent.includes(topic)) {
      foundTopics.push(topic);
    }
  }

  // Additional topic detection based on common ATC terms
  const proceduralSections = content.split(/\n\n+/);
  const distinctSections = proceduralSections.filter(section => {
    // Count sections that contain procedural information
    return /\d+\s*(miles?|minutes?|feet|nm|degrees)|APPLICATION|PROCEDURE|MINIMA|SEPARATION/i.test(section);
  });

  return {
    topicCount: Math.max(foundTopics.length, Math.ceil(distinctSections.length / 3)),
    mainTopics: foundTopics
  };
}

function calculateContentDensity(content: string): number {
  // Measure how much procedural vs narrative content
  const proceduralContent = content.match(/\d+\s*(miles?|minutes?|feet|nm|degrees)/g) || [];
  const totalWords = content.split(/\s+/).length;

  return proceduralContent.length / totalWords * 100;
}

function assessEmbeddingQuality(analysis: Partial<DocumentAnalysis>): {
  embeddingQuality: 'focused' | 'mixed' | 'diluted';
  needsChunking: boolean;
  chunkingPriority: 'high' | 'medium' | 'low';
} {
  const { size = 0, topicCount = 0, contentDensity = 0 } = analysis;

  // Determine if document is focused or diluted
  let embeddingQuality: 'focused' | 'mixed' | 'diluted';
  let needsChunking = false;
  let chunkingPriority: 'high' | 'medium' | 'low' = 'low';

  if (size > 10000 && topicCount > 3) {
    embeddingQuality = 'diluted';
    needsChunking = true;
    chunkingPriority = 'high';
  } else if (size > 5000 && topicCount > 2) {
    embeddingQuality = 'mixed';
    needsChunking = true;
    chunkingPriority = 'medium';
  } else if (size > 15000) {
    embeddingQuality = 'diluted';
    needsChunking = true;
    chunkingPriority = 'high';
  } else {
    embeddingQuality = 'focused';
    needsChunking = false;
  }

  return { embeddingQuality, needsChunking, chunkingPriority };
}

function analyzeDocument(item: KnowledgeBaseItem): DocumentAnalysis {
  const size = item.content.length;
  const { topicCount, mainTopics } = analyzeTopicDiversity(item.content);
  const contentDensity = calculateContentDensity(item.content);

  const qualityAssessment = assessEmbeddingQuality({
    size,
    topicCount,
    contentDensity
  });

  return {
    id: item.id,
    title: item.displayName,
    size,
    topicCount,
    mainTopics,
    contentDensity,
    ...qualityAssessment
  };
}

async function analyzeKnowledgeBase() {
  console.log('🔍 Analyzing knowledge base embedding quality...\n');

  const inputPath = path.join(__dirname, '../knowledge-base.json');

  if (!fs.existsSync(inputPath)) {
    console.error('❌ knowledge-base.json not found');
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputPath, 'utf8');
  const knowledgeBase: KnowledgeBaseItem[] = JSON.parse(rawData);

  console.log(`📊 Analyzing ${knowledgeBase.length} documents...\n`);

  const analyses: DocumentAnalysis[] = [];
  const summary = {
    total: knowledgeBase.length,
    focused: 0,
    mixed: 0,
    diluted: 0,
    needsChunking: 0,
    highPriority: 0,
    mediumPriority: 0,
    totalChars: 0,
    averageSize: 0
  };

  for (const item of knowledgeBase) {
    const analysis = analyzeDocument(item);
    analyses.push(analysis);

    // Update summary
    summary[analysis.embeddingQuality]++;
    if (analysis.needsChunking) summary.needsChunking++;
    if (analysis.chunkingPriority === 'high') summary.highPriority++;
    if (analysis.chunkingPriority === 'medium') summary.mediumPriority++;
    summary.totalChars += analysis.size;
  }

  summary.averageSize = Math.round(summary.totalChars / summary.total);

  // Print summary
  console.log('📋 EMBEDDING QUALITY ANALYSIS SUMMARY:');
  console.log(`📄 Total documents: ${summary.total}`);
  console.log(`✅ Focused (good embeddings): ${summary.focused} (${(summary.focused/summary.total*100).toFixed(1)}%)`);
  console.log(`⚠️  Mixed (some dilution): ${summary.mixed} (${(summary.mixed/summary.total*100).toFixed(1)}%)`);
  console.log(`❌ Diluted (poor embeddings): ${summary.diluted} (${(summary.diluted/summary.total*100).toFixed(1)}%)`);
  console.log(`🔧 Need chunking: ${summary.needsChunking} (${(summary.needsChunking/summary.total*100).toFixed(1)}%)`);
  console.log(`🚨 High priority: ${summary.highPriority}`);
  console.log(`📈 Medium priority: ${summary.mediumPriority}`);
  console.log(`📊 Average document size: ${summary.averageSize} chars\n`);

  // Show problematic documents
  console.log('🔥 HIGH PRIORITY CHUNKING CANDIDATES:');
  const highPriorityDocs = analyses
    .filter(a => a.chunkingPriority === 'high')
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  for (const doc of highPriorityDocs) {
    console.log(`📄 ${doc.title}`);
    console.log(`   Size: ${doc.size.toLocaleString()} chars | Topics: ${doc.topicCount} | Density: ${doc.contentDensity.toFixed(1)}%`);
    console.log(`   Main topics: ${doc.mainTopics.slice(0, 3).join(', ')}${doc.mainTopics.length > 3 ? '...' : ''}`);
    console.log('');
  }

  // Specific analysis for wake turbulence case
  console.log('🌪️  WAKE TURBULENCE CASE ANALYSIS:');
  const chapter5section5 = analyses.find(a => a.title === 'Chapter 5 - Section 5');
  const chapter6section2 = analyses.find(a => a.title === 'Chapter 6 - Section 2');

  if (chapter5section5) {
    console.log(`📄 Chapter 5 Section 5: ${chapter5section5.size} chars, ${chapter5section5.topicCount} topics`);
    console.log(`   Quality: ${chapter5section5.embeddingQuality}, Chunking: ${chapter5section5.chunkingPriority} priority`);
    console.log(`   Topics: ${chapter5section5.mainTopics.join(', ')}`);
  }

  if (chapter6section2) {
    console.log(`📄 Chapter 6 Section 2: ${chapter6section2.size} chars, ${chapter6section2.topicCount} topics`);
    console.log(`   Quality: ${chapter6section2.embeddingQuality}, Chunking: ${chapter6section2.chunkingPriority} priority`);
    console.log(`   Topics: ${chapter6section2.mainTopics.join(', ')}`);
  }

  // Save detailed analysis
  const outputPath = path.join(__dirname, '../knowledge-base-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(analyses, null, 2));
  console.log(`\n💾 Detailed analysis saved to: ${outputPath}`);

  // Return summary for further processing
  return { analyses, summary };
}

// Run analysis if called directly
if (require.main === module) {
  analyzeKnowledgeBase().catch(console.error);
}

export { analyzeKnowledgeBase, analyzeDocument };