import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { supabaseSemanticSearch } from '@/lib/database-supabase';
import { createClient } from '@/lib/supabase-server';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema)
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

    const body = await request.json();
    const { messages } = RequestSchema.parse(body);

    console.log(`[${requestId}] Processing ${messages.length} messages for user ${user.id}`);

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

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use cheaper, faster model with larger context
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1500, // Reduced to save context space
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
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          console.log(`[${requestId}] Stream completed`);
        } catch (error) {
          console.error(`[${requestId}] Stream error:`, error);
          controller.error(error);
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error(`[${requestId}] API route error:`, error);
    return new Response(
      JSON.stringify({
        error: 'Request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}