-- Enhanced AirAssist Database Schema for Analytics and Production Features
-- Migration: Analytics, Rate Limiting, and User Management Enhancement

-- Create enum types for better data integrity
CREATE TYPE user_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE analytics_event_type AS ENUM (
  'user_login', 'user_logout', 'session_started', 'session_ended', 
  'message_sent', 'response_received', 'api_call', 'page_view'
);

-- Enhance the profiles table with additional fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier user_tier DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_tokens_used BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,4) DEFAULT 0.00;

-- Create analytics_events table for comprehensive tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID,
  event_type analytics_event_type NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_data ON analytics_events USING GIN(event_data);

-- Create api_usage_logs table for detailed API tracking
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0.000000,
  model_used TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  request_data JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for api_usage_logs
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_session_id ON api_usage_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_model ON api_usage_logs(model_used);

-- Create rate_limits table for per-user quota tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  tier user_tier NOT NULL DEFAULT 'free',
  daily_limit INTEGER NOT NULL DEFAULT 100,
  monthly_limit INTEGER NOT NULL DEFAULT 1000,
  daily_used INTEGER DEFAULT 0,
  monthly_used INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ,
  monthly_reset_at TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMPTZ,
  is_limited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_tier ON rate_limits(tier);

-- Create model_configurations table for AI model management
CREATE TABLE IF NOT EXISTS model_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  cost_per_1k_input_tokens DECIMAL(10,6) NOT NULL,
  cost_per_1k_output_tokens DECIMAL(10,6) NOT NULL,
  max_tokens INTEGER NOT NULL,
  context_window INTEGER NOT NULL,
  available_for_tiers user_tier[] DEFAULT '{free,basic,pro,enterprise}',
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default model configurations
INSERT INTO model_configurations (
  model_id, model_name, provider, 
  cost_per_1k_input_tokens, cost_per_1k_output_tokens,
  max_tokens, context_window, available_for_tiers
) VALUES 
('gpt-4o-mini', 'GPT-4o Mini', 'openai', 0.000150, 0.000600, 16384, 128000, '{free,basic,pro,enterprise}'),
('gpt-4o', 'GPT-4o', 'openai', 0.002500, 0.010000, 4096, 128000, '{basic,pro,enterprise}'),
('gpt-4', 'GPT-4', 'openai', 0.030000, 0.060000, 8192, 8192, '{pro,enterprise}'),
('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 0.000500, 0.001500, 4096, 16385, '{free,basic,pro,enterprise}')
ON CONFLICT (model_id) DO UPDATE SET
  model_name = EXCLUDED.model_name,
  cost_per_1k_input_tokens = EXCLUDED.cost_per_1k_input_tokens,
  cost_per_1k_output_tokens = EXCLUDED.cost_per_1k_output_tokens,
  updated_at = NOW();

-- Create usage_analytics table for aggregated metrics
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(12,4) DEFAULT 0.0000,
  avg_session_length_minutes DECIMAL(8,2) DEFAULT 0.00,
  avg_messages_per_session DECIMAL(8,2) DEFAULT 0.00,
  most_used_model TEXT,
  error_rate DECIMAL(5,4) DEFAULT 0.0000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, period_type)
);

-- Create indexes for usage_analytics
CREATE INDEX IF NOT EXISTS idx_usage_analytics_date ON usage_analytics(date);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_period ON usage_analytics(period_type);

-- Enhance chat_sessions table with analytics fields
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,4) DEFAULT 0.0000;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER DEFAULT 0;

-- Enhance messages table with analytics fields
ALTER TABLE messages ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS cost DECIMAL(10,6) DEFAULT 0.000000;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT 0;

-- Create system_metrics table for real-time monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,6) NOT NULL,
  metric_unit TEXT,
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for system_metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_tags ON system_metrics USING GIN(tags);

-- Create user_sessions table for session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Update user_settings table with new preferences
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{
  "defaultModel": "gpt-4o-mini",
  "maxTokens": 1500,
  "temperature": 0.7,
  "streamingEnabled": true,
  "autoSave": true
}';

-- Create functions for analytics

-- Function to track analytics events
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API usage
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user rate limit status
CREATE OR REPLACE FUNCTION get_user_rate_limit(p_user_id UUID)
RETURNS TABLE (
  tier user_tier,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  daily_used INTEGER,
  monthly_used INTEGER,
  daily_remaining INTEGER,
  monthly_remaining INTEGER,
  is_limited BOOLEAN,
  daily_reset_at TIMESTAMPTZ,
  monthly_reset_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.tier,
    rl.daily_limit,
    rl.monthly_limit,
    rl.daily_used,
    rl.monthly_used,
    (rl.daily_limit - rl.daily_used) as daily_remaining,
    (rl.monthly_limit - rl.monthly_used) as monthly_remaining,
    (rl.daily_used >= rl.daily_limit OR rl.monthly_used >= rl.monthly_limit) as is_limited,
    rl.daily_reset_at,
    rl.monthly_reset_at
  FROM rate_limits rl
  WHERE rl.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily rate limits (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_daily_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE rate_limits 
  SET 
    daily_used = 0,
    daily_reset_at = (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ,
    is_limited = (monthly_used >= monthly_limit),
    updated_at = NOW()
  WHERE daily_reset_at <= NOW();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly rate limits (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE rate_limits 
  SET 
    monthly_used = 0,
    monthly_reset_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMPTZ,
    is_limited = false,
    updated_at = NOW()
  WHERE monthly_reset_at <= NOW();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create rate limits for new users
CREATE OR REPLACE FUNCTION create_rate_limit_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rate_limits (user_id, tier)
  VALUES (NEW.id, COALESCE(NEW.tier, 'free'))
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_rate_limit_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_rate_limit_for_user();

-- Create RLS policies for new tables

-- Analytics events policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- API usage logs policies
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API usage" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage logs" ON api_usage_logs
  FOR INSERT WITH CHECK (true);

-- Rate limits policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" ON rate_limits
  FOR UPDATE USING (auth.uid() = user_id);

-- Model configurations policies
ALTER TABLE model_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active model configurations" ON model_configurations
  FOR SELECT USING (is_active = true);

-- Usage analytics policies (admin only)
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view usage analytics" ON usage_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- System metrics policies (admin only)
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system metrics" ON system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can insert metrics" ON system_metrics
  FOR INSERT WITH CHECK (true);

-- User sessions policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create views for common analytics queries

-- Daily analytics view
CREATE OR REPLACE VIEW daily_user_analytics AS
SELECT 
  user_id,
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'session_started') as sessions_started,
  COUNT(*) FILTER (WHERE event_type = 'message_sent') as messages_sent,
  COUNT(*) FILTER (WHERE event_type = 'response_received') as responses_received,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at)
ORDER BY date DESC;

-- Model usage statistics view
CREATE OR REPLACE VIEW model_usage_stats AS
SELECT
  model_used,
  COUNT(*) as usage_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost) as total_cost,
  AVG(response_time_ms) as avg_response_time,
  DATE(created_at) as date
FROM api_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY model_used, DATE(created_at)
ORDER BY date DESC, usage_count DESC;

-- User tier distribution view
CREATE OR REPLACE VIEW user_tier_distribution AS
SELECT 
  tier,
  COUNT(*) as user_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM profiles
WHERE is_active = true
GROUP BY tier;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_model ON chat_sessions(model_used);
CREATE INDEX IF NOT EXISTS idx_messages_model ON messages(model_used);
CREATE INDEX IF NOT EXISTS idx_messages_tokens ON messages(total_tokens);

COMMENT ON TABLE analytics_events IS 'Comprehensive event tracking for user actions and system events';
COMMENT ON TABLE api_usage_logs IS 'Detailed logging of API calls including token usage and costs';
COMMENT ON TABLE rate_limits IS 'Per-user rate limiting and quota management';
COMMENT ON TABLE model_configurations IS 'AI model configuration and pricing information';
COMMENT ON TABLE usage_analytics IS 'Aggregated analytics data for reporting and insights';
COMMENT ON TABLE system_metrics IS 'Real-time system performance and health metrics';
COMMENT ON TABLE user_sessions IS 'User session tracking for security and analytics';