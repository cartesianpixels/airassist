import { db } from '@/lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { KNOWLEDGE_BASE_JSON } from '@/lib/mock-data';

async function seedDatabase() {
  console.log('Starting to seed database...');

  try {
    const knowledgeBaseCollection = collection(db, 'knowledge-base');
    const batch = writeBatch(db);

    KNOWLEDGE_BASE_JSON.forEach((item) => {
      const docRef = doc(knowledgeBaseCollection, item.id);
      batch.set(docRef, item);
    });

    await batch.commit();
    console.log(`Successfully seeded ${KNOWLEDGE_BASE_JSON.length} documents into 'knowledge-base' collection.`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }

  console.log('Database seeding complete.');
}

seedDatabase();
