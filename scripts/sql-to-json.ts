import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeEntry {
  id: string;
  content: string;
  display_name: string;
  summary?: string;
  tags?: any;
  metadata: any;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

function parseSQLToJSON(sqlFilePath: string): KnowledgeEntry[] {
  console.log(`📄 Processing ${sqlFilePath}...`);

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ File not found: ${sqlFilePath}`);
    return [];
  }

  const content = fs.readFileSync(sqlFilePath, 'utf8');
  const entries: KnowledgeEntry[] = [];

  // Extract data between COPY statement and \.
  const lines = content.split('\n');
  let inKnowledgeBaseSection = false;
  let currentRecord = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of knowledge_base data section
    if (line.includes('COPY public.knowledge_base')) {
      inKnowledgeBaseSection = true;
      console.log('🔍 Found knowledge_base COPY section');
      continue;
    }

    // End of data section
    if (line.trim() === '\\.' && inKnowledgeBaseSection) {
      // Process the last record if exists
      if (currentRecord.trim()) {
        const entry = parseTabSeparatedRecord(currentRecord);
        if (entry) entries.push(entry);
      }
      break;
    }

    if (inKnowledgeBaseSection) {
      // Check if this line starts with a UUID (new record)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\t/;

      if (uuidPattern.test(line)) {
        // Process previous record if exists
        if (currentRecord.trim()) {
          const entry = parseTabSeparatedRecord(currentRecord);
          if (entry) entries.push(entry);
        }
        // Start new record
        currentRecord = line;
      } else {
        // Continue previous record (multiline content)
        currentRecord += '\n' + line;
      }
    }
  }

  console.log(`✅ Parsed ${entries.length} records`);
  return entries;
}

function parseTabSeparatedRecord(record: string): KnowledgeEntry | null {
  try {
    // Split by tabs, but be careful with embedded tabs in content
    const parts = record.split('\t');

    if (parts.length < 9) {
      console.warn(`⚠️ Record has only ${parts.length} parts, expected 9`);
      return null;
    }

    const entry: KnowledgeEntry = {
      id: parts[0],
      content: parts[1],
      display_name: parts[2],
      summary: parts[3] === '\\N' ? undefined : parts[3],
      tags: parts[4] === '\\N' ? undefined : JSON.parse(parts[4]),
      metadata: JSON.parse(parts[5]),
      embedding: parts[6] === '\\N' ? undefined : JSON.parse(parts[6]),
      created_at: parts[7],
      updated_at: parts[8]
    };

    return entry;
  } catch (error) {
    console.warn(`⚠️ Failed to parse record: ${error.message}`);
    return null;
  }
}

function main() {
  const dumpsDir = path.join(process.cwd(), 'dumps');
  const sqlFile = path.join(dumpsDir, 'production-db-latest.sql');
  const outputFile = path.join(dumpsDir, 'knowledge_base.json');

  console.log('🚀 SQL to JSON Converter');
  console.log(`📂 Input: ${sqlFile}`);
  console.log(`📁 Output: ${outputFile}`);

  const entries = parseSQLToJSON(sqlFile);

  if (entries.length === 0) {
    console.log('❌ No records found');
    return;
  }

  // Write to JSON file
  fs.writeFileSync(outputFile, JSON.stringify(entries, null, 2), 'utf8');

  console.log(`✅ Successfully converted ${entries.length} records to JSON`);
  console.log(`📊 Output file size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { parseSQLToJSON };