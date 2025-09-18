#!/usr/bin/env npx tsx

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface KnowledgeBaseItem {
  id: string;
  content: string;
  metadata: any;
  displayName: string;
  tags: string[];
  summary: string;
}

interface SemanticSection {
  startIndex: number;
  endIndex: number;
  title: string;
  content: string;
  topic: string;
  procedureType: string;
  keywords: string[];
}

interface FocusedChunk {
  id: string;
  parentId: string;
  title: string;
  content: string;
  topic: string;
  semanticFocus: string;
  keywords: string[];
  chunkIndex: number;
  totalChunks: number;
  metadata: any;
  size: number;
}

// Semantic boundary patterns for ATC procedures
const SEMANTIC_BOUNDARIES = [
  {
    pattern: /^([A-Z\s]+APPLICATION|WAKE\s*TURBULENCE\s*APPLICATION|SEPARATION\s*APPLICATION)/m,
    topic: 'procedure_application',
    priority: 10
  },
  {
    pattern: /WAKE\s*TURBULENCE/i,
    topic: 'wake_turbulence',
    priority: 15
  },
  {
    pattern: /SEPARATION\s*MINIMA|MINIMA/i,
    topic: 'separation_minima',
    priority: 12
  },
  {
    pattern: /APPROACH\s*(PROCEDURES?|SEPARATION)/i,
    topic: 'approach_procedures',
    priority: 11
  },
  {
    pattern: /DEPARTURE\s*(PROCEDURES?|SEPARATION)/i,
    topic: 'departure_procedures',
    priority: 11
  },
  {
    pattern: /RADAR\s*SEPARATION/i,
    topic: 'radar_separation',
    priority: 10
  },
  {
    pattern: /EMERGENCY\s*(PROCEDURES?|AIRCRAFT)/i,
    topic: 'emergency_procedures',
    priority: 13
  },
  {
    pattern: /WEATHER\s*MINIMA/i,
    topic: 'weather_minimums',
    priority: 11
  },
  {
    pattern: /RUNWAY\s*INCURSION/i,
    topic: 'runway_incursion',
    priority: 12
  }
];

function identifySemanticBoundaries(content: string): SemanticSection[] {
  const lines = content.split('\n');
  const sections: SemanticSection[] = [];
  let currentSection: Partial<SemanticSection> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check for semantic boundaries
    let bestMatch = null;
    let bestPriority = 0;

    for (const boundary of SEMANTIC_BOUNDARIES) {
      if (boundary.pattern.test(line)) {
        if (boundary.priority > bestPriority) {
          bestMatch = boundary;
          bestPriority = boundary.priority;
        }
      }
    }

    if (bestMatch) {
      // Save previous section if exists
      if (currentSection && currentSection.startIndex !== undefined) {
        currentSection.endIndex = i;
        currentSection.content = extractSectionContent(lines, currentSection.startIndex, i);
        if (currentSection.content.length > 100) { // Only keep substantial sections
          sections.push(currentSection as SemanticSection);
        }
      }

      // Start new section
      currentSection = {
        startIndex: i,
        title: generateSectionTitle(line, bestMatch.topic),
        topic: bestMatch.topic,
        procedureType: determineProcedureType(bestMatch.topic),
        keywords: extractKeywords(line, bestMatch.topic)
      };
    }
  }

  // Handle last section
  if (currentSection && currentSection.startIndex !== undefined) {
    currentSection.endIndex = lines.length;
    currentSection.content = extractSectionContent(lines, currentSection.startIndex, lines.length);
    if (currentSection.content.length > 100) {
      sections.push(currentSection as SemanticSection);
    }
  }

  return sections;
}

function extractSectionContent(lines: string[], start: number, end: number): string {
  return lines.slice(start, end).join('\n').trim();
}

function generateSectionTitle(headerLine: string, topic: string): string {
  // Clean up the header line to create a readable title
  const cleaned = headerLine
    .replace(/^[^A-Za-z]*/, '') // Remove leading non-letters
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > 3) {
    return cleaned;
  }

  // Fallback to topic-based title
  const topicTitles: Record<string, string> = {
    'wake_turbulence': 'Wake Turbulence Procedures',
    'separation_minima': 'Separation Minima',
    'approach_procedures': 'Approach Procedures',
    'departure_procedures': 'Departure Procedures',
    'radar_separation': 'Radar Separation',
    'emergency_procedures': 'Emergency Procedures',
    'weather_minimums': 'Weather Minimums',
    'runway_incursion': 'Runway Incursion Procedures',
    'procedure_application': 'Procedure Application'
  };

  return topicTitles[topic] || 'Air Traffic Control Procedures';
}

function determineProcedureType(topic: string): string {
  const procedureTypes: Record<string, string> = {
    'wake_turbulence': 'separation',
    'separation_minima': 'separation',
    'approach_procedures': 'approach',
    'departure_procedures': 'departure',
    'radar_separation': 'separation',
    'emergency_procedures': 'emergency',
    'weather_minimums': 'weather',
    'runway_incursion': 'safety',
    'procedure_application': 'general'
  };

  return procedureTypes[topic] || 'general';
}

function extractKeywords(content: string, topic: string): string[] {
  const baseKeywords: Record<string, string[]> = {
    'wake_turbulence': ['wake turbulence', 'separation', 'heavy', 'super', 'large', 'small', 'B757'],
    'separation_minima': ['separation', 'minima', 'miles', 'distance', 'radar'],
    'approach_procedures': ['approach', 'final', 'runway', 'landing'],
    'departure_procedures': ['departure', 'takeoff', 'initial', 'climb'],
    'radar_separation': ['radar', 'separation', 'target', 'miles'],
    'emergency_procedures': ['emergency', 'alert', 'priority', 'assistance'],
    'weather_minimums': ['weather', 'minimums', 'visibility', 'ceiling'],
    'runway_incursion': ['runway', 'incursion', 'safety', 'alert'],
    'procedure_application': ['application', 'procedure', 'requirements']
  };

  const keywords = baseKeywords[topic] || [];

  // Add content-specific keywords
  const contentWords = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const frequentWords = contentWords
    .filter(word => !['application', 'procedure', 'aircraft', 'control'].includes(word))
    .slice(0, 3);

  return [...keywords, ...frequentWords];
}

function createFocusedChunks(item: KnowledgeBaseItem): FocusedChunk[] {
  const sections = identifySemanticBoundaries(item.content);

  if (sections.length <= 1) {
    // Document is already focused, return as single chunk
    return [{
      id: uuidv4(),
      parentId: item.id,
      title: item.displayName,
      content: item.content,
      topic: 'general',
      semanticFocus: item.summary || 'General ATC procedures',
      keywords: item.tags || [],
      chunkIndex: 0,
      totalChunks: 1,
      metadata: {
        ...item.metadata,
        original_id: item.id,
        chunked: false
      },
      size: item.content.length
    }];
  }

  // Create focused chunks from sections
  const chunks: FocusedChunk[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // Ensure chunk has sufficient content
    if (section.content.length < 200) {
      continue;
    }

    const chunkTitle = `${item.displayName} - ${section.title}`;
    const semanticFocus = generateSemanticFocus(section);

    chunks.push({
      id: uuidv4(),
      parentId: item.id,
      title: chunkTitle,
      content: section.content,
      topic: section.topic,
      semanticFocus,
      keywords: section.keywords,
      chunkIndex: i,
      totalChunks: sections.length,
      metadata: {
        ...item.metadata,
        original_id: item.id,
        chunked: true,
        chunk_topic: section.topic,
        procedure_type: section.procedureType,
        parent_title: item.displayName
      },
      size: section.content.length
    });
  }

  return chunks;
}

function generateSemanticFocus(section: SemanticSection): string {
  const focusTemplates: Record<string, string> = {
    'wake_turbulence': 'Wake turbulence separation requirements and procedures',
    'separation_minima': 'Aircraft separation minimum distances and requirements',
    'approach_procedures': 'Aircraft approach and landing procedures',
    'departure_procedures': 'Aircraft departure and takeoff procedures',
    'radar_separation': 'Radar-based aircraft separation procedures',
    'emergency_procedures': 'Emergency aircraft handling procedures',
    'weather_minimums': 'Weather minimum requirements for operations',
    'runway_incursion': 'Runway safety and incursion prevention procedures',
    'procedure_application': 'General procedure application and requirements'
  };

  return focusTemplates[section.topic] || 'Air traffic control procedures and requirements';
}

async function chunkKnowledgeBase() {
  console.log('🔧 Starting knowledge base chunking process...\n');

  const inputPath = path.join(__dirname, '../knowledge-base.json');
  const outputPath = path.join(__dirname, '../knowledge-base-chunked.json');
  const analysisPath = path.join(__dirname, '../knowledge-base-analysis.json');

  if (!fs.existsSync(inputPath)) {
    console.error('❌ knowledge-base.json not found');
    process.exit(1);
  }

  if (!fs.existsSync(analysisPath)) {
    console.error('❌ knowledge-base-analysis.json not found. Run analyze-knowledge-base-quality.ts first.');
    process.exit(1);
  }

  // Load original data and analysis
  const knowledgeBase: KnowledgeBaseItem[] = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

  console.log(`📚 Processing ${knowledgeBase.length} documents...`);

  const chunkedKnowledgeBase: FocusedChunk[] = [];
  let chunkedDocuments = 0;
  let totalChunks = 0;

  for (const item of knowledgeBase) {
    const docAnalysis = analysis.find((a: any) => a.title === item.displayName);

    if (docAnalysis?.needsChunking) {
      console.log(`🔧 Chunking: ${item.displayName} (${item.content.length} chars, ${docAnalysis.topicCount} topics)`);

      const chunks = createFocusedChunks(item);
      chunkedKnowledgeBase.push(...chunks);

      chunkedDocuments++;
      totalChunks += chunks.length;

      console.log(`   ✅ Created ${chunks.length} focused chunks`);
      chunks.forEach((chunk, i) => {
        console.log(`      ${i + 1}. ${chunk.title} (${chunk.size} chars, topic: ${chunk.topic})`);
      });
    } else {
      // Keep as single focused chunk
      const singleChunk = createFocusedChunks(item)[0];
      chunkedKnowledgeBase.push(singleChunk);
      console.log(`✅ Keeping focused: ${item.displayName}`);
    }
  }

  // Save chunked knowledge base
  fs.writeFileSync(outputPath, JSON.stringify(chunkedKnowledgeBase, null, 2));

  console.log('\n📊 CHUNKING RESULTS:');
  console.log(`📄 Original documents: ${knowledgeBase.length}`);
  console.log(`🔧 Documents chunked: ${chunkedDocuments}`);
  console.log(`📑 Total chunks created: ${chunkedKnowledgeBase.length}`);
  console.log(`📈 Chunking efficiency: ${totalChunks} chunks from ${chunkedDocuments} documents`);
  console.log(`💾 Chunked knowledge base saved to: ${outputPath}`);

  // Specific analysis for wake turbulence case
  console.log('\n🌪️  WAKE TURBULENCE CHUNKING ANALYSIS:');
  const wakeTurbulenceChunks = chunkedKnowledgeBase.filter(chunk =>
    chunk.keywords.includes('wake turbulence') || chunk.topic === 'wake_turbulence'
  );

  console.log(`📄 Found ${wakeTurbulenceChunks.length} wake turbulence-focused chunks:`);
  wakeTurbulenceChunks.forEach(chunk => {
    console.log(`   • ${chunk.title} (${chunk.size} chars)`);
    console.log(`     Focus: ${chunk.semanticFocus}`);
    console.log(`     Keywords: ${chunk.keywords.slice(0, 5).join(', ')}`);
  });

  return chunkedKnowledgeBase;
}

// Run chunking if called directly
if (require.main === module) {
  chunkKnowledgeBase().catch(console.error);
}

export { chunkKnowledgeBase, createFocusedChunks };