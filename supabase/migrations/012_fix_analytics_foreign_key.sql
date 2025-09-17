-- Fix foreign key constraint issue with analytics_events
-- The constraint is too strict and prevents analytics tracking when profile isn't created yet

-- =============================================
-- FIX ANALYTICS_EVENTS FOREIGN KEY CONSTRAINT
-- =============================================

-- Drop the existing foreign key constraint
ALTER TABLE analytics_events
DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;

-- Add a more flexible foreign key constraint that allows NULL
-- This allows analytics tracking even if profile doesn't exist yet
ALTER TABLE analytics_events
ADD CONSTRAINT analytics_events_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- =============================================
-- FIX API_USAGE_LOGS FOREIGN KEY CONSTRAINT
-- =============================================

-- Do the same for api_usage_logs
ALTER TABLE api_usage_logs
DROP CONSTRAINT IF EXISTS api_usage_logs_user_id_fkey;

ALTER TABLE api_usage_logs
ADD CONSTRAINT api_usage_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- =============================================
-- UPDATE ANALYTICS POLICIES TO ALLOW NULL USER_ID
-- =============================================

-- Update analytics policies to allow NULL user_id inserts
DROP POLICY IF EXISTS "Authenticated users can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Trigger can insert analytics events" ON analytics_events;

-- Allow any insert with proper user_id OR null user_id for anonymous tracking
CREATE POLICY "Allow analytics event inserts" ON analytics_events
  FOR INSERT WITH CHECK (
    user_id IS NULL OR
    auth.uid() = user_id OR
    auth.role() = 'service_role'
  );

-- =============================================
-- UPDATE USER REGISTRATION TRIGGER
-- =============================================

-- Update the trigger to be more robust and handle timing issues
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile first
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'avatar_url',
      new.created_at
    );
  EXCEPTION WHEN unique_violation THEN
    -- Profile already exists, just update it
    UPDATE public.profiles
    SET
      email = new.email,
      full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
      avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', avatar_url),
      updated_at = NOW()
    WHERE id = new.id;
  END;

  -- Create rate limits for new user
  BEGIN
    INSERT INTO public.rate_limits (user_id, tier, daily_limit, monthly_limit)
    VALUES (new.id, 'free', 100, 1000)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create rate limits for user %: %', new.id, SQLERRM;
  END;

  -- Track user registration event (this should now work with deferred FK)
  BEGIN
    INSERT INTO public.analytics_events (user_id, event_type, event_data, created_at)
    VALUES (
      new.id,
      'user_registration',
      jsonb_build_object(
        'provider', COALESCE(new.app_metadata->>'provider', 'unknown'),
        'created_at', new.created_at,
        'email_confirmed', COALESCE(new.email_confirmed_at IS NOT NULL, false)
      ),
      new.created_at
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to track registration for user %: %', new.id, SQLERRM;
  END;

  RETURN new;
END;
$$ language plpgsql security definer;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- =============================================
-- CREATE A FUNCTION TO MANUALLY TRIGGER PROFILE CREATION
-- =============================================

-- Function to manually create profiles for existing users without them
CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS TEXT AS $$
DECLARE
  user_record auth.users%ROWTYPE;
  created_count INTEGER := 0;
  result TEXT;
BEGIN
  -- Find users without profiles
  FOR user_record IN
    SELECT u.* FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      -- Create profile for this user
      INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at)
      VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'full_name', split_part(user_record.email, '@', 1)),
        user_record.raw_user_meta_data->>'avatar_url',
        user_record.created_at
      );

      -- Create rate limits
      INSERT INTO public.rate_limits (user_id, tier, daily_limit, monthly_limit)
      VALUES (user_record.id, 'free', 100, 1000)
      ON CONFLICT (user_id) DO NOTHING;

      created_count := created_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;

  result := 'Created ' || created_count || ' missing profiles';
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create any missing profiles
SELECT create_missing_profiles();