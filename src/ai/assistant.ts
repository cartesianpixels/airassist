
'use server';
/**
 * @fileOverview This file defines a Genkit flow for answering questions about FAA and IVAO procedures
 * by acting as an expert instructor.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type {Message} from '@/lib/types';
import { semanticSearch, hybridSearch } from '@/lib/semantic-search';


async function getRelevantKnowledge(query: string) {
  try {
    console.log(`Starting knowledge search for: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Knowledge search timeout after 30 seconds')), 30000);
    });

    // Try hybrid search first
    let results = [];
    try {
      const searchPromise = hybridSearch(query, {
        limit: 15,
        threshold: 0.5
      });

      results = await Promise.race([searchPromise, timeoutPromise]);
      console.log(`Hybrid search found ${results.length} relevant documents`);
    } catch (hybridError) {
      console.warn('Hybrid search failed, falling back to semantic search:', hybridError.message);

      // Fallback to semantic search
      const semanticTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Semantic search timeout after 20 seconds')), 20000);
      });

      const semanticSearchPromise = semanticSearch(query, {
        limit: 10,
        threshold: 0.5
      });

      results = await Promise.race([semanticSearchPromise, semanticTimeoutPromise]);
      console.log(`Semantic search found ${results.length} relevant documents`);
    }

    // If still no results, return a fallback message
    if (results.length === 0) {
      console.warn('No relevant knowledge found for query, returning empty context');
      return [{
        text: "I'm sorry, I couldn't find specific information in my knowledge base to answer your question accurately. Please try rephrasing your question or asking about specific ATC procedures, regulations, or flight operations.",
        metadata: {
          id: 'fallback',
          title: 'No Knowledge Base Match',
          type: 'fallback',
          chapter_number: '',
          section_number: '',
        }
      }];
    }

    return results.map(result => ({
      text: result.text,
      metadata: result.metadata
    }));
  } catch (error) {
    console.error('Error getting relevant knowledge:', error);

    // Return fallback response instead of empty array
    return [{
      text: "I encountered an error while searching my knowledge base. Please try rephrasing your question or ask about specific ATC procedures.",
      metadata: {
        id: 'error',
        title: 'Search Error',
        type: 'error',
        chapter_number: '',
        section_number: '',
      }
    }];
  }
}


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
    try {
      const lastMessage = messages[messages.length - 1]?.content || '';
      console.log('Processing assistant request:', lastMessage.substring(0, 100));

      // Simple, clear system prompt focused on helpful responses
      const systemPrompt = `You are an expert Air Traffic Control assistant. Answer the user's question using the provided knowledge base documents.

Guidelines:
- Provide clear, helpful answers about aviation procedures and regulations
- Reference source documents when citing specific rules or procedures
- Use conversational tone - explain things clearly
- Never output raw data, JSON, or technical metadata
- If you can't find the answer, say so honestly

User Question: ${lastMessage}`;
    
      // Get relevant knowledge
      const relevantKnowledge = await getRelevantKnowledge(lastMessage);
      console.log(`Knowledge retrieval complete. Found ${relevantKnowledge.length} relevant documents`);

      // Format knowledge base entries for the prompt (without embeddings)
      const formattedKnowledge = relevantKnowledge.map(item => `
Title: ${item.metadata.title || 'Unknown'}
Chapter: ${item.metadata.chapter_number || 'N/A'}
Section: ${item.metadata.section_number || 'N/A'}
Content: ${item.text}
---`).join('\n');

      const prompt = `${systemPrompt}\n\nRelevant Knowledge Base Documents:\n${formattedKnowledge}\n\nConversation:\n${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;
      
      console.log('Starting LLM generation...');
      
      // Add timeout for LLM generation
      const llmTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LLM generation timeout after 60 seconds')), 60000);
      });
      
      const llmGenerationPromise = ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
        streamingCallback: streamingCallback,
      });
      
      const llmResponse = await Promise.race([llmGenerationPromise, llmTimeoutPromise]);
      console.log('LLM generation complete');

      return llmResponse.text;
    } catch (error) {
      console.error('Error in assistant flow:', error);
      
      if (streamingCallback) {
        streamingCallback({
          index: 0,
          content: [{ text: `❌ An error occurred while processing your request: ${error.message || 'Unknown error'}` }]
        });
      }
      
      // Return a user-friendly error message instead of throwing
      return `I apologize, but I encountered an error while processing your request: ${error.message || 'Unknown error'}. Please try rephrasing your question or try again in a moment.`;
    }
  }
);

export async function atcAssistantFlowWrapper(
  messages: Omit<Message, 'id' | 'resources'>[]
): Promise<string> {
  try {
    const flowMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));
    return atcAssistantFlow(flowMessages);
  } catch (error) {
    console.error('Error in assistant flow wrapper:', error);
    return `I apologize, but I encountered an error: ${error.message || 'Unknown error'}. Please try again.`;
  }
}

// Export the main flow for direct use
export { atcAssistantFlow };
