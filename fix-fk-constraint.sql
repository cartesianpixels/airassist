-- Fix the FK constraint to be deferred to avoid transaction issues
ALTER TABLE rate_limits
DROP CONSTRAINT rate_limits_user_id_fkey;

ALTER TABLE rate_limits
ADD CONSTRAINT rate_limits_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
DEFERRABLE INITIALLY DEFERRED;