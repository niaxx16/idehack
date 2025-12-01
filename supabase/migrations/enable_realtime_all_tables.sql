-- Enable realtime for all tables that need real-time updates

-- Events table (for status changes like WAITING -> IDEATION)
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.events;

-- Teams table (for canvas updates from students)
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.teams;

-- Mentor feedback table (for feedback from mentors to students)
ALTER TABLE public.mentor_feedback REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.mentor_feedback;

-- Mentor assignments table (for assignment changes)
ALTER TABLE public.mentor_assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.mentor_assignments;
