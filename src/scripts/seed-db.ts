import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { YOUR_SCRAPED_KNOWLEDGE_BASE_JSON } from "../lib/mock-data";

// This function transforms your scraped data into the format the app expects.
function transformData(scrapedData: any[]) {
    return scrapedData.map((item, index) => {
        // Basic function to extract keywords for tags. You can improve this.
        const generateTags = (content: string) => {
            const words = content.toLowerCase().match(/\b(\w+)\b/g) || [];
            const commonWords = new Set(['the', 'a', 'in', 'is', 'it', 'of', 'and', 'to']);
            const wordCount: { [key: string]: number } = {};
            words.forEach(word => {
                if (!commonWords.has(word) && isNaN(parseInt(word))) {
                    wordCount[word] = (wordCount[word] || 0) + 1;
                }
            });
            return Object.keys(wordCount).sort((a, b) => wordCount[b] - wordCount[a]).slice(0, 5);
        };
        
        const id = `scraped_item_${item.order || index}`;

        // Create a summary (first 150 chars) or use title
        const summary = item.content ? item.content.substring(0, 150) + '...' : item.title;

        return {
            id: id,
            content: item.content || "", // Assuming you have a 'content' field
            metadata: {
                title: item.title || "Untitled",
                type: "content",
                procedure_type: "general", // You can define logic for this
                chapter: "", // Placeholder
                section: "", // Placeholder
                paragraph: "", // Placeholder
                source: item.url.includes("faa.gov") ? "FAA 7110.65" : "IVAO", // Example logic
                url: item.url,
                scraped_at: item.scraped_at,
                word_count: item.word_count,
            },
            displayName: item.title || "Untitled",
            tags: generateTags(item.content || ""),
            summary: summary,
        };
    });
}


async function seedDatabase() {
    if (YOUR_SCRAPED_KNOWLEDGE_BASE_JSON.length === 0) {
        console.log("No data found in YOUR_SCRAPED_KNOWLEDGE_BASE_JSON. Please add your scraped data to src/lib/mock-data.ts.");
        return;
    }

    console.log("Transforming and seeding your scraped data...");
    
    const transformedData = transformData(YOUR_SCRAPED_KNOWLEDGE_BASE_JSON);
    
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
