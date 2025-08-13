'use server';
/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures
 * using a Retrieval-Augmented Generation (RAG) approach.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type {Message} from '@/lib/types';
import * as fs from 'fs';
import * as path from 'path';
import {parse} from 'csv-parse/sync';
import {textEmbedding004} from '@genkit-ai/googleai';

// Simple in-memory cache for document embeddings
let documentEmbeddings: {
  source: string;
  content: string;
  embedding: number[];
}[] = [];

/**
 * Calculates the dot product of two vectors.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns The dot product.
 */
function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Loads and embeds the knowledge base from the CSV file.
 * This is done once when the server starts.
 */
async function loadAndEmbedKnowledgeBase() {
  if (documentEmbeddings.length > 0) {
    return;
  }

  console.log('Loading and embedding knowledge base...');
  try {
    const csvPath = path.resolve('./src/data/knowledge.csv');
    const fileContent = fs.readFileSync(csvPath, {encoding: 'utf-8'});

    const records: {source: string; content: string}[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    const {embeddings} = await ai.embed({
      embedder: textEmbedding004,
      content: records.map(r => ({text: r.content})),
    });

    documentEmbeddings = records.map((record, index) => ({
      ...record,
      embedding: embeddings[index],
    }));

    console.log(`Knowledge base loaded and embedded with ${documentEmbeddings.length} documents.`);
  } catch (error) {
    console.error('Failed to load or embed knowledge base:', error);
    // Exit gracefully if the knowledge base can't be loaded, as the app can't function.
    process.exit(1);
  }
}

const atcAssistantFlow = ai.defineFlow(
  {
    name: 'atcAssistantFlow',
    inputSchema: z.array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    ),
    outputSchema: z.string(),
  },
  async messages => {
    // Ensure knowledge base is loaded before running the flow
    await loadAndEmbedKnowledgeBase();
    
    const lastUserMessage = messages[messages.length - 1];
    const question = lastUserMessage.content;

    // 1. Embed the user's question
    const {embeddings: questionEmbeddings} = await ai.embed({
      embedder: textEmbedding004,
      content: [{text: question}],
    });
    const questionEmbedding = questionEmbeddings[0];

    // 2. Find the most relevant documents from the knowledge base
    const scoredDocuments = documentEmbeddings.map(doc => ({
      ...doc,
      score: dotProduct(questionEmbedding, doc.embedding),
    }));

    // Sort by score in descending order
    scoredDocuments.sort((a, b) => b.score - a.score);

    // 3. Select the top N documents to use as context
    const topK = 5;
    const relevantDocuments = scoredDocuments
      .slice(0, topK)
      .map(d => `Source: ${d.source}\nContent: ${d.content}`)
      .join('\n\n');

    const history = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `You are an expert FAA and IVAO Air Traffic Control instructor. Your answers MUST be based ONLY on the provided context from the knowledge base. Do not use any other knowledge.

If the provided context does not contain the answer, you MUST state that you cannot answer the question with the provided information.

Answer the user's last question based on the conversation history and the context below. Keep your answers concise unless the user asks for more detail.

Conversation History:
${history}

Context from Knowledge Base:
---
${relevantDocuments}
---

Answer the last user question based *only* on the provided context.`;

    // 4. Generate the final answer from the model using the context
    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.0-flash',
    });

    return llmResponse.text;
  }
);

export async function atcAssistantFlowWrapper(
  messages: Omit<Message, 'id' | 'resources'>[]
): Promise<string> {
  return atcAssistantFlow(messages);
}
