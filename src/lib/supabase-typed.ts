import { createClient as createBrowserClient } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Export typed Supabase client instance
export const supabase: SupabaseClient<Database> = createBrowserClient()

// Type-safe Supabase client wrapper
export type TypedSupabaseClient = ReturnType<typeof createBrowserClient>

// Type helpers
export type Tables = Database['public']['Tables']
export type Profile = Tables['profiles']['Row']
export type ChatSession = Tables['chat_sessions']['Row']
export type Message = Tables['messages']['Row']
export type AnalyticsEvent = Tables['analytics_events']['Row']
export type ApiUsageLog = Tables['api_usage_logs']['Row']
export type RateLimit = Tables['rate_limits']['Row']
export type SystemMetric = Tables['system_metrics']['Row']
export type UsageAnalytics = Tables['usage_analytics']['Row']

// Insert types
export type ProfileInsert = Tables['profiles']['Insert']
export type ChatSessionInsert = Tables['chat_sessions']['Insert']
export type MessageInsert = Tables['messages']['Insert']
export type AnalyticsEventInsert = Tables['analytics_events']['Insert']
export type ApiUsageLogInsert = Tables['api_usage_logs']['Insert']
export type RateLimitInsert = Tables['rate_limits']['Insert']
export type SystemMetricInsert = Tables['system_metrics']['Insert']
export type UsageAnalyticsInsert = Tables['usage_analytics']['Insert']

// Update types
export type ProfileUpdate = Tables['profiles']['Update']
export type ChatSessionUpdate = Tables['chat_sessions']['Update']
export type MessageUpdate = Tables['messages']['Update']
export type AnalyticsEventUpdate = Tables['analytics_events']['Update']
export type ApiUsageLogUpdate = Tables['api_usage_logs']['Update']
export type RateLimitUpdate = Tables['rate_limits']['Update']
export type SystemMetricUpdate = Tables['system_metrics']['Update']
export type UsageAnalyticsUpdate = Tables['usage_analytics']['Update']

// Utility functions with proper typing
export async function insertAnalytics(data: AnalyticsEventInsert) {
  const { data: result, error } = await (supabase as any)
    .from('analytics_events')
    .insert(data);

  if (error) {
    console.error('Analytics insert error:', error);
    throw error;
  }

  return result;
}

export async function insertUsageLog(data: ApiUsageLogInsert) {
  const { data: result, error } = await (supabase as any)
    .from('api_usage_logs')
    .insert(data);

  if (error) {
    console.error('Usage log insert error:', error);
    throw error;
  }

  return result;
}