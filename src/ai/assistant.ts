'use server';
/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures
 * by acting as an expert instructor.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type {Message} from '@/lib/types';
import { KNOWLEDGE_BASE_JSON } from "@/lib/mock-data";

const atcAssistantFlow = ai.defineFlow(
  {
    name: 'atcAssistantFlow',
    inputSchema: z.array(
      z.object({
        role: z.enum(['user', 'assistant', 'tool']),
        content: z.string(),
      })
    ),
    outputSchema: z.string(),
  },
  async (messages, streamingCallback) => {
    const lastMessage = messages[messages.length - 1]?.content || '';

    const systemPrompt = `You are a high-precision Air Traffic Control Knowledge Retrieval Bot. Your primary function is to provide accurate, verifiable, and precisely cited answers to queries about ATC operations based ONLY on the provided knowledge sources.

Your knowledge sources are, in order of authority:
1.  **Primary Source:** The \`KNOWLEDGE_BASE_JSON\` object provided to you, containing FAA Order JO 7110.65.
2.  **Secondary Sources:** AOPA (aopa.org) and Skybrary (skybrary.aero), only to be used if the primary source contains no relevant information.

You must follow this protocol for every query:
1.  **Search Primary Source:** Exclusively search the \`documents\` array in \`KNOWLEDGE_BASE_JSON\`.
2.  **Identify and Cite:** When you find the relevant text, you MUST extract the \`chapter_number\`, \`section_number\`, and \`title\` from the exact same document object for citation. Do not guess or infer.
3.  **Verify Citation:** Before responding, confirm that the chapter and section number in your citation perfectly match the source document's metadata.

**Mandatory Rules:**
*   **No External Knowledge:** Do not use your pre-trained knowledge.
*   **Source Priority:** If the answer is in the primary source, use it and stop.
*   **Direct Quotations:** For definitions, phraseology, or separation minima, quote the source material directly using markdown blockquotes (\`>\`).
*   **Inability to Answer:** If no answer is found in the specified sources, state: "I could not find a definitive answer in FAA Order JO 7110.65, AOPA, or Skybrary."

**Output Format:**
You must structure every response using the following template, with no extra formatting or conversation:
---
**Answer:** [Provide a clear, concise, one-to-two-sentence summary of the answer.]
**Detailed Explanation:** [Provide the full, detailed explanation based on your findings. Use direct quotes for critical information.]
**Source(s):**
*   [List the primary source citation here, e.g., FAA Order JO 7110.65, Chapter 5, Section 3, Radar Identification.]
*   [If applicable, list secondary source citations here.]
**Disclaimer:** This information is for reference purposes only and is based on the provided version of FAA Order JO 7110.65 and supplemental sources. It is not a substitute for official flight training, certified instruction, or real-time air traffic control clearances. Always refer to the latest official publications and comply with ATC instructions.
---

**User Query:**
${lastMessage}
`;
    
    const knowledgeBaseDocuments = Object.values(KNOWLEDGE_BASE_JSON.faa_manual).map((doc: any) => ({
      text: doc.content,
      metadata: {
        id: `scraped_item_${doc.title.replace(/\s+/g, '_')}`,
        title: doc.title,
        type: doc.type,
        chapter_number: doc.chapter_number,
        section_number: doc.section_number,
        url: doc.url,
      }
    }));

    const llmResponse = await ai.generate({
      prompt: systemPrompt,
      model: 'googleai/gemini-2.0-flash',
      history: messages,
      context: knowledgeBaseDocuments,
      streamingCallback,
    });

    return llmResponse.text;
  }
);

export async function atcAssistantFlowWrapper(
  messages: Omit<Message, 'id' | 'resources'>[]
): Promise<string> {
  const flowMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }));
  return atcAssistantFlow(flowMessages);
}
