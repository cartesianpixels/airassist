-- Add onboarding fields to profiles table
-- Migration: Add onboarding completion tracking

-- Add onboarding_completed field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add metadata field for storing user preferences and profile data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing users to have default metadata structure
UPDATE profiles
SET metadata = COALESCE(metadata, '{}') || '{
  "role": "student",
  "experience": "beginner",
  "interests": [],
  "preferences": {
    "notifications": true,
    "emailUpdates": false,
    "theme": "auto"
  }
}'::jsonb
WHERE metadata IS NULL OR metadata = '{}';

-- Create index for onboarding_completed for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);

-- Create index for metadata field (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_profiles_metadata ON profiles USING GIN(metadata);

-- Add RLS policy for users to update their own onboarding status
DROP POLICY IF EXISTS "Users can update their own onboarding status" ON profiles;
CREATE POLICY "Users can update their own onboarding status" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to complete user onboarding
CREATE OR REPLACE FUNCTION complete_user_onboarding(
  p_user_id UUID,
  p_full_name TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET
    full_name = p_full_name,
    onboarding_completed = true,
    metadata = COALESCE(metadata, '{}') || p_metadata,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Track onboarding completion event
  INSERT INTO analytics_events (
    user_id,
    event_type,
    event_data
  ) VALUES (
    p_user_id,
    'user_login',
    jsonb_build_object(
      'onboarding_completed', true,
      'timestamp', NOW()
    )
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON COLUMN profiles.onboarding_completed IS 'Tracks if user has completed the onboarding flow';
COMMENT ON COLUMN profiles.metadata IS 'Stores user preferences, role, experience level, and other profile data';
COMMENT ON FUNCTION complete_user_onboarding IS 'Completes user onboarding and tracks the event';