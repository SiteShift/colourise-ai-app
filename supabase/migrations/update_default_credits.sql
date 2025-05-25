-- Migration: Update default credits from 10 to 5
-- Run this in your Supabase SQL Editor

-- Update the default value for new users
ALTER TABLE user_profiles ALTER COLUMN credits SET DEFAULT 5;

-- Note: This only affects new users. Existing users will keep their current credits.
-- If you want to update existing users, you would run:
-- UPDATE user_profiles SET credits = 5 WHERE credits = 10;
-- But be careful as this would affect all users with exactly 10 credits. 