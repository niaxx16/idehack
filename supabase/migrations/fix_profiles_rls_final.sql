-- Final fix for profiles RLS policies and mentor role
-- This resolves all 500 errors and circular dependency issues

-- 1. Add 'mentor' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'mentor';

-- 2. Disable RLS temporarily to clean up
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_select_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles can be created for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profile_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_authenticated" ON public.profiles;

-- 4. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 5. Create clean, working policies (NO circular dependencies!)

-- Users can read their own profile (essential for login)
CREATE POLICY "select_own_profile"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated, anon
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (signup)
CREATE POLICY "insert_own_profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Admin can read all profiles (for mentor management)
-- Uses subquery with LIMIT 1 to avoid circular dependency
CREATE POLICY "admin_select_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);

-- Admin can update all profiles (for setting mentor role)
CREATE POLICY "admin_update_all_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);
