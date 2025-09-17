-- Database diagnosis for profile creation issue
-- Run all queries and report results

-- 1. Check existing create_missing_profiles function definition
SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'create_missing_profiles';

-- 2. Check if there are triggers on auth.users table
SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'users' AND event_object_schema = 'auth';

-- 3. Check RLS policies on profiles table
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles';

-- 4. Check if RLS is enabled on profiles table
SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- 5. Test calling the existing function
SELECT create_missing_profiles();

-- 6. Check recent auth users without profiles
SELECT u.id, u.email, p.id as profile_id FROM auth.users u LEFT JOIN profiles p ON u.id = p.id WHERE p.id IS NULL LIMIT 5;