'use server';

/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures
 * by directly querying the Google AI model.
 *
 * - atcAssistantFlow - A function that takes a question and returns an answer from the model.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { Message } from '@/lib/types';

export async function atcAssistantFlow(messages: Omit<Message, 'id' | 'resources'>[]): Promise<string> {
  const atcAssistantFlow = ai.defineFlow(
    {
      name: 'atcAssistantFlow',
      inputSchema: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })),
      outputSchema: z.string(),
    },
    async (messages) => {
      console.log('Received messages:', messages);

      const history = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

      const prompt = `You are an expert FAA and IVAO Air Traffic Control instructor. Your answers should be based on information from FAA Order JO 7110.65, the Aeronautical Information Manual (AIM), and the IVAO US Division Wiki (wiki.us.ivao.aero).

Answer the user's question based on the conversation history. Keep your answers concise unless the user asks for more detail.

Conversation History:
${history}

Answer the last user question.`;

      console.log('Constructed prompt:', prompt);

      // Generate the final answer from the model.
      const llmResponse = await ai.generate({
        prompt: prompt,
      });

      return llmResponse.text;
    }
  );
  return atcAssistantFlow(messages);
}
