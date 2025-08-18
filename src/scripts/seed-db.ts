import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { KNOWLEDGE_BASE_JSON } from "../lib/mock-data";
import { KNOWLEDGE_BASE_TOC } from "@/lib/knowledge-base-toc";

async function seedDatabase() {
    console.log("Seeding database...");
    const batch = writeBatch(db);

    const knowledgeBaseCollection = collection(db, "knowledge-base");
    KNOWLEDGE_BASE_JSON.forEach((item) => {
        const docRef = doc(knowledgeBaseCollection, item.id);
        batch.set(docRef, item);
    });

    const tocCollection = collection(db, "knowledge-base-toc");
    KNOWLEDGE_BASE_TOC.forEach((item) => {
        const docRef = doc(tocCollection); // Auto-generate ID
        batch.set(docRef, item);
    });

    try {
        await batch.commit();
        console.log("Database seeded successfully with knowledge base and table of contents!");
    } catch (error) {
        console.error("Error seeding database: ", error);
    }
}

seedDatabase();
