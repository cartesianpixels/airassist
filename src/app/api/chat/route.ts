import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import OpenAI from 'openai';
import type { Database } from '@/types/database';
import type { ApiUsageLogInsert } from '@/lib/supabase-typed';
import { getUserTier } from '@/lib/server-profile';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Use client-side Supabase (secure with RLS policies)
    const supabase = createServerSupabaseClient();
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

    // Call OpenAI
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 2000,
      temperature: 0.7,
    });

    const responseTime = Date.now() - startTime;
    const response = completion.choices[0]?.message?.content || '';
    const usage = completion.usage;

    // Usage tracking will be handled client-side or via middleware

    return NextResponse.json({
      response,
      usage,
      model,
      responseTime,
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