import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's tier to determine available models
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    const userTier = profile?.tier || 'free';

    // Get available model configurations for user's tier
    const { data: models, error: modelsError } = await supabase
      .from('model_configurations')
      .select('*')
      .filter('available_for_tiers', 'cs', `{${userTier}}`)
      .eq('is_active', true)
      .order('cost_per_1k_input_tokens', { ascending: true });

    if (modelsError) {
      console.error('Error fetching models:', modelsError);
      return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }

    // Get user's usage statistics for each model
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

    // Aggregate usage statistics by model
    const modelUsage = (usageStats || []).reduce((acc: any, log: any) => {
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
    const modelsWithUsage = (models || []).map((model: any) => ({
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