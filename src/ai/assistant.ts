'use server';

/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures
 * by directly querying the Google AI model.
 *
 * - atcAssistantFlow - A function that takes a question and returns an answer from the model.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export async function atcAssistantFlow(question: string): Promise<string> {
  const atcAssistantFlow = ai.defineFlow(
    {
      name: 'atcAssistantFlow',
      inputSchema: z.string(),
      outputSchema: z.string(),
    },
    async (question) => {
      console.log('Received question:', question);

      const prompt = `You are an expert FAA and IVAO Air Traffic Control instructor. Answer the user's question. Keep your answers concise unless the user asks for more detail.

Question:
${question}`;

      console.log('Constructed prompt:', prompt);

      // Generate the final answer from the model.
      const llmResponse = await ai.generate({
        prompt: prompt,
      });

      return llmResponse.text;
    }
  );
  return atcAssistantFlow(question);
}
