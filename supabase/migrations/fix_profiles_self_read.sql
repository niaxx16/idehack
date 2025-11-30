-- Allow users to read their own profile
-- This is essential for login and auth flows
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
