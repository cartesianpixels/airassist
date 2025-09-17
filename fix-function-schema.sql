-- Fix the create_rate_limit_for_user function to specify the schema explicitly
CREATE OR REPLACE FUNCTION create_rate_limit_for_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, tier)
  VALUES (NEW.id, COALESCE(NEW.tier, 'free'))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;