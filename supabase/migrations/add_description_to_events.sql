-- Add description column to events table
-- This allows admins to add optional descriptions when creating events

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS description TEXT;
