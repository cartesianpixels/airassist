import { createClient } from '@/lib/supabase';
import type { AnalyticsEventType, UserTier } from '@/types/database';

export interface AnalyticsEvent {
  userId: string;
  sessionId?: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
}

export interface ApiUsageLog {
  userId: string;
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
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  errorMessage?: string;
}

export interface SystemMetric {
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  tags?: Record<string, any>;
}

export interface UsageAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageSessionLength: number;
  averageMessagesPerSession: number;
  mostUsedModel: string;
  errorRate: number;
}

/**
 * Analytics service for tracking user events and system metrics
 */
export class AnalyticsService {
  private supabase = createClient();

  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('analytics_events')
        .insert({
          user_id: event.userId,
          session_id: event.sessionId,
          event_type: event.eventType,
          event_data: event.eventData || {},
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          referer: event.referer,
        });

      if (error) {
        console.error('Error tracking analytics event:', error);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  /**
   * Log API usage
   */
  async logApiUsage(usage: ApiUsageLog): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('api_usage_logs')
        .insert({
          user_id: usage.userId,
          session_id: usage.sessionId,
          endpoint: usage.endpoint,
          method: usage.method || 'POST',
          status_code: usage.statusCode || 200,
          response_time_ms: usage.responseTimeMs || 0,
          tokens_used: usage.tokensUsed || 0,
          cost: usage.cost || 0,
          model_used: usage.modelUsed || 'gpt-4o-mini',
          prompt_tokens: usage.promptTokens || 0,
          completion_tokens: usage.completionTokens || 0,
          request_data: usage.requestData || {},
          response_data: usage.responseData || {},
          error_message: usage.errorMessage,
        });

      if (error) {
        console.error('Error logging API usage:', error);
      }
    } catch (error) {
      console.error('API usage logging error:', error);
    }
  }

  /**
   * Record system metric
   */
  async recordSystemMetric(metric: SystemMetric): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('system_metrics')
        .insert({
          metric_name: metric.metricName,
          metric_value: metric.metricValue,
          metric_unit: metric.metricUnit,
          tags: metric.tags || {},
        });

      if (error) {
        console.error('Error recording system metric:', error);
      }
    } catch (error) {
      console.error('System metric recording error:', error);
    }
  }

  /**
   * Get user rate limit status
   */
  async getUserRateLimit(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_rate_limit', { p_user_id: userId });

      if (error) {
        console.error('Error getting user rate limit:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Rate limit query error:', error);
      return null;
    }
  }

  /**
   * Get user analytics summary
   */
  async getUserAnalytics(userId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get session analytics
      const { data: sessionData, error: sessionError } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (sessionError) {
        console.error('Error getting session analytics:', sessionError);
      }

      // Get message analytics
      const { data: messageData, error: messageError } = await this.supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (messageError) {
        console.error('Error getting message analytics:', messageError);
      }

      // Get API usage analytics
      const { data: apiData, error: apiError } = await this.supabase
        .from('api_usage_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (apiError) {
        console.error('Error getting API analytics:', apiError);
      }

      return {
        sessions: sessionData || [],
        messages: messageData || [],
        apiUsage: apiData || [],
      };
    } catch (error) {
      console.error('User analytics query error:', error);
      return null;
    }
  }

  /**
   * Get system-wide analytics (admin only)
   */
  async getSystemAnalytics(days: number = 7): Promise<UsageAnalytics | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get aggregated data
      const { data: usageData, error: usageError } = await this.supabase
        .from('usage_analytics')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .eq('period_type', 'daily')
        .order('date', { ascending: false });

      if (usageError) {
        console.error('Error getting system analytics:', usageError);
        return null;
      }

      if (!usageData || usageData.length === 0) {
        return null;
      }

      // Aggregate the data
      const totals = usageData.reduce(
        (acc, day) => ({
          totalUsers: Math.max(acc.totalUsers, day.total_users || 0),
          activeUsers: acc.activeUsers + (day.active_users || 0),
          totalSessions: acc.totalSessions + (day.total_sessions || 0),
          totalMessages: acc.totalMessages + (day.total_messages || 0),
          totalTokens: acc.totalTokens + (day.total_tokens || 0),
          totalCost: acc.totalCost + (day.total_cost || 0),
          averageSessionLength: acc.averageSessionLength + (day.avg_session_length_minutes || 0),
          averageMessagesPerSession: acc.averageMessagesPerSession + (day.avg_messages_per_session || 0),
          errorRate: acc.errorRate + (day.error_rate || 0),
        }),
        {
          totalUsers: 0,
          activeUsers: 0,
          totalSessions: 0,
          totalMessages: 0,
          totalTokens: 0,
          totalCost: 0,
          averageSessionLength: 0,
          averageMessagesPerSession: 0,
          errorRate: 0,
        }
      );

      const dayCount = usageData.length;
      const mostUsedModel = usageData[0]?.most_used_model || 'gpt-4o-mini';

      return {
        ...totals,
        activeUsers: totals.activeUsers / dayCount,
        averageSessionLength: totals.averageSessionLength / dayCount,
        averageMessagesPerSession: totals.averageMessagesPerSession / dayCount,
        errorRate: totals.errorRate / dayCount,
        mostUsedModel,
      };
    } catch (error) {
      console.error('System analytics query error:', error);
      return null;
    }
  }

  /**
   * Get model usage statistics
   */
  async getModelUsageStats(days: number = 7): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('api_usage_logs')
        .select('model_used, tokens_used, cost, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Error getting model usage stats:', error);
        return [];
      }

      // Aggregate by model
      const modelStats = data?.reduce((acc: any, log: any) => {
        const model = log.model_used || 'unknown';
        if (!acc[model]) {
          acc[model] = {
            model: model,
            usageCount: 0,
            totalTokens: 0,
            totalCost: 0,
          };
        }
        acc[model].usageCount += 1;
        acc[model].totalTokens += log.tokens_used || 0;
        acc[model].totalCost += log.cost || 0;
        return acc;
      }, {});

      return Object.values(modelStats || {}).sort((a: any, b: any) => b.usageCount - a.usageCount);
    } catch (error) {
      console.error('Model usage stats query error:', error);
      return [];
    }
  }

  /**
   * Track user login
   */
  async trackUserLogin(userId: string, metadata?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      userId,
      eventType: 'user_login',
      eventData: metadata,
    });

    // Update last login timestamp
    try {
      await this.supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Track user logout
   */
  async trackUserLogout(userId: string): Promise<void> {
    await this.trackEvent({
      userId,
      eventType: 'user_logout',
    });
  }

  /**
   * Track session start
   */
  async trackSessionStart(userId: string, sessionId: string): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventType: 'session_started',
    });
  }

  /**
   * Track session end
   */
  async trackSessionEnd(userId: string, sessionId: string, metadata?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventType: 'session_ended',
      eventData: metadata,
    });
  }

  /**
   * Track message sent
   */
  async trackMessageSent(userId: string, sessionId: string, messageLength: number): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventType: 'message_sent',
      eventData: { messageLength },
    });
  }

  /**
   * Track response received
   */
  async trackResponseReceived(
    userId: string,
    sessionId: string,
    metadata: {
      model: string;
      tokenCount: number;
      responseTime: number;
      cost: number;
    }
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventType: 'response_received',
      eventData: metadata,
    });
  }

  /**
   * Increment user's daily usage count
   */
  async incrementDailyUsage(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('rate_limits')
        .select('daily_used, daily_limit')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error checking rate limit:', error);
        return false;
      }

      if (data.daily_used >= data.daily_limit) {
        return false; // Rate limited
      }

      // Increment usage
      await this.supabase
        .from('rate_limits')
        .update({
          daily_used: data.daily_used + 1,
          monthly_used: data.monthly_used + 1,
          is_limited: data.daily_used + 1 >= data.daily_limit,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return true;
    } catch (error) {
      console.error('Error incrementing daily usage:', error);
      return false;
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Helper functions for common analytics operations

/**
 * Track API call with timing and usage metrics
 */
export async function trackApiCall(
  userId: string,
  endpoint: string,
  startTime: number,
  tokenUsage?: { prompt: number; completion: number; total: number },
  cost?: number,
  model?: string,
  error?: string
): Promise<void> {
  const responseTime = Date.now() - startTime;
  
  await analytics.logApiUsage({
    userId,
    endpoint,
    responseTimeMs: responseTime,
    tokensUsed: tokenUsage?.total || 0,
    cost: cost || 0,
    modelUsed: model || 'gpt-4o-mini',
    promptTokens: tokenUsage?.prompt || 0,
    completionTokens: tokenUsage?.completion || 0,
    errorMessage: error,
  });
}

/**
 * Record system performance metric
 */
export async function recordMetric(
  name: string,
  value: number,
  unit?: string,
  tags?: Record<string, any>
): Promise<void> {
  await analytics.recordSystemMetric({
    metricName: name,
    metricValue: value,
    metricUnit: unit,
    tags,
  });
}

/**
 * Check if user can make another API call (rate limiting)
 */
export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: string }> {
  const rateLimit = await analytics.getUserRateLimit(userId);
  
  if (!rateLimit) {
    return { allowed: true, remaining: 100, resetTime: new Date().toISOString() };
  }
  
  const allowed = !rateLimit.is_limited;
  const remaining = Math.max(0, rateLimit.daily_limit - rateLimit.daily_used);
  
  return {
    allowed,
    remaining,
    resetTime: rateLimit.daily_reset_at,
  };
}