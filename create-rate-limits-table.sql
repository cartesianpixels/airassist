-- Create the missing rate_limits table

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  daily_limit integer NOT NULL DEFAULT 100,
  monthly_limit integer NOT NULL DEFAULT 1000,
  daily_used integer DEFAULT 0,
  monthly_used integer DEFAULT 0,
  reset_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
  FOR ALL USING (auth.role() = 'service_role'::text);

CREATE POLICY "Trigger can insert rate limits" ON public.rate_limits
  FOR INSERT WITH CHECK (true);