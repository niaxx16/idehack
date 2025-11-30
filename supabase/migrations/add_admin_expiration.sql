-- Add expiration_date to profiles for admin access control
-- Super admin (system owner) has NULL expiration (permanent)
-- Sub-admins have expiration dates (1 day, 3 days, 1 week, 1 month)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMPTZ;

-- Add is_super_admin flag to identify the system owner
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.expiration_date IS 'When this admin account expires. NULL = permanent access';
COMMENT ON COLUMN public.profiles.is_super_admin IS 'True for system owner who can create other admins';
