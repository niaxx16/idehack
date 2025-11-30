-- Add full_name column to profiles table for mentor management
-- This allows storing the full name separately from display_name

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add email column for easier reference (mirrors auth.users email)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update existing profiles to copy display_name to full_name
UPDATE public.profiles
SET full_name = display_name
WHERE full_name IS NULL AND display_name IS NOT NULL;
