-- Fix circular dependency in RLS policies using SECURITY DEFINER function
-- This is the FINAL solution for 42P17 errors

-- Create a SECURITY DEFINER function that bypasses RLS
-- This prevents circular dependency when checking if user is admin
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

-- Drop existing admin policies that caused circular dependency
DROP POLICY IF EXISTS "admin_select_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON public.profiles;

-- Recreate admin policies using is_admin() function (NO circular dependency!)
CREATE POLICY "admin_select_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "admin_update_all_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
