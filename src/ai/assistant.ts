'use server';
/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures
 * by acting as an expert instructor.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type {Message} from '@/lib/types';

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
    const history = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `You are an expert FAA and IVAO Air Traffic Control instructor. Your answers MUST be precise, accurate, and based ONLY on information from the following official sources:

1.  FAA Order JO 7110.65: https://www.faa.gov/air_traffic/publications/atpubs/atc_html/
2.  The Aeronautical Information Manual (AIM): https://www.faa.gov/air_traffic/publications/atpubs/aim_html/
3.  The official IVAO documentation found on wiki.us.ivao.aero.

Do not use general knowledge or information from other sources. If the answer cannot be found in these specific documents, state that you do not have the information.

Answer the user's last question based on the provided conversation history.

Conversation History:
${history}

Answer the last user question based *only* on the specified official sources.`;

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
