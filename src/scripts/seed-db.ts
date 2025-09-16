
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { insertKnowledgeBaseItem, type KnowledgeBaseItem } from "../lib/database-pg";
import { getEmbedding } from "../lib/embeddings";
import * as fs from 'fs';
import * as path from 'path';

// This function transforms FAA data into the format the app expects.
function transformData(data: any, fileName: string): KnowledgeBaseItem[] {
    if (!data || !data.chunks) {
        console.error(`Error: The provided data in ${fileName} does not contain a 'chunks' array.`);
        return [];
    }
    const chunks = data.chunks;
    console.log(`Found ${chunks.length} chunks in ${fileName} to process.`);

    return chunks.map((chunk: any, index: number): KnowledgeBaseItem => {
        // Basic function to extract keywords for tags.
        const generateTags = (content: string) => {
            if (!content) return [];
            const words = content.toLowerCase().match(/\b(\w+)\b/g) || [];
            const commonWords = new Set(['the', 'a', 'in', 'is', 'it', 'of', 'and', 'to', 'or', 'for', 'an', 'this', 'that', 'with', 'from', 'by', 'at']);
            const wordCount: { [key: string]: number } = {};
            words.forEach(word => {
                if (!commonWords.has(word) && isNaN(parseInt(word)) && word.length > 3) {
                    wordCount[word] = (wordCount[word] || 0) + 1;
                }
            });
            return Object.keys(wordCount).sort((a, b) => wordCount[b] - wordCount[a]).slice(0, 8);
        };

        // Create a summary (first 200 chars)
        const summary = chunk.text ? chunk.text.substring(0, 200).trim() + '...' : '';

        // Extract chapter and section from text if possible
        const chapterMatch = chunk.text.match(/Chapter (\d+)/i);
        const sectionMatch = chunk.text.match(/Section (\d+)/i);
        const paragraphMatch = chunk.text.match(/(\d+)\s*−\s*(\d+)\s*−\s*(\d+)/);
        
        const chapter = chapterMatch ? chapterMatch[1] : '';
        const section = sectionMatch ? sectionMatch[1] : '';
        const paragraph = paragraphMatch ? paragraphMatch[0] : '';

        return {
            id: crypto.randomUUID(),
            content: chunk.text,
            display_name: `${data.document} - Page ${chunk.page_number}`,
            summary: summary,
            tags: generateTags(chunk.text),
            metadata: {
                title: `${data.document} - Page ${chunk.page_number}`,
                type: "faa_document",
                procedure_type: "air_traffic_control",
                chapter: chapter,
                section: section,
                paragraph: paragraph,
                source: data.document,
                chunk_index: index,
                total_chunks: chunks.length,
                url: `page_${chunk.page_number}`,
                word_count: chunk.text ? chunk.text.split(/\s+/).length : 0,
                char_count: chunk.text ? chunk.text.length : 0,
                scraped_at: new Date().toISOString(),
            }
        };
    });
}


async function seedDatabase() {
    // Check both locations: data/ and src/data/
    const dataDirs = [
        path.join(process.cwd(), 'data'),
        path.join(process.cwd(), 'src', 'data')
    ];
    
    let dataDir = '';
    let allDocuments: any[] = [];

    // Find which directory exists and has JSON files
    for (const dir of dataDirs) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
            if (files.length > 0) {
                dataDir = dir;
                console.log(`Found knowledge base files in: ${dataDir}`);
                break;
            }
        }
    }

    if (!dataDir) {
        console.log("No JSON knowledge base files found in data/ or src/data/ directories.");
        console.log("Creating sample data structure...");
        
        // Create sample data directory and file
        const sampleDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(sampleDir)) {
            fs.mkdirSync(sampleDir, { recursive: true });
        }
        
        const sampleData = {
            document: "Sample ATC Procedures",
            chunks: [
                {
                    id: "sample-1",
                    text: "Standard separation between IFR aircraft in controlled airspace is 3 nautical miles laterally or 1000 feet vertically. This ensures safe operation of aircraft under instrument flight rules.",
                    page_number: 1
                },
                {
                    id: "sample-2", 
                    text: "Visual approach clearance may be issued when the pilot reports the airport or preceding aircraft in sight and weather conditions are at or above basic VFR minimums.",
                    page_number: 2
                }
            ]
        };
        
        fs.writeFileSync(path.join(sampleDir, 'sample-atc-procedures.json'), JSON.stringify(sampleData, null, 2));
        console.log("Created sample data file: data/sample-atc-procedures.json");
        dataDir = sampleDir;
    }

    try {
        const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

        if (files.length === 0) {
            console.log("No JSON files found in the src/data directory. Nothing to seed.");
            return;
        }

        console.log(`Found ${files.length} knowledge base files to process.`);

        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const jsonData = JSON.parse(fileContent);
            const transformedData = transformData(jsonData, file);
            allDocuments.push(...transformedData);
        }
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.error("Error: The 'src/data' directory does not exist. Please create it and add your JSON knowledge base files.");
        } else {
            console.error("Error reading or parsing knowledge base files:", error.message);
        }
        return;
    }
    

    if (allDocuments.length === 0) {
        console.error("Transformation resulted in no data. Please check the format of your JSON files in src/data.");
        return;
    }
    
    try {
        console.log(`Processing ${allDocuments.length} documents with embeddings...`);
        
        // Process documents in batches to avoid API limits
        const batchSize = 5;
        for (let i = 0; i < allDocuments.length; i += batchSize) {
            const batch = allDocuments.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allDocuments.length/batchSize)}`);
            
            for (const item of batch) {
                try {
                    // Generate embedding for the content
                    const embedding = await getEmbedding(item.content);
                    const itemWithEmbedding = { ...item, embedding };
                    
                    await insertKnowledgeBaseItem(itemWithEmbedding);
                    console.log(`✓ Processed: ${item.display_name}`);
                } catch (error: any) {
                    console.error(`✗ Failed to process ${item.display_name}:`, error.message);
                    // Insert without embedding as fallback
                    await insertKnowledgeBaseItem(item);
                }
            }
            
            // Small delay between batches
            if (i + batchSize < allDocuments.length) {
                console.log('Waiting 1 second between batches...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`🎉 Database seeded successfully with ${allDocuments.length} total documents!`);
        console.log('📊 Next steps:');
        console.log('  1. Start the development server: npm run dev');
        console.log('  2. Test the application: http://localhost:3000');
        console.log('  3. Deploy to Fly.io: ./deploy-fly.sh');
    } catch (error: any) {
        console.error("❌ Error seeding database:", error.message);
        console.log("🔧 Troubleshooting:");
        console.log("  1. Make sure PostgreSQL is running");
        console.log("  2. Check your DATABASE_URL environment variable");
        console.log("  3. Verify your OpenAI API key for embeddings");
    }
}

seedDatabase();
