-- V20: Add onboarding_completed flag to user_profiles
-- Existing users default to false so they will be sent through onboarding on next login.
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
