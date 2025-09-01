
import { insertKnowledgeBaseItem, type KnowledgeBaseItem } from "../lib/database";
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
            id: chunk.id,
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
    const dataDir = path.join(process.cwd(), 'src', 'data');
    let allDocuments: any[] = [];

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
        // Create data directory if it doesn't exist
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        allDocuments.forEach((item: KnowledgeBaseItem) => {
            insertKnowledgeBaseItem(item);
        });

        console.log(`Database seeded successfully with ${allDocuments.length} total documents!`);
    } catch (error: any) {
        console.error("Error seeding database: ", error.message);
    }
}

seedDatabase();
