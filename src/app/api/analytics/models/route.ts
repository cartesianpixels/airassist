import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getUserTier } from '@/lib/server-profile';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ApiUsageLog = Database['public']['Tables']['api_usage_logs']['Row'];

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's tier to determine available models
    const userTier = await getUserTier(user.id);

    // For now, return hardcoded OpenAI models since we don't have model_configurations table
    const availableModels = getAvailableModels(userTier);

    // Get user's usage statistics
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: usageStats, error: usageError } = await supabase
      .from('api_usage_logs')
      .select('model_used, tokens_used, cost, response_time_ms, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    if (usageError) {
      console.error('Error fetching usage stats:', usageError);
      return NextResponse.json({ error: 'Failed to fetch usage statistics' }, { status: 500 });
    }

    const usageLogs = usageStats as Pick<ApiUsageLog, 'model_used' | 'tokens_used' | 'cost' | 'response_time_ms' | 'created_at'>[] || [];

    // Aggregate usage statistics by model
    const modelUsage = usageLogs.reduce((acc: Record<string, any>, log) => {
      const model = log.model_used || 'unknown';
      if (!acc[model]) {
        acc[model] = {
          model,
          usageCount: 0,
          totalTokens: 0,
          totalCost: 0,
          averageResponseTime: 0,
          lastUsed: null,
        };
      }

      acc[model].usageCount += 1;
      acc[model].totalTokens += log.tokens_used || 0;
      acc[model].totalCost += log.cost || 0;
      acc[model].averageResponseTime += log.response_time_ms || 0;

      if (!acc[model].lastUsed || new Date(log.created_at) > new Date(acc[model].lastUsed)) {
        acc[model].lastUsed = log.created_at;
      }

      return acc;
    }, {});

    // Calculate averages
    Object.values(modelUsage).forEach((usage: any) => {
      if (usage.usageCount > 0) {
        usage.averageResponseTime = Math.round(usage.averageResponseTime / usage.usageCount);
        usage.averageCostPerRequest = usage.totalCost / usage.usageCount;
        usage.averageTokensPerRequest = Math.round(usage.totalTokens / usage.usageCount);
      }
    });

    // Combine model configurations with usage statistics
    const modelsWithUsage = availableModels.map((model) => ({
      ...model,
      usage: modelUsage[model.model_id] || {
        model: model.model_id,
        usageCount: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        averageCostPerRequest: 0,
        averageTokensPerRequest: 0,
        lastUsed: null,
      },
      isRecommended: getModelRecommendation(model, userTier),
    }));

    return NextResponse.json({
      models: modelsWithUsage,
      userTier,
      period: `${days} days`,
    });

  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model information' },
      { status: 500 }
    );
  }
}

function getAvailableModels(userTier: string) {
  const baseModels = [
    {
      model_id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Optimized for speed and cost efficiency',
      cost_per_1k_input_tokens: 0.00015,
      cost_per_1k_output_tokens: 0.0006,
      max_tokens: 128000,
      is_active: true,
      available_for_tiers: ['free', 'basic', 'pro', 'enterprise'],
    },
    {
      model_id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Latest GPT-4 with enhanced capabilities',
      cost_per_1k_input_tokens: 0.005,
      cost_per_1k_output_tokens: 0.015,
      max_tokens: 128000,
      is_active: true,
      available_for_tiers: ['basic', 'pro', 'enterprise'],
    },
    {
      model_id: 'gpt-4',
      name: 'GPT-4',
      description: 'High-quality responses for complex tasks',
      cost_per_1k_input_tokens: 0.03,
      cost_per_1k_output_tokens: 0.06,
      max_tokens: 8192,
      is_active: true,
      available_for_tiers: ['pro', 'enterprise'],
    },
    {
      model_id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Fast and efficient for general use',
      cost_per_1k_input_tokens: 0.0005,
      cost_per_1k_output_tokens: 0.0015,
      max_tokens: 16385,
      is_active: true,
      available_for_tiers: ['free', 'basic', 'pro', 'enterprise'],
    }
  ];

  return baseModels.filter(model =>
    model.available_for_tiers.includes(userTier)
  );
}

function getModelRecommendation(model: any, userTier: string): {
  recommended: boolean;
  reason: string;
} {
  // Recommendation logic based on model characteristics and user tier
  if (model.model_id === 'gpt-4o-mini') {
    return {
      recommended: true,
      reason: 'Best balance of cost and performance for most queries',
    };
  }

  if (model.model_id === 'gpt-4o' && ['pro', 'enterprise'].includes(userTier)) {
    return {
      recommended: true,
      reason: 'Latest model with excellent capabilities',
    };
  }

  if (model.model_id === 'gpt-4' && userTier === 'enterprise') {
    return {
      recommended: false,
      reason: 'Use GPT-4o instead for better performance and value',
    };
  }

  if (model.model_id === 'gpt-3.5-turbo') {
    return {
      recommended: userTier === 'free',
      reason: userTier === 'free'
        ? 'Good option for simple queries on free tier'
        : 'Consider GPT-4o Mini for better quality',
    };
  }

  return {
    recommended: false,
    reason: 'Not currently recommended',
  };
}