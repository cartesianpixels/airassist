-- Fix database triggers to resolve OAuth signup issues
-- Fixes: handle_new_user function and create_rate_limit_for_user function

-- Fix the handle_new_user function to remove problematic analytics insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    tier,
    role,
    is_active,
    onboarding_completed,
    total_tokens_used,
    total_cost,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    'user',
    true,
    false,
    0,
    0,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the create_rate_limit_for_user function to specify the schema explicitly
CREATE OR REPLACE FUNCTION public.create_rate_limit_for_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, tier)
  VALUES (NEW.id, COALESCE(NEW.tier, 'free'))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;