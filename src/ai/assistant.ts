'use server';
/**
 * @fileOverview This file defines OpenAI-based flows for answering questions about FAA and IVAO procedures
 * by acting as an expert instructor.
 */

import { openai } from '@/lib/openai';
import { z } from 'zod';
import type { Message } from '@/lib/supabase-typed';
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

    return data?.map((doc: any) => ({
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

// 🧠 TOKEN-EFFICIENT Smart document selection
function smartSelectDocuments(results: any[], query: string = ''): any[] {
  console.log(`🔍 RAW SEARCH RESULTS (${results.length} total):`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. "${r.title}" - Similarity: ${r.similarity.toFixed(3)} - Content: ${r.content?.substring(0, 100)}...`);
  });

  // 🎯 USE ALL RELEVANT DOCUMENTS - no arbitrary caps
  const relevantDocs = results.filter(r => r.similarity > 0.70); // Include ALL relevant

  console.log(`📊 Found ${relevantDocs.length} relevant documents (similarity > 0.70)`);

  // Sort by enhanced relevance score
  const keyTerms = extractKeyTerms(query);
  const uniqueSelected = relevantDocs
    .sort((a, b) => {
      // Enhanced scoring: similarity + keyword boost
      const aKeywords = containsKeyTerms(a.content, keyTerms);
      const bKeywords = containsKeyTerms(b.content, keyTerms);
      const aBoost = aKeywords ? 0.05 : 0;
      const bBoost = bKeywords ? 0.05 : 0;

      return (b.similarity + bBoost) - (a.similarity + aBoost);
    });
  // NO SLICE - use ALL relevant documents

  console.log(`🎯 SELECTED DOCS (${uniqueSelected.length}):`);
  uniqueSelected.forEach((doc, i) => {
    const hasKeywords = containsKeyTerms(doc.content, extractKeyTerms(query));
    console.log(`  ${i + 1}. "${doc.title}" - Similarity: ${doc.similarity.toFixed(3)} ${hasKeywords ? '🔑' : ''}`);
  });

  return uniqueSelected;
}

// 🔑 Extract key terms from user query
function extractKeyTerms(query: string): string[] {
  const wakeTurbulenceTerms = ['wake', 'turbulence', 'separation', 'minima', 'distance', 'miles', 'minutes', 'super', 'heavy', 'B757', 'aircraft'];
  const queryWords = query.toLowerCase().split(/\s+/);

  // Return intersection of query words and known aviation terms
  return wakeTurbulenceTerms.filter(term =>
    queryWords.some(word => word.includes(term) || term.includes(word))
  );
}

// 🔍 Check if content contains key terms
function containsKeyTerms(content: string, keyTerms: string[]): boolean {
  if (!keyTerms.length) return false;
  const lowerContent = content.toLowerCase();
  return keyTerms.some(term => lowerContent.includes(term.toLowerCase()));
}

// 🧠 DYNAMIC Build context for ALL relevant documents
function buildSmartContext(docs: any[], query: string = ''): string {
  const keyTerms = extractKeyTerms(query);
  const totalDocs = docs.length;

  // 🎯 GENEROUS TOKEN BUDGET for comprehensive coverage
  const TOTAL_BUDGET = 4000; // Generous budget for complete information
  const tokensPerDoc = Math.floor(TOTAL_BUDGET / totalDocs);
  const charsPerDoc = Math.max(400, tokensPerDoc * 4); // At least 400 chars per doc

  console.log(`💰 Dynamic allocation: ${totalDocs} docs, ${tokensPerDoc} tokens/doc, ${charsPerDoc} chars/doc`);

  return docs.map((doc: any, index: number) => {
    // 🎯 FIND MOST RELEVANT SECTIONS within each document
    const extractedContent = findRelevantSections(doc.content, keyTerms, charsPerDoc);

    console.log(`📄 Smart extraction for "${doc.title}" (${doc.similarity.toFixed(3)}): ${extractedContent.length}/${charsPerDoc} chars`);

    return `--- Document ${index + 1}: ${doc.title} (Similarity: ${doc.similarity.toFixed(2)}) ---\n${extractedContent}`;
  }).join('\n\n');
}

// 🎯 Find most relevant sections within document based on keywords and procedures
function findRelevantSections(content: string, keyTerms: string[], maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  // Split into paragraphs and score by relevance
  const paragraphs = content.split(/\n\n+/);
  const scoredParagraphs = paragraphs.map(paragraph => {
    const lowerParagraph = paragraph.toLowerCase();

    // Count keyword matches
    const keywordScore = keyTerms.reduce((count, term) => {
      const regex = new RegExp(term.toLowerCase(), 'g');
      return count + (lowerParagraph.match(regex) || []).length;
    }, 0);

    // Boost paragraphs with procedural information (numbers + units)
    const procedureBoost = /\d+\s*(miles?|minutes?|feet|nm|degrees)/i.test(paragraph) ? 5 : 0;

    // Strong boost for wake turbulence content
    const wakeBoost = /wake\s*turbulence/i.test(paragraph) ? 10 : 0;

    // Boost for separation minima content
    const separationBoost = /separation|behind|minima/i.test(paragraph) ? 3 : 0;

    return {
      paragraph: paragraph.trim(),
      score: keywordScore + procedureBoost + separationBoost,
      length: paragraph.length
    };
  }).filter(p => p.paragraph.length > 20); // Filter out tiny paragraphs

  // Sort by relevance score (highest first)
  scoredParagraphs.sort((a, b) => b.score - a.score);

  // Take best sections within character limit
  let result = '';
  let totalLength = 0;

  for (const { paragraph } of scoredParagraphs) {
    if (totalLength + paragraph.length + 2 <= maxChars) {
      result += (result ? '\n\n' : '') + paragraph;
      totalLength += paragraph.length + 2;
    }
  }

  return result || content.substring(0, maxChars);
}


// 🧠 ALLOW ALL RELEVANT DOCS - no artificial limits
function manageConversationContext(messages: any[], docs: any[]): { messages: any[], docs: any[] } {
  const messageCount = messages.length;

  // Always use ALL relevant documents - they've already been filtered for relevance
  console.log(`📏 Context management: keeping all ${docs.length} relevant docs`);

  if (messageCount <= 3) {
    // SHORT conversation: Keep all messages and all relevant docs
    return { messages, docs };
  }

  if (messageCount <= 8) {
    // MEDIUM conversation: Compress messages but keep all docs
    return {
      messages: [messages[0], ...messages.slice(-3)], // First + last 3 messages
      docs // Keep ALL relevant documents
    };
  }

  // LONG conversation: Compress messages but still keep all relevant docs
  const recentMessages = messages.slice(-2); // Last 2 exchanges
  const firstMessage = messages[0]; // Original question

  // Create a summary of middle conversation if needed
  const middleMessages = messages.slice(1, -2);
  let contextMessages = [firstMessage, ...recentMessages];

  if (middleMessages.length > 0) {
    const summaryMessage = {
      role: 'assistant' as const,
      content: `[Previous discussion covered: ${middleMessages.length} exchanges about ATC procedures]`
    };
    contextMessages = [firstMessage, summaryMessage, ...recentMessages];
  }

  return {
    messages: contextMessages,
    docs // Keep ALL relevant documents even for long conversations
  };
}

async function processWithContext(
  context: string,
  knowledgeResults: any[],
  aviationSources: AviationSourceItem[],
  systemPrompt: string,
  messages: any[],
  lastMessage: string
): Promise<{ content: string; sources: any[] }> {
  try {
    // 💰 LEVEL 3: Check response cache before expensive AI call
    const { ResponseCacheManager, QuerySimilarityCache } = await import('@/lib/cache-manager');

    const model = 'gpt-4o';
    const cachedResponse = ResponseCacheManager.get(messages, knowledgeResults, model);

    let content: string;

    if (cachedResponse) {
      content = cachedResponse;
      console.log('💰💰 Response CACHE HIT - FREE AI response!');
    } else {
      // Cache miss - call expensive AI
      console.log('💸💸 Response cache miss - calling OpenAI...');

      // Convert messages to OpenAI format with context
      const openaiMessages = [
        {
          role: 'system' as const,
          content: `${systemPrompt}

**Relevant Knowledge Base Documents:**
${context}

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

      content = completion.choices[0]?.message?.content || 'Unable to generate response.';

      // Cache the expensive response
      ResponseCacheManager.set(messages, knowledgeResults, model, content);

      // Add to query similarity cache for future similar questions
      QuerySimilarityCache.addQuery(lastMessage, content);
    }

    // Map knowledge base results to sources format
    const knowledgeBaseSources = knowledgeResults.map((result: any) => ({
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
    console.error('Error in processWithContext:', error);
    return {
      content: 'An error occurred while processing your request. Please try again.',
      sources: []
    };
  }
}

export async function atcAssistantFlow(
  messages: Omit<Message, 'id' | 'resources'>[]
): Promise<{ content: string; sources: any[] }> {
  const lastMessage = messages[messages.length - 1]?.content || '';

  // System prompt - strict but allows synthesis from provided documents
  const systemPrompt = `You are an FAA Air Traffic Control expert. Answer questions using ONLY the information provided in the knowledge base documents below.

**STRICT REQUIREMENTS:**
1. Use ONLY information from the provided knowledge base documents
2. Never add external knowledge, assumptions, or interpretations
3. Extract ALL relevant procedures, minima, and regulations from ALL provided documents
4. Combine information from multiple documents when they cover the same topic
5. Cite specific document sources for all information
6. Review EVERY document thoroughly - some may contain comprehensive information that others lack

**RESPONSE FORMAT:**
- Provide COMPREHENSIVE coverage by reviewing ALL documents for relevant information
- Organize information clearly with appropriate headings and bullet points
- Include ALL specific values (distances, times, altitudes) exactly as stated in documents
- Combine related procedures from multiple documents for complete coverage
- Always cite sources: "According to Chapter X Section Y..."
- If procedures vary by environment (radar vs non-radar), clearly distinguish them
- Prioritize documents with the most comprehensive and detailed information

**FOR WAKE TURBULENCE QUERIES SPECIFICALLY:**
- Extract ALL separation minima values from ALL documents
- Include both radar-based (distance) and non-radar (time) procedures
- Cover all aircraft categories (Super, Heavy, Large, Small, B757)
- Include approach, departure, and en-route procedures

**FORBIDDEN:**
- Adding information not present in the knowledge base
- Making assumptions about unstated procedures
- Using external aviation knowledge
- Ignoring documents that contain comprehensive information

**If no relevant information is found:** State "No relevant information found in the knowledge base for this query."`;

  try {
    // 💰 LEVEL 1: Check for similar queries first (instant response)
    const { QuerySimilarityCache, SearchCacheManager, ResponseCacheManager } = await import('@/lib/cache-manager');

    const similarResponse = QuerySimilarityCache.findSimilarQuery(lastMessage);
    if (similarResponse) {
      console.log('💰💰💰 INSTANT RESPONSE from similar query cache!');
      return {
        content: similarResponse,
        sources: [] // TODO: Cache sources too
      };
    }

    // 💰 LEVEL 2: Check search cache
    let knowledgeResults = SearchCacheManager.get(lastMessage, 0.5, 15);

    if (!knowledgeResults) {
      // Cache miss - do the actual search
      console.log('💸 Search cache miss - querying database...');

      // Get embedding for the user's question for similarity search
      const { getEmbedding } = await import('@/lib/embeddings');
      const queryEmbedding = await getEmbedding(lastMessage);

      // Search knowledge base for relevant documents using similarity search
      // 🔧 LOWER threshold to catch more potential matches
      const { data: searchResults, error: searchError } = await (supabase as any)
        .rpc('search_knowledge_base', {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,  // LOWERED from 0.7 to catch more docs
          match_count: 15        // INCREASED to get more potential matches
        }) as { data: any[] | null, error: any };

      if (searchError) {
        console.error('Knowledge base search error:', searchError);
        return {
          content: 'An error occurred while searching the knowledge base.',
          sources: []
        };
      }

      knowledgeResults = searchResults || [];

      // Cache the search results
      SearchCacheManager.set(lastMessage, 0.5, 15, knowledgeResults);
    }

    console.log(`📚 Found ${knowledgeResults?.length || 0} relevant knowledge base documents`);

    if (knowledgeResults && knowledgeResults.length > 0) {
      console.log('📋 Knowledge base results details:');
      knowledgeResults.forEach((result: any, index: number) => {
        console.log(`  ${index + 1}. Title: "${result.title}" | Similarity: ${result.similarity.toFixed(3)} | Content length: ${result.content?.length || 0}`);
      });
    }

    if (!knowledgeResults || knowledgeResults.length === 0) {
      return {
        content: 'No relevant text found in the knowledge base for this query.',
        sources: []
      };
    }

    // 🧠 SMART SELECTION: Quality-based document selection with keyword awareness
    const smartSelection = smartSelectDocuments(knowledgeResults, lastMessage);
    console.log(`🎯 Smart selection: ${smartSelection.length} docs from ${knowledgeResults.length} (${smartSelection.map(d => d.similarity.toFixed(2)).join(', ')})`);

    // 🧠 SMART CONTEXT: Conversation length management
    const smartContext = manageConversationContext(messages, smartSelection);
    console.log(`📏 Context management: ${smartContext.messages.length} messages, ${smartContext.docs.length} docs`);

    // Get aviation sources for references
    const aviationSources = await getAviationSources();

    // 🧠 Build token-efficient context using intelligent extraction
    const optimizedContext = buildSmartContext(smartContext.docs, lastMessage);
    const estimatedTokens = Math.ceil(optimizedContext.length / 4);

    console.log(`📝 Optimized context: ${optimizedContext.length} chars, ~${estimatedTokens} tokens`);
    console.log(`💰 Cost reduction: ${Math.round((1 - estimatedTokens/10000) * 100)}% vs naive approach`);

    return await processWithContext(
      optimizedContext,
      smartContext.docs,
      aviationSources,
      systemPrompt,
      smartContext.messages,
      lastMessage
    );
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