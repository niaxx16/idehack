-- Migration: Add admin event ownership for isolation
-- Each admin should only see events they created (unless super_admin)

-- 1. Add created_by column to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

-- 3. Update existing events to be owned by super_admin (if exists)
-- This ensures existing data has an owner
UPDATE public.events
SET created_by = (
  SELECT id FROM public.profiles
  WHERE is_super_admin = true
  LIMIT 1
)
WHERE created_by IS NULL;

-- 4. Drop existing RLS policies for events (if they exist)
DROP POLICY IF EXISTS "Everyone can view events" ON public.events;
DROP POLICY IF EXISTS "Only admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Only admins can update events" ON public.events;
DROP POLICY IF EXISTS "Only admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage own events" ON public.events;
DROP POLICY IF EXISTS "Admins can view own events" ON public.events;
DROP POLICY IF EXISTS "Admins can insert own events" ON public.events;
DROP POLICY IF EXISTS "Admins can update own events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete own events" ON public.events;

-- 5. Create new RLS policies for admin isolation

-- Super admins can see all events, regular admins only their own
CREATE POLICY "Admins can view own events" ON public.events
FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
  OR
  -- Regular admin can only see their own events
  (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  OR
  -- Non-admins (students, mentors, jury) can see events they're associated with
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('student', 'mentor', 'jury')
  )
);

-- Admins can insert events (created_by will be set to their id)
CREATE POLICY "Admins can insert own events" ON public.events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admin can only update their own events (super_admin can update all)
CREATE POLICY "Admins can update own events" ON public.events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
  OR
  (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Admin can only delete their own events (super_admin can delete all)
CREATE POLICY "Admins can delete own events" ON public.events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
  OR
  (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- 6. Update teams RLS to respect event ownership
DROP POLICY IF EXISTS "Everyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can view teams in own events" ON public.teams;
DROP POLICY IF EXISTS "Admins can insert teams in own events" ON public.teams;
DROP POLICY IF EXISTS "Admins can update teams in own events" ON public.teams;
DROP POLICY IF EXISTS "Admins can delete teams in own events" ON public.teams;

-- Teams: viewable by everyone associated with the event
CREATE POLICY "Users can view teams in their events" ON public.teams
FOR SELECT
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
  OR
  -- Admin can see teams in their own events
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = teams.event_id
    AND events.created_by = auth.uid()
  )
  OR
  -- Students/mentors/jury can see teams in events they're part of
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (event_id = teams.event_id OR team_id = teams.id)
  )
);

-- Teams: admins can insert/update/delete in their own events
CREATE POLICY "Admins can insert teams in own events" ON public.teams
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_id
    AND events.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can update teams in own events" ON public.teams
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = teams.event_id
    AND events.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can delete teams in own events" ON public.teams
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = teams.event_id
    AND events.created_by = auth.uid()
  )
);
