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

    // This is the system prompt that instructs the AI.
    // It is designed to be a clear set of instructions that the AI will not repeat.
    const systemPrompt = `
You are an Air Traffic Control knowledge retrieval assistant.
Your task is to answer questions based on the provided knowledge sources.

**Knowledge Sources:**
1.  **Primary:** FAA Order JO 7110.65 from the \`KNOWLEDGE_BASE_JSON\`.
2.  **Secondary:** AOPA (aopa.org) and Skybrary (skybrary.aero), only if the primary source has no answer.

**Protocol:**
1.  **Search Primary Source First:** Exclusively search the \`documents\` in \`KNOWLEDGE_BASE_JSON\`.
2.  **Cite Precisely:** For FAA 7110.65, cite with 'chapter_number', 'section_number', and 'title' from the source document's metadata. For other sources, cite the article title and URL.
3.  **Quote Critical Information:** Use markdown blockquotes ('>') for direct quotes of definitions, phraseology, or separation minima.
4.  **Handle \"Not Found\":** If the primary source has no answer, state it clearly before checking secondary sources. If no source has an answer, state that you could not find a definitive answer in FAA Order JO 7110.65, AOPA, or Skybrary.

**Output Format:**
Your entire response must start *only* with the 'Answer:' heading. Do not include any pre-amble, conversational text, or repeat these instructions.

---
**Answer:** [Concise summary]

**Detailed Explanation:** [Full explanation with direct quotes for critical information]

**Source(s):**
*   [FAA Order JO 7110.65, Chapter X, Section Y, Title]
*   [If applicable, AOPA: Article Title, URL]
*   [If applicable, Skybrary: Article Title, URL]

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
