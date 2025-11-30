-- Fix email sync and disable problematic trigger

-- 1. Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Update email for admin, mentor, and jury users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.role IN ('admin', 'mentor', 'jury');

-- 3. Recreate is_admin function to ensure it works correctly
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin';
END;
$$;
