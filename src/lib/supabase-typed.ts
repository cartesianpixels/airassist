import { createClient as createBrowserClient } from '@/lib/supabase'
// Server client removed for security - client-side only
import type { Database } from '@/types/database'

// Type-safe Supabase client wrapper
export type TypedSupabaseClient = ReturnType<typeof createBrowserClient>
// Server client removed for security

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