-- Fix RLS policies for events table
-- Ensures anonymous users can only READ events, not modify them

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Events are editable by admins only" ON public.events;

-- 2. Enable RLS (if not already enabled)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Everyone (including anonymous) can view events
CREATE POLICY "Everyone can view events"
ON public.events
FOR SELECT
TO authenticated, anon
USING (true);

-- 4. Policy: Only admins can insert events
CREATE POLICY "Only admins can insert events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 5. Policy: Only admins can update events
CREATE POLICY "Only admins can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 6. Policy: Only admins can delete events
CREATE POLICY "Only admins can delete events"
ON public.events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
