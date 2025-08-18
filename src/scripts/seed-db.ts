import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { KNOWLEDGE_BASE_JSON } from "../lib/mock-data";

async function seedDatabase() {
    console.log("Seeding database...");
    const knowledgeBaseCollection = collection(db, "knowledge-base");
    const batch = writeBatch(db);

    KNOWLEDGE_BASE_JSON.forEach((item) => {
        const docRef = doc(knowledgeBaseCollection, item.id);
        batch.set(docRef, item);
    });

    try {
        await batch.commit();
        console.log("Database seeded successfully!");
    } catch (error) {
        console.error("Error seeding database: ", error);
    }
}

seedDatabase();
