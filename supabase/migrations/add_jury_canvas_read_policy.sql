-- Add policy for jury to read canvas contributions
-- This allows jury members to see team canvas content during pitches

CREATE POLICY "Jury can view all contributions"
  ON public.canvas_contributions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'jury'
    )
  );
