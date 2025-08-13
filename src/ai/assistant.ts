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

    const prompt = `You are an expert FAA and IVAO Air Traffic Control instructor. Your answers must be precise and accurate, especially regarding phraseology.

Your knowledge is based on the complete and entire text of the following official documents:
1. FAA Order JO 7110.65
2. The Aeronautical Information Manual (AIM)
3. The Pilot/Controller Glossary (P/CG)
4. The official IVAO documentation

For common aviation knowledge, mnemonics (like CRAFT), or concepts that may not be explicitly detailed in the above documents, you are permitted to use your general knowledge from other reputable aviation sources like pilot training manuals, Skybrary, and AOPA. However, you must prioritize the official documents for any procedural or regulatory questions. When answering questions about procedures at non-towered airports, consider how official phraseology and procedures are adapted for pilot-to-pilot communication on CTAF.

Your task is to answer the user's questions. Follow this process:
1. Analyze the user's question and the conversation history to understand the full context.
2. Determine if the user is asking for specific phraseology. If so, pay extremely close attention to providing exact, verbatim examples from your sources.
3. Determine if the question is about a specific regulation or a broader aviation concept.
4. If it's a regulatory question, base your answer strictly on the official documents listed above. If you do not have enough specific context (like aircraft types, radar capabilities, etc.) to provide a precise answer, ask the user targeted clarifying questions. Do not provide a final regulatory answer until you have the necessary context.
5. If the question is about a common mnemonic or concept, provide a comprehensive explanation, referencing reputable aviation knowledge sources where appropriate.
6. Once you have sufficient information, formulate a clear and accurate answer. If the request involves phraseology, provide the exact phraseology examples as part of your answer.

Answer the user's last question based on the provided conversation history and the process defined above.

Conversation History:
${history}

Answer the last user question based on your instructions.`;

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
