'use server';

/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures
 * by searching a local CSV knowledge base using a Retrieval-Augmented Generation (RAG) approach.
 *
 * - atcAssistantFlow - A function that takes a question and returns an answer from the knowledge base.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import {parse} from 'csv-parse/sync';
import {textEmbedding004} from '@genkit-ai/googleai';

// Helper function to calculate the dot product of two vectors.
function dotProduct(vec1: number[], vec2: number[]): number {
  return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
}

export async function atcAssistantFlow(question: string): Promise<string> {
  const atcAssistantFlow = ai.defineFlow(
    {
      name: 'atcAssistantFlow',
      inputSchema: z.string(),
      outputSchema: z.string(),
    },
    async (question) => {
      // 1. Read and parse the knowledge base CSV file.
      const csvFilePath = path.resolve(process.cwd(), 'src/data/knowledge.csv');
      const fileContent = fs.readFileSync(csvFilePath, {encoding: 'utf-8'});

      const records: {source: string; content: string}[] = parse(fileContent, {
        columns: true, // Use the first row as headers ('source', 'content')
        skip_empty_lines: true,
      });

      // 2. Create vector embeddings for the content of each document.
      const documentEmbeddings = await ai.embed({
        embedder: textEmbedding004,
        content: records.map(r => r.content),
      });

      // 3. Create a vector embedding for the user's question.
      const questionEmbedding = await ai.embed({
        embedder: textEmbedding004,
        content: question,
      });

      // 4. Perform a similarity search (vector search).
      const similarities = documentEmbeddings.map((embedding, i) => ({
        index: i,
        similarity: dotProduct(questionEmbedding.embedding, embedding.embedding),
      }));

      // Sort by similarity and get the top 5 results.
      similarities.sort((a, b) => b.similarity - a.similarity);
      const topResults = similarities.slice(0, 5).map(item => records[item.index]);

      // 5. Use the top matching documents as context for the final prompt.
      const context = topResults.map(r => `Source: ${r.source}\nContent: ${r.content}`).join('\n\n');

      const prompt = `You are an expert FAA and IVAO Air Traffic Control instructor. Using ONLY the following context, answer the user's question.

Context:
${context}

Question:
${question}`;

      // 6. Generate the final answer from the model.
      const llmResponse = await ai.generate({
        prompt: prompt,
      });

      return llmResponse.text;
    }
  );
  return atcAssistantFlow(question);
}
