-- Enable realtime for mentor_feedback table
-- This allows students to see feedback updates in real-time without page refresh

-- Enable replica identity to track changes
ALTER TABLE public.mentor_feedback REPLICA IDENTITY FULL;

-- Add table to realtime publication (this makes realtime updates work)
-- Note: This requires the supabase_realtime publication to exist
-- If it doesn't exist, it will be created automatically by Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_feedback;
