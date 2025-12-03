-- Add missing SELECT policy for viewing presentations
-- This allows everyone to view/download uploaded presentations

-- Policy: Everyone can view presentations
CREATE POLICY "Anyone can view presentations"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (bucket_id = 'team-presentations');
