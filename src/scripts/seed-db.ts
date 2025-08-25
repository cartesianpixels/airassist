
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import * as fs from 'fs';
import * as path from 'path';

// This function transforms scraped data into the format the app expects.
function transformData(scrapedData: any, fileName: string) {
    if (!scrapedData || !scrapedData.documents) {
        console.error(`Error: The provided data in ${fileName} does not contain a 'documents' array.`);
        return [];
    }
    const documents = scrapedData.documents;
    console.log(`Found ${documents.length} documents in ${fileName} to process.`);

    return documents.map((item: any, index: number) => {
        // Basic function to extract keywords for tags. You can improve this.
        const generateTags = (content: string) => {
            if (!content) return [];
            const words = content.toLowerCase().match(/\b(\w+)\b/g) || [];
            const commonWords = new Set(['the', 'a', 'in', 'is', 'it', 'of', 'and', 'to', 'or', 'for', 'an']);
            const wordCount: { [key: string]: number } = {};
            words.forEach(word => {
                if (!commonWords.has(word) && isNaN(parseInt(word)) && word.length > 2) {
                    wordCount[word] = (wordCount[word] || 0) + 1;
                }
            });
            return Object.keys(wordCount).sort((a, b) => wordCount[b] - wordCount[a]).slice(0, 5);
        };
        
        const id = `scraped_item_${item.title ? item.title.replace(/\s+/g, '_') : fileName + '_' + index}`;

        // Create a summary (first 150 chars) or use title
        const summary = item.content ? item.content.substring(0, 150) + '...' : item.title;

        // Extract chapter and section from title if possible
        const titleMatch = item.title ? item.title.match(/Chapter (\d+) - Section (\d+)/) : null;
        const chapter = item.chapter_number || (titleMatch ? titleMatch[1] : (item.title ? item.title.match(/Chapter (\d+)/)?.[1] || "" : ""));
        const section = titleMatch ? titleMatch[2] : "";

        return {
            id: id,
            content: item.content || `Scraped metadata for: ${item.title}. URL: ${item.url}.`,
            metadata: {
                title: item.title || "Untitled",
                type: item.type || "content",
                procedure_type: "general", // You can define logic for this
                chapter: chapter.toString(), 
                section: section,
                paragraph: "", // Placeholder
                source: item.url || fileName,
                chunk_index: item.order || index,
                total_chunks: documents.length,
                url: item.url,
                word_count: item.word_count || (item.content ? item.content.split(' ').length : 0),
                char_count: item.char_count || (item.content ? item.content.length : 0),
                scraped_at: item.scraped_at || new Date().toISOString(),
            },
            displayName: item.title || "Untitled",
            tags: generateTags(item.content || item.title || ""),
            summary: summary,
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
            allDocuments = allDocuments.concat(transformedData);
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
    
    const batch = writeBatch(db);
    const knowledgeBaseCollection = collection(db, "knowledge-base");

    allDocuments.forEach((item) => {
        const docRef = doc(knowledgeBaseCollection, item.id);
        batch.set(docRef, item);
    });

    try {
        await batch.commit();
        console.log(`Database seeded successfully with ${allDocuments.length} total documents!`);
    } catch (error: any) {
        console.error("Error seeding database: ", error.message);
        if (error.code === 'not-found' || (error.code === 5 && error.message.includes("NOT_FOUND")) ) {
            console.error("\nThis 'NOT_FOUND' error usually means the Firestore database has not been created yet.");
            console.error("Please go to your Firebase project console, navigate to 'Build' -> 'Firestore Database', and click 'Create database'.");
        }
    }
}

seedDatabase();
