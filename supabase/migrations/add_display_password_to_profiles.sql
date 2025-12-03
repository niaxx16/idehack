-- Add display_password column to profiles table for admin access to credentials
-- This is used to store mentor and jury passwords for admin recovery purposes

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_password TEXT;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.profiles.display_password IS 'Stores the original password for mentor and jury accounts for admin access. Only used for non-student roles.';
