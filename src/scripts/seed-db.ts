import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { KNOWLEDGE_BASE_JSON } from "../lib/mock-data";

// This function transforms your scraped data into the format the app expects.
function transformData(scrapedData: any) {
  const chapters = Object.values(scrapedData.faa_manual);
    return chapters.map((item: any, index: number) => {
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
        
        const id = `scraped_item_${item.order || index}`;

        // Create a summary (first 150 chars) or use title
        const summary = item.content ? item.content.substring(0, 150) + '...' : item.title;

        // Extract chapter and section from title if possible
        const titleMatch = item.title ? item.title.match(/Chapter (\d+) - Section (\d+)/) : null;
        const chapter = item.chapter_number || (titleMatch ? titleMatch[1] : (item.title ? item.title.match(/Chapter (\d+)/)?.[1] || "" : ""));
        const section = titleMatch ? titleMatch[2] : "";


        return {
            id: id,
            content: item.content || `Scraped metadata for: ${item.title}. URL: ${item.url}. Word Count: ${item.word_count}.`,
            metadata: {
                title: item.title || "Untitled",
                type: item.type || "content",
                procedure_type: "general", // You can define logic for this
                chapter: chapter.toString(), 
                section: section,
                paragraph: "", // Placeholder
                source: item.url && item.url.includes("faa.gov") ? "FAA JO 7110.65" : "IVAO", // Example logic
                chunk_index: item.order || index,
                total_chunks: chapters.length,
                url: item.url,
                word_count: item.word_count,
                char_count: item.char_count,
                scraped_at: item.scraped_at,
            },
            displayName: item.title || "Untitled",
            tags: generateTags(item.content || item.title || ""),
            summary: summary,
        };
    });
}


async function seedDatabase() {
    const dataToSeed = KNOWLEDGE_BASE_JSON;

    if (!dataToSeed.faa_manual || Object.keys(dataToSeed.faa_manual).length === 0) {
        console.log("No data found in KNOWLEDGE_BASE_JSON. Please add your scraped data to src/lib/mock-data.ts.");
        return;
    }

    console.log("Transforming and seeding your scraped data...");
    
    const transformedData = transformData(dataToSeed);
    
    const batch = writeBatch(db);
    const knowledgeBaseCollection = collection(db, "knowledge-base");

    transformedData.forEach((item) => {
        const docRef = doc(knowledgeBaseCollection, item.id);
        batch.set(docRef, item);
    });

    try {
        await batch.commit();
        console.log(`Database seeded successfully with ${transformedData.length} documents!`);
    } catch (error) {
        console.error("Error seeding database: ", error);
    }
}

seedDatabase();
