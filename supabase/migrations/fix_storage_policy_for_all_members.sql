-- Fix storage security to allow all team members to upload presentations
-- Previously only captains could upload, now all team members can

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Team captains can upload presentations" ON storage.objects;
DROP POLICY IF EXISTS "Team captains can update their presentations" ON storage.objects;
DROP POLICY IF EXISTS "Team captains can delete their presentations" ON storage.objects;

-- Policy: All team members can upload presentations for their team
CREATE POLICY "Team members can upload presentations"
ON storage.objects
FOR INSERT
TO authenticated, anon
WITH CHECK (
  bucket_id = 'team-presentations'
  AND auth.uid() IN (
    SELECT id
    FROM public.profiles
    WHERE team_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: All team members can update their team's presentations
CREATE POLICY "Team members can update their presentations"
ON storage.objects
FOR UPDATE
TO authenticated, anon
USING (
  bucket_id = 'team-presentations'
  AND auth.uid() IN (
    SELECT id
    FROM public.profiles
    WHERE team_id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'team-presentations'
  AND auth.uid() IN (
    SELECT id
    FROM public.profiles
    WHERE team_id::text = (storage.foldername(name))[1]
  )
);

-- Policy: All team members can delete their team's presentations
CREATE POLICY "Team members can delete their presentations"
ON storage.objects
FOR DELETE
TO authenticated, anon
USING (
  bucket_id = 'team-presentations'
  AND auth.uid() IN (
    SELECT id
    FROM public.profiles
    WHERE team_id::text = (storage.foldername(name))[1]
  )
);
