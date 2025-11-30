-- Add event_id to profiles for event-specific mentor/jury assignments
-- This ensures each event has its own set of mentors and jury members

-- Add event_id column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_event_id ON public.profiles(event_id);

-- Students don't need event_id (they use team_id which has event_id)
-- Mentors and jury should have event_id set when created
-- Admins don't need event_id (they manage all events)

COMMENT ON COLUMN public.profiles.event_id IS 'Event assignment for mentor/jury roles. NULL for students (use team_id) and admins (manage all events)';
