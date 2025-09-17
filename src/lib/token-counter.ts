import OpenAI from 'openai';

// Token counting utilities for different models
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface ModelPricing {
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  maxTokens: number;
  contextWindow: number;
}

// Model pricing configuration (should sync with database)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': {
    costPer1kInputTokens: 0.000150,
    costPer1kOutputTokens: 0.000600,
    maxTokens: 16384,
    contextWindow: 128000,
  },
  'gpt-4o': {
    costPer1kInputTokens: 0.002500,
    costPer1kOutputTokens: 0.010000,
    maxTokens: 4096,
    contextWindow: 128000,
  },
  'gpt-4': {
    costPer1kInputTokens: 0.030000,
    costPer1kOutputTokens: 0.060000,
    maxTokens: 8192,
    contextWindow: 8192,
  },
  'gpt-3.5-turbo': {
    costPer1kInputTokens: 0.000500,
    costPer1kOutputTokens: 0.001500,
    maxTokens: 4096,
    contextWindow: 16385,
  },
};

/**
 * Estimate token count for text using a simple heuristic
 * More accurate counting would require tiktoken library
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  // This is a simplified approach - in production, use tiktoken
  const estimatedTokens = Math.ceil(text.length / 4);
  
  // Add some padding for special tokens and formatting
  return Math.ceil(estimatedTokens * 1.1);
}

/**
 * Estimate token count for messages array
 */
export function estimateMessagesTokenCount(messages: Array<{role: string; content: string}>): number {
  let totalTokens = 0;
  
  for (const message of messages) {
    // Account for role tokens and formatting
    totalTokens += estimateTokenCount(message.content);
    totalTokens += 4; // Overhead for role and formatting
  }
  
  // Add tokens for the conversation structure
  totalTokens += 3; // Base conversation tokens
  
  return totalTokens;
}

/**
 * Calculate cost based on token usage and model
 */
export function calculateCost(
  tokenUsage: TokenUsage,
  modelId: string
): CostCalculation {
  const pricing = MODEL_PRICING[modelId];
  
  if (!pricing) {
    console.warn(`Unknown model pricing for: ${modelId}`);
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };
  }
  
  const inputCost = (tokenUsage.promptTokens / 1000) * pricing.costPer1kInputTokens;
  const outputCost = (tokenUsage.completionTokens / 1000) * pricing.costPer1kOutputTokens;
  const totalCost = inputCost + outputCost;
  
  return {
    inputCost: Math.round(inputCost * 1000000) / 1000000, // 6 decimal places
    outputCost: Math.round(outputCost * 1000000) / 1000000,
    totalCost: Math.round(totalCost * 1000000) / 1000000,
  };
}

/**
 * Extract token usage from OpenAI response
 */
export function extractTokenUsageFromResponse(response: any): TokenUsage | null {
  try {
    if (response.usage) {
      return {
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Error extracting token usage:', error);
    return null;
  }
}

/**
 * Track streaming response tokens (estimate for now)
 */
export class StreamingTokenTracker {
  private promptTokens: number = 0;
  private completionTokens: number = 0;
  private content: string = '';
  
  constructor(initialPromptTokens: number = 0) {
    this.promptTokens = initialPromptTokens;
  }
  
  addContent(chunk: string): void {
    this.content += chunk;
    this.completionTokens = estimateTokenCount(this.content);
  }
  
  getUsage(): TokenUsage {
    return {
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.promptTokens + this.completionTokens,
    };
  }
  
  getCost(modelId: string): CostCalculation {
    return calculateCost(this.getUsage(), modelId);
  }
}

/**
 * Validate if request is within model limits
 */
export function validateTokenLimits(
  estimatedTokens: number,
  modelId: string,
  maxOutputTokens: number = 1500
): { valid: boolean; reason?: string } {
  const pricing = MODEL_PRICING[modelId];
  
  if (!pricing) {
    return { valid: false, reason: `Unknown model: ${modelId}` };
  }
  
  const totalEstimatedTokens = estimatedTokens + maxOutputTokens;
  
  if (totalEstimatedTokens > pricing.contextWindow) {
    return {
      valid: false,
      reason: `Request would exceed context window (${totalEstimatedTokens} > ${pricing.contextWindow})`,
    };
  }
  
  if (maxOutputTokens > pricing.maxTokens) {
    return {
      valid: false,
      reason: `Output tokens exceed model limit (${maxOutputTokens} > ${pricing.maxTokens})`,
    };
  }
  
  return { valid: true };
}

/**
 * Get optimal model for request based on cost and capabilities
 */
export function getOptimalModel(
  estimatedTokens: number,
  userTier: 'free' | 'basic' | 'pro' | 'enterprise' = 'free',
  complexity: 'simple' | 'medium' | 'complex' = 'medium'
): string {
  const availableModels = getAvailableModels(userTier);
  
  // For simple queries, prefer cheaper models
  if (complexity === 'simple' && availableModels.includes('gpt-4o-mini')) {
    return 'gpt-4o-mini';
  }
  
  // For complex queries, prefer more capable models
  if (complexity === 'complex' && availableModels.includes('gpt-4o')) {
    return 'gpt-4o';
  }
  
  // Default to balanced option
  if (availableModels.includes('gpt-4o-mini')) {
    return 'gpt-4o-mini';
  }
  
  return availableModels[0] || 'gpt-4o-mini';
}

/**
 * Get available models for user tier
 */
export function getAvailableModels(userTier: 'free' | 'basic' | 'pro' | 'enterprise'): string[] {
  const modelsByTier = {
    free: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    basic: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o'],
    pro: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4'],
    enterprise: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4'],
  };
  
  return modelsByTier[userTier] || modelsByTier.free;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.001) {
    return '<$0.001';
  }
  return `$${cost.toFixed(cost < 0.01 ? 4 : 2)}`;
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  }
  return `${(tokens / 1000).toFixed(1)}K`;
}

/**
 * Estimate cost for a conversation before making the API call
 */
export function estimateConversationCost(
  messages: Array<{role: string; content: string}>,
  modelId: string,
  maxOutputTokens: number = 1500
): { estimatedCost: number; estimatedTokens: number } {
  const estimatedInputTokens = estimateMessagesTokenCount(messages);
  const totalEstimatedTokens = estimatedInputTokens + maxOutputTokens;
  
  const cost = calculateCost(
    {
      promptTokens: estimatedInputTokens,
      completionTokens: maxOutputTokens,
      totalTokens: totalEstimatedTokens,
    },
    modelId
  );
  
  return {
    estimatedCost: cost.totalCost,
    estimatedTokens: totalEstimatedTokens,
  };
}