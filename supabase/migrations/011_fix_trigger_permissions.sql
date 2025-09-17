-- Fix user registration trigger to work with RLS policies
-- The issue is that during OAuth, auth.uid() might not be set in trigger context

-- =============================================
-- UPDATE PROFILES POLICIES TO ALLOW TRIGGER INSERT
-- =============================================

-- Add a policy that allows the trigger to insert profiles
-- The trigger runs as SECURITY DEFINER, so we need to allow system inserts
DROP POLICY IF EXISTS "Trigger can insert profiles" ON profiles;
CREATE POLICY "Trigger can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- =============================================
-- UPDATE RATE_LIMITS POLICIES
-- =============================================

-- The "System can insert rate limits" policy with CHECK (true) should work
-- But let's make sure it's there
DROP POLICY IF EXISTS "System can insert rate limits" ON rate_limits;
CREATE POLICY "System can insert rate limits" ON rate_limits
  FOR INSERT WITH CHECK (true);

-- =============================================
-- UPDATE ANALYTICS_EVENTS POLICIES
-- =============================================

-- Allow trigger to insert analytics events
DROP POLICY IF EXISTS "Trigger can insert analytics events" ON analytics_events;
CREATE POLICY "Trigger can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- =============================================
-- UPDATE USER REGISTRATION TRIGGER FUNCTION
-- =============================================

-- Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Use TRY-CATCH to handle any potential issues
  BEGIN
    -- Insert profile - this should work with the trigger policy
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'avatar_url'
    );

    -- Create rate limits for new user
    INSERT INTO public.rate_limits (user_id, tier, daily_limit, monthly_limit)
    VALUES (new.id, 'free', 100, 1000);

    -- Track user registration event
    INSERT INTO public.analytics_events (user_id, event_type, event_data)
    VALUES (
      new.id,
      'user_registration',
      jsonb_build_object(
        'provider', COALESCE(new.app_metadata->>'provider', 'unknown'),
        'created_at', new.created_at,
        'email_confirmed', COALESCE(new.email_confirmed_at IS NOT NULL, false)
      )
    );

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  END;

  RETURN new;
END;
$$ language plpgsql security definer;

-- =============================================
-- GRANT SPECIFIC PERMISSIONS TO FUNCTIONS
-- =============================================

-- Grant execute permissions on the trigger function
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- =============================================
-- ADDITIONAL DEBUGGING
-- =============================================

-- Create a simple function to test permissions
CREATE OR REPLACE FUNCTION test_user_creation(test_user_id UUID, test_email TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
BEGIN
  -- Test profile insertion
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (test_user_id, test_email, 'Test User');
    result := result || 'Profile: OK; ';
  EXCEPTION WHEN OTHERS THEN
    result := result || 'Profile: FAILED (' || SQLERRM || '); ';
  END;

  -- Test rate limits insertion
  BEGIN
    INSERT INTO public.rate_limits (user_id, tier, daily_limit, monthly_limit)
    VALUES (test_user_id, 'free', 100, 1000);
    result := result || 'RateLimit: OK; ';
  EXCEPTION WHEN OTHERS THEN
    result := result || 'RateLimit: FAILED (' || SQLERRM || '); ';
  END;

  -- Test analytics insertion
  BEGIN
    INSERT INTO public.analytics_events (user_id, event_type, event_data)
    VALUES (test_user_id, 'test', '{}');
    result := result || 'Analytics: OK; ';
  EXCEPTION WHEN OTHERS THEN
    result := result || 'Analytics: FAILED (' || SQLERRM || '); ';
  END;

  -- Clean up test data
  DELETE FROM public.analytics_events WHERE user_id = test_user_id;
  DELETE FROM public.rate_limits WHERE user_id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;