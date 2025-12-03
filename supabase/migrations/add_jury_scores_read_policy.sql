-- Add RLS policy for jury to read their own scores
-- This allows jury members to see scores they've already submitted

-- Enable RLS on jury_scores if not already enabled
ALTER TABLE public.jury_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Jury can view their own scores" ON public.jury_scores;

-- Policy: Jury members can read their own scores
CREATE POLICY "Jury can view their own scores"
ON public.jury_scores
FOR SELECT
TO authenticated, anon
USING (
  jury_id = auth.uid()
);

-- Policy: Jury members can insert their own scores
DROP POLICY IF EXISTS "Jury can insert their own scores" ON public.jury_scores;
CREATE POLICY "Jury can insert their own scores"
ON public.jury_scores
FOR INSERT
TO authenticated, anon
WITH CHECK (
  jury_id = auth.uid()
);

-- Policy: Jury members can update their own scores
DROP POLICY IF EXISTS "Jury can update their own scores" ON public.jury_scores;
CREATE POLICY "Jury can update their own scores"
ON public.jury_scores
FOR UPDATE
TO authenticated, anon
USING (
  jury_id = auth.uid()
)
WITH CHECK (
  jury_id = auth.uid()
);
