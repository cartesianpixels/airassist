import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import { getEmbedding } from '@/lib/embeddings';
import type { Database } from '@/types/database';
import type { ApiUsageLogInsert } from '@/lib/supabase-typed';
import { getUserTier } from '@/lib/server-profile';
import { atcAssistantFlowWrapper } from '@/ai/assistant';

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

    console.log('🔍 Processing query with assistant workflow:', userMessage.content.substring(0, 100));

    // Create a streaming response that sends thinking updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send thinking update: Starting search
          const thinkingUpdate1 = JSON.stringify({
            type: 'thinking',
            message: 'Analyzing your question about ATC procedures...'
          });
          controller.enqueue(encoder.encode(`data: ${thinkingUpdate1}\n\n`));

          // Send thinking update: Searching
          const thinkingUpdate2 = JSON.stringify({
            type: 'thinking',
            message: 'Searching through FAA documentation...'
          });
          controller.enqueue(encoder.encode(`data: ${thinkingUpdate2}\n\n`));

          // Actually call the assistant
          const assistantResponse = await atcAssistantFlowWrapper(messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })));

          // Send thinking update: Found documents
          const thinkingUpdate3 = JSON.stringify({
            type: 'thinking',
            message: `Found ${assistantResponse.sources.length} relevant documents`
          });
          controller.enqueue(encoder.encode(`data: ${thinkingUpdate3}\n\n`));

          // Send thinking update: Processing
          const thinkingUpdate4 = JSON.stringify({
            type: 'thinking',
            message: 'Processing information and formatting response...'
          });
          controller.enqueue(encoder.encode(`data: ${thinkingUpdate4}\n\n`));

          const startTime = Date.now();
          const fullResponse = assistantResponse.content;

          // Stream the response content character by character to simulate typing
          const words = fullResponse.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = i === 0 ? words[i] : ' ' + words[i];
            const data = JSON.stringify({
              choices: [{
                delta: {
                  content: chunk
                }
              }]
            });

            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // Small delay to simulate typing
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Estimate tokens (rough approximation)
          const promptTokens = Math.ceil(userMessage.content.length / 4);
          const completionTokens = Math.ceil(fullResponse.length / 4);
          const totalTokens = promptTokens + completionTokens;

          // Send sources information before completion
          const sourcesData = JSON.stringify({
            type: 'sources',
            sources: assistantResponse.sources
          });
          controller.enqueue(encoder.encode(`data: ${sourcesData}\n\n`));

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Log usage for analytics
          const responseTime = Date.now() - startTime;
          console.log(`✅ Chat completed: ${model}, ${totalTokens} tokens, ${responseTime}ms, Sources: ${assistantResponse.sources.length}`);

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
                sources_count: assistantResponse.sources.length,
                query_length: userMessage.content.length,
                response_length: fullResponse.length,
                sources: assistantResponse.sources.map(s => ({ id: s.id, name: s.name, type: s.source_type }))
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