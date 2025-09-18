'use server';
/**
 * @fileOverview This file defines OpenAI-based flows for answering questions about FAA and IVAO procedures
 * by acting as an expert instructor.
 */

import { openai } from '@/lib/openai';
import { z } from 'zod';
import type { Message } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface KnowledgeBaseItem {
  text: string;
  metadata: {
    id: string;
    title: string;
    type: string;
    chapter_number?: string;
    section_number?: string;
    url?: string;
  };
}

interface AviationSourceItem {
  id: string;
  name: string;
  document_name?: string;
  source_type: string;
  resources?: Array<{
    title: string;
    url: string;
  }>;
  metadata: any;
}

async function getKnowledgeBase(): Promise<KnowledgeBaseItem[]> {
  try {
    // Fetch ALL records from knowledge base to minimize hallucinations
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, content, display_name, metadata, summary, tags')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching knowledge base:', error);
      return [];
    }

    console.log(`📚 Loaded ${data?.length || 0} knowledge base records (100% of available data)`);

    return data?.map(doc => ({
      text: doc.content,
      metadata: {
        id: doc.id,
        title: doc.metadata?.title || doc.display_name,
        type: doc.metadata?.type || 'faa_document',
        chapter_number: doc.metadata?.chapter,
        section_number: doc.metadata?.section,
        url: doc.metadata?.url,
        summary: doc.summary,
        tags: doc.tags,
      }
    })) || [];
  } catch (error) {
    console.error('Error in getKnowledgeBase:', error);
    return [];
  }
}

async function getAviationSources(): Promise<AviationSourceItem[]> {
  try {
    const { data, error } = await supabase
      .from('aviation_sources')
      .select('id, name, document_name, source_type, resources, metadata');

    if (error) {
      console.error('Error fetching aviation sources:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAviationSources:', error);
    return [];
  }
}

export async function atcAssistantFlow(
  messages: Omit<Message, 'id' | 'resources'>[]
): Promise<{ content: string; sources: any[] }> {
  const lastMessage = messages[messages.length - 1]?.content || '';

  // System prompt to return relevant text from knowledge base with proper formatting
  const systemPrompt = `You are an FAA Air Traffic Control documentation retrieval system. Your ONLY job is to extract and return text that exists in the provided knowledge base documents.

**ABSOLUTE RULES - NO EXCEPTIONS:**
1. ONLY return text that exists EXACTLY in the provided knowledge base documents
2. DO NOT add ANY external knowledge, interpretations, or information
3. DO NOT create headings, sections, or categories that don't exist in the source documents
4. COPY the exact text from the documents - do not rephrase or rewrite
5. You may format for readability but DO NOT add new information
6. Use approximately 70% of the relevant content found across documents
7. If multiple documents have similar content, include the most comprehensive version

**Response Format:**
- Extract relevant text exactly as written in the knowledge base
- You may add bullet points and bold text for clarity
- Organize only the existing information logically
- Include text from applicable documents
- End with exact source citations from the documents

**FORBIDDEN:**
- Adding information not in the knowledge base
- Creating new categories or sections
- Interpreting or explaining beyond what's written
- Using external aviation knowledge

**If no relevant information is found:** State "No relevant information found in the knowledge base for this query."`;

  try {
    // Get embedding for the user's question for similarity search
    const { getEmbedding } = await import('@/lib/embeddings');
    const queryEmbedding = await getEmbedding(lastMessage);

    // Search knowledge base for relevant documents using similarity search
    const { data: knowledgeResults, error: searchError } = await supabase
      .rpc('search_knowledge_base', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 10  // Get more results to have better content to work with
      });

    if (searchError) {
      console.error('Knowledge base search error:', searchError);
      return {
        content: 'An error occurred while searching the knowledge base.',
        sources: []
      };
    }

    console.log(`📚 Found ${knowledgeResults?.length || 0} relevant knowledge base documents`);

    if (knowledgeResults && knowledgeResults.length > 0) {
      console.log('📋 Knowledge base results details:');
      knowledgeResults.forEach((result, index) => {
        console.log(`  ${index + 1}. Title: "${result.title}" | Similarity: ${result.similarity.toFixed(3)} | Content length: ${result.content?.length || 0}`);
      });
    }

    if (!knowledgeResults || knowledgeResults.length === 0) {
      return {
        content: 'No relevant text found in the knowledge base for this query.',
        sources: []
      };
    }

    // Get aviation sources for references
    const aviationSources = await getAviationSources();

    // Build context from knowledge base results
    const knowledgeContext = knowledgeResults.map((doc, index) =>
      `--- Document ${index + 1}: ${doc.title} (Similarity: ${doc.similarity.toFixed(2)}) ---\n${doc.content}`
    ).join('\n\n');

    console.log(`📝 Knowledge context length: ${knowledgeContext.length} characters`);
    console.log(`📝 First 300 chars of context: ${knowledgeContext.substring(0, 300)}...`);

    // Convert messages to OpenAI format with only relevant search results
    const openaiMessages = [
      {
        role: 'system' as const,
        content: `${systemPrompt}

**Relevant Knowledge Base Documents:**
${knowledgeContext}

**Aviation Sources (for additional references):**
${JSON.stringify(aviationSources.slice(0, 5), null, 2)}`,
      },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: `**User Query:**\n${lastMessage}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || 'Unable to generate response.';

    // Map knowledge base results to sources format
    const knowledgeBaseSources = knowledgeResults.map(result => ({
      id: result.id,
      name: result.title,
      document_name: result.title,
      source_type: 'knowledge_base',
      similarity: result.similarity,
      metadata: result.metadata
    }));

    // Combine with aviation sources
    const relevantSources = [
      ...knowledgeBaseSources,
      ...aviationSources.slice(0, 3).map(source => ({
        id: source.id,
        name: source.name,
        document_name: source.document_name,
        source_type: source.source_type,
        resources: source.resources,
        metadata: source.metadata
      }))
    ];

    return {
      content,
      sources: relevantSources
    };
  } catch (error) {
    console.error('Error in atcAssistantFlow:', error);
    return {
      content: 'An error occurred while processing your request. Please try again.',
      sources: []
    };
  }
}

export async function atcAssistantFlowWrapper(
  messages: Omit<Message, 'id' | 'resources'>[]
): Promise<{ content: string; sources: any[] }> {
  return atcAssistantFlow(messages);
}