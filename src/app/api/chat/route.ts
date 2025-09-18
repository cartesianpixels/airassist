import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { getEmbedding } from '@/lib/embeddings';
import type { Database } from '@/types/database';
import type { ApiUsageLogInsert } from '@/lib/supabase-typed';
import { getUserTier } from '@/lib/server-profile';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for ATC training with knowledge base context
const ATC_SYSTEM_PROMPT = `You are an expert Air Traffic Control instructor. Answer questions using the FAA documentation provided in the KNOWLEDGE BASE CONTEXT section below.

When answering:
- Use the specific procedures, regulations, and information from the provided context
- Quote relevant sections when applicable
- Provide step-by-step explanations based on the documentation
- Reference the document titles when citing information

The context contains official FAA ATC procedures and regulations. Use this information to provide accurate, detailed answers about air traffic control procedures.`;

interface KnowledgeBaseResult {
  id: string;
  title: string;
  content: string;
  document_type: string;
  metadata: any;
  similarity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, sessionId, model = 'gpt-4o-mini' } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get the user's question (last message)
    const userMessage = messages[messages.length - 1];
    if (!userMessage?.content) {
      return NextResponse.json(
        { error: 'No user message content provided' },
        { status: 400 }
      );
    }

    // Use client-side Supabase (secure with RLS policies)
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's tier for model validation
    const userTier = await getUserTier(user.id);

    // Validate model access
    const modelAccess: Record<string, string[]> = {
      'gpt-4o-mini': ['free', 'basic', 'pro', 'enterprise'],
      'gpt-4o': ['basic', 'pro', 'enterprise'],
      'gpt-4': ['pro', 'enterprise'],
      'gpt-3.5-turbo': ['free', 'basic', 'pro', 'enterprise'],
    };

    if (!modelAccess[model]?.includes(userTier)) {
      return NextResponse.json(
        { error: `Model ${model} not available for ${userTier} tier` },
        { status: 403 }
      );
    }

    console.log('🔍 Starting knowledge base search for:', userMessage.content.substring(0, 100));

    // Get embedding for the user's question
    const queryEmbedding = await getEmbedding(userMessage.content);

    // Search knowledge base for relevant documents
    const { data: knowledgeResults, error: searchError } = await supabase
      .rpc('search_knowledge_base', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 5
      }) as { data: KnowledgeBaseResult[] | null, error: any };

    if (searchError) {
      console.error('Knowledge base search error:', searchError);
      return NextResponse.json(
        { error: 'Failed to search knowledge base' },
        { status: 500 }
      );
    }

    console.log(`📚 Found ${knowledgeResults?.length || 0} relevant knowledge base documents`);

    if (knowledgeResults && knowledgeResults.length > 0) {
      console.log('📋 Knowledge base results preview:', knowledgeResults.map(r => ({
        title: r.title?.substring(0, 50),
        similarity: r.similarity,
        contentLength: r.content?.length
      })));
    }

    // Build context from knowledge base results
    let knowledgeContext = '';
    if (knowledgeResults && knowledgeResults.length > 0) {
      knowledgeContext = knowledgeResults
        .map((result, index) =>
          `--- Document ${index + 1}: ${result.title} (Similarity: ${result.similarity.toFixed(2)}) ---\n${result.content}`
        )
        .join('\n\n');

      console.log(`📝 Built knowledge context length: ${knowledgeContext.length} characters`);
    }

    // Create system message with knowledge context
    const systemMessage = {
      role: 'system' as const,
      content: knowledgeContext
        ? `${ATC_SYSTEM_PROMPT}\n\n=== KNOWLEDGE BASE CONTEXT ===\n${knowledgeContext}\n\n=== END CONTEXT ===`
        : `${ATC_SYSTEM_PROMPT}\n\n=== NO RELEVANT CONTEXT FOUND ===\nThe knowledge base did not return any relevant documents for this query. Please inform the user that you don't have enough information to answer their question accurately.`
    };

    console.log(`🎯 System message length: ${systemMessage.content.length} characters`);
    console.log(`🎯 Using context: ${knowledgeContext ? 'YES' : 'NO'}`);
    if (knowledgeContext) {
      console.log(`🎯 First 200 chars of context: ${knowledgeContext.substring(0, 200)}...`);
      console.log(`🎯 Full system message preview: ${systemMessage.content.substring(0, 800)}...`);

      // Log the exact content of first document to verify it contains runway incursion info
      if (knowledgeResults && knowledgeResults.length > 0) {
        console.log(`🔍 First document content (first 300 chars): ${knowledgeResults[0].content.substring(0, 300)}...`);
      }
    }

    // Prepare messages for OpenAI (include system prompt with context)
    const openaiMessages = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    console.log('🤖 Calling OpenAI with knowledge base context...');

    // Call OpenAI with streaming
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model,
      messages: openaiMessages,
      max_tokens: 2000,
      temperature: 0.7,
      stream: true,
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let totalTokens = 0;
          let promptTokens = 0;
          let completionTokens = 0;
          let fullResponse = '';

          for await (const chunk of completion) {
            const delta = chunk.choices?.[0]?.delta;

            if (delta?.content) {
              fullResponse += delta.content;
              const data = JSON.stringify({
                choices: [{
                  delta: {
                    content: delta.content
                  }
                }]
              });

              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Track token usage if available
            if (chunk.usage) {
              totalTokens = chunk.usage.total_tokens || 0;
              promptTokens = chunk.usage.prompt_tokens || 0;
              completionTokens = chunk.usage.completion_tokens || 0;
            }
          }

          // Estimate tokens if not provided (rough approximation)
          if (totalTokens === 0) {
            promptTokens = Math.ceil((systemMessage.content.length + userMessage.content.length) / 4);
            completionTokens = Math.ceil(fullResponse.length / 4);
            totalTokens = promptTokens + completionTokens;
          }

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Log usage for analytics
          const responseTime = Date.now() - startTime;
          console.log(`✅ Chat completed: ${model}, ${totalTokens} tokens, ${responseTime}ms, KB results: ${knowledgeResults?.length || 0}`);

          // Store analytics data
          try {
            const usageLog: ApiUsageLogInsert = {
              user_id: user.id,
              session_id: sessionId,
              model_used: model,
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
              cost: calculateCost(model, promptTokens, completionTokens),
              response_time_ms: responseTime,
              metadata: {
                knowledge_base_results: knowledgeResults?.length || 0,
                query_length: userMessage.content.length,
                response_length: fullResponse.length
              }
            };

            await supabase.from('api_usage_logs').insert(usageLog);
          } catch (analyticsError) {
            console.error('Failed to log usage analytics:', analyticsError);
            // Don't fail the request for analytics errors
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Error) {
      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json(
          { error: 'OpenAI quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  const rates = pricing[model] || pricing['gpt-4o-mini'];
  return ((promptTokens * rates.input) + (completionTokens * rates.output)) / 1000;
}