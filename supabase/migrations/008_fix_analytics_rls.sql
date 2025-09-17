-- Fix Analytics RLS Policies to Allow Proper Data Flow
-- Migration: Fix Row Level Security for Analytics Tables

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "System can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "System can insert API usage logs" ON api_usage_logs;
DROP POLICY IF EXISTS "System can insert metrics" ON system_metrics;

-- Create more permissive policies for analytics tracking

-- Analytics events: Allow inserts for authenticated users for their own data
CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Also allow service role to insert any analytics events
CREATE POLICY "Service role can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- API usage logs: Allow inserts for authenticated users for their own data
CREATE POLICY "Users can insert their own API usage logs" ON api_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also allow service role to insert any API usage logs
CREATE POLICY "Service role can insert API usage logs" ON api_usage_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- System metrics: Allow authenticated users to insert metrics
CREATE POLICY "Authenticated users can insert system metrics" ON system_metrics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Also allow service role to insert system metrics
CREATE POLICY "Service role can insert system metrics" ON system_metrics
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Rate limits: Allow users to update their own rate limits via function calls
CREATE POLICY "Users can insert their own rate limits" ON rate_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User sessions: Allow users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update functions to use SECURITY INVOKER instead of SECURITY DEFINER
-- This allows RLS policies to work properly with the functions

CREATE OR REPLACE FUNCTION track_analytics_event(
  p_user_id UUID,
  p_session_id UUID,
  p_event_type analytics_event_type,
  p_event_data JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referer TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    user_id, session_id, event_type, event_data,
    ip_address, user_agent, referer
  ) VALUES (
    p_user_id, p_session_id, p_event_type, p_event_data,
    p_ip_address, p_user_agent, p_referer
  ) RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER; -- Changed from SECURITY DEFINER

CREATE OR REPLACE FUNCTION log_api_usage(
  p_user_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_endpoint TEXT DEFAULT '',
  p_method TEXT DEFAULT 'POST',
  p_status_code INTEGER DEFAULT 200,
  p_response_time_ms INTEGER DEFAULT 0,
  p_tokens_used INTEGER DEFAULT 0,
  p_cost DECIMAL DEFAULT 0.000000,
  p_model_used TEXT DEFAULT 'gpt-4o-mini',
  p_prompt_tokens INTEGER DEFAULT 0,
  p_completion_tokens INTEGER DEFAULT 0,
  p_request_data JSONB DEFAULT '{}',
  p_response_data JSONB DEFAULT '{}',
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO api_usage_logs (
    user_id, session_id, endpoint, method, status_code,
    response_time_ms, tokens_used, cost, model_used,
    prompt_tokens, completion_tokens, request_data,
    response_data, error_message
  ) VALUES (
    p_user_id, p_session_id, p_endpoint, p_method, p_status_code,
    p_response_time_ms, p_tokens_used, p_cost, p_model_used,
    p_prompt_tokens, p_completion_tokens, p_request_data,
    p_response_data, p_error_message
  ) RETURNING id INTO log_id;

  -- Update user totals
  UPDATE profiles
  SET
    total_tokens_used = total_tokens_used + p_tokens_used,
    total_cost = total_cost + p_cost
  WHERE id = p_user_id;

  -- Update rate limits
  UPDATE rate_limits
  SET
    daily_used = daily_used + 1,
    monthly_used = monthly_used + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER; -- Changed from SECURITY DEFINER

-- Fix RLS policies to allow proper analytics data flow while maintaining security