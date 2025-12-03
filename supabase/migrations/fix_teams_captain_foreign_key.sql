-- Fix teams.captain_id foreign key to support ON UPDATE CASCADE
-- This allows profile ID updates during rejoin operations

-- Drop existing foreign key constraint
ALTER TABLE public.teams
DROP CONSTRAINT IF EXISTS teams_captain_id_fkey;

-- Recreate with ON UPDATE CASCADE and ON DELETE SET NULL
ALTER TABLE public.teams
ADD CONSTRAINT teams_captain_id_fkey
FOREIGN KEY (captain_id) REFERENCES public.profiles(id)
ON DELETE SET NULL
ON UPDATE CASCADE;
