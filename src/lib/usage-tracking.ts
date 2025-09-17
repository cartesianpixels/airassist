import { insertUsageLog, supabase, type ApiUsageLogInsert } from '@/lib/supabase-typed';

export interface UsageData {
  sessionId?: string;
  endpoint: string;
  method?: string;
  statusCode?: number;
  responseTimeMs?: number;
  tokensUsed?: number;
  cost?: number;
  modelUsed?: string;
  promptTokens?: number;
  completionTokens?: number;
  requestData?: any;
  responseData?: any;
  errorMessage?: string;
}

export async function trackUsage(data: UsageData): Promise<boolean> {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error in usage tracking:', authError);
      return false;
    }

    const usageLogData: ApiUsageLogInsert = {
      user_id: user.id,
      session_id: data.sessionId || null,
      endpoint: data.endpoint,
      method: data.method || 'POST',
      status_code: data.statusCode || null,
      response_time_ms: data.responseTimeMs || null,
      tokens_used: data.tokensUsed || null,
      cost: data.cost || null,
      model_used: data.modelUsed || null,
      prompt_tokens: data.promptTokens || null,
      completion_tokens: data.completionTokens || null,
      request_data: data.requestData || null,
      response_data: data.responseData || null,
      error_message: data.errorMessage || null,
    };

    await insertUsageLog(usageLogData);
    return true;
  } catch (error) {
    console.error('Error tracking usage:', error);
    return false;
  }
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Pricing per 1K tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  const modelPricing = pricing[model] || pricing['gpt-4o-mini'];

  const inputCost = (promptTokens / 1000) * modelPricing.input;
  const outputCost = (completionTokens / 1000) * modelPricing.output;

  return inputCost + outputCost;
}