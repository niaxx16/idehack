-- First, let's check existing policies
-- Run this query first to see what policies exist:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Drop all existing SELECT policies on profiles to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Drop UPDATE policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Now create clean policies
-- 1. Everyone can read their own profile (essential for login)
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (auth.uid() = id);

-- 2. Admins can read all profiles (for mentor management)
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated, anon
USING (auth.uid() = id);

-- 4. Admins can update all profiles (for setting roles)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
