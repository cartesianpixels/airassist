import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { supabaseSemanticSearch } from '@/lib/database-supabase';
import { createClient } from '@/lib/supabase-server';
import { 
  estimateMessagesTokenCount, 
  calculateCost, 
  extractTokenUsageFromResponse,
  StreamingTokenTracker,
  validateTokenLimits,
  getOptimalModel,
  type TokenUsage 
} from '@/lib/token-counter';
import { analytics, checkRateLimit, trackApiCall } from '@/lib/analytics';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string().optional(),
  sessionId: z.string().optional(),
  maxTokens: z.number().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getRelevantKnowledge(query: string, userId?: string) {
  try {
    console.log(`Searching Supabase knowledge for: "${query.substring(0, 100)}"`);

    const results = await supabaseSemanticSearch(query, {
      limit: 5, // Reduced from 10
      threshold: 0.6 // Increased threshold for better relevance
    }, userId);

    console.log(`Found ${results.length} relevant documents`);

    if (results.length === 0) {
      return "No specific information found in knowledge base.";
    }

    // Truncate content to prevent context overflow
    return results.map(result => {
      const truncatedText = result.text.length > 500
        ? result.text.substring(0, 500) + "..."
        : result.text;

      return `Title: ${result.metadata.title || 'Unknown'}
Content: ${truncatedText}
---`;
    }).join('\n');
  } catch (error) {
    console.error('Supabase knowledge search error:', error);
    return "Error searching knowledge base.";
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  console.log(`[${requestId}] Starting OpenAI chat request`);

  try {
    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(`[${requestId}] Authentication error:`, authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check rate limiting
    const rateLimitCheck = await checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      console.log(`[${requestId}] Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          remaining: rateLimitCheck.remaining,
          resetTime: rateLimitCheck.resetTime,
        }),
        {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
            'X-RateLimit-Reset': rateLimitCheck.resetTime,
          }
        }
      );
    }

    const body = await request.json();
    const { messages, model: requestedModel, sessionId, maxTokens = 1500 } = RequestSchema.parse(body);

    console.log(`[${requestId}] Processing ${messages.length} messages for user ${user.id}`);

    // Get user profile to determine tier and preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, role')
      .eq('id', user.id)
      .single();

    const userTier = profile?.tier || 'free';

    // Estimate token count for input
    const estimatedInputTokens = estimateMessagesTokenCount(messages);
    
    // Determine optimal model
    const modelToUse = requestedModel || getOptimalModel(estimatedInputTokens, userTier, 'medium');
    
    // Validate token limits
    const validation = validateTokenLimits(estimatedInputTokens, modelToUse, maxTokens);
    if (!validation.valid) {
      console.log(`[${requestId}] Token limit validation failed: ${validation.reason}`);
      return new Response(
        JSON.stringify({ error: validation.reason }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Using model: ${modelToUse}, estimated input tokens: ${estimatedInputTokens}`);

    const lastMessage = messages[messages.length - 1]?.content || '';

    // Get relevant knowledge with user context
    const knowledge = await getRelevantKnowledge(lastMessage, user.id);

    // System prompt
    const systemMessage = {
      role: 'system' as const,
      content: `You are an expert Air Traffic Control assistant. Answer questions using the provided knowledge base.

Guidelines:
- Provide clear, helpful answers about aviation procedures and regulations
- Reference source documents when citing specific rules
- Use conversational tone
- If you can't find the answer, say so honestly

Knowledge Base:
${knowledge}

Answer the user's question based on this knowledge.`
    };

    // Truncate conversation history to prevent context overflow
    // Keep only the last 4 messages (2 exchanges) plus system message
    const truncatedMessages = messages.slice(-4);

    // Prepare messages for OpenAI
    const openaiMessages = [systemMessage, ...truncatedMessages];

    console.log(`[${requestId}] Calling OpenAI API...`);

    // Initialize token tracker for streaming
    const tokenTracker = new StreamingTokenTracker(estimatedInputTokens);
    let totalContent = '';
    let responseStartTime = Date.now();

    const stream = await openai.chat.completions.create({
      model: modelToUse,
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: true,
    });

    console.log(`[${requestId}] OpenAI stream started`);

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              totalContent += content;
              tokenTracker.addContent(content);
              
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          // Calculate final metrics
          const responseTime = Date.now() - responseStartTime;
          const finalTokenUsage = tokenTracker.getUsage();
          const finalCost = tokenTracker.getCost(modelToUse);

          console.log(`[${requestId}] Stream completed - Tokens: ${finalTokenUsage.totalTokens}, Cost: $${finalCost.totalCost.toFixed(6)}, Time: ${responseTime}ms`);

          // Track analytics and usage (async, don't block response)
          Promise.all([
            // Track API usage
            trackApiCall(
              user.id,
              '/api/chat',
              startTime,
              {
                prompt: finalTokenUsage.promptTokens,
                completion: finalTokenUsage.completionTokens,
                total: finalTokenUsage.totalTokens,
              },
              finalCost.totalCost,
              modelToUse
            ),
            // Track response received event
            analytics.trackResponseReceived(user.id, sessionId || 'unknown', {
              model: modelToUse,
              tokenCount: finalTokenUsage.totalTokens,
              responseTime,
              cost: finalCost.totalCost,
            }),
            // Increment daily usage
            analytics.incrementDailyUsage(user.id),
          ]).catch(error => {
            console.error(`[${requestId}] Error tracking analytics:`, error);
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error(`[${requestId}] Stream error:`, error);
          
          // Track error
          trackApiCall(
            user.id,
            '/api/chat',
            startTime,
            undefined,
            undefined,
            modelToUse,
            error instanceof Error ? error.message : 'Unknown error'
          ).catch(console.error);
          
          controller.error(error);
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Model-Used': modelToUse,
        'X-Estimated-Tokens': estimatedInputTokens.toString(),
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
      },
    });

  } catch (error) {
    console.error(`[${requestId}] API route error:`, error);
    
    // Track error in analytics
    if (user?.id) {
      trackApiCall(
        user.id,
        '/api/chat',
        startTime,
        undefined,
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      ).catch(console.error);
    }
    
    return new Response(
      JSON.stringify({
        error: 'Request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}