-- Reset onboarding status for testing
UPDATE profiles
SET onboarding_completed = false,
    metadata = NULL,
    updated_at = NOW()
WHERE email = 'medfadel.elayyachi@gmail.com';

-- Check the result
SELECT id, email, onboarding_completed, metadata, created_at, updated_at
FROM profiles
WHERE email = 'medfadel.elayyachi@gmail.com';