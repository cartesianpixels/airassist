-- Remove the analytics event insert from the trigger to fix OAuth signup

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

  -- REMOVED: Analytics event insert that was causing FK constraint failure
  -- We can track registration events in the application code instead

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;