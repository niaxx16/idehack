-- Fix storage security for team-presentations bucket
-- Ensures anonymous users can only upload their own team's files
-- Reference: https://supabase.com/docs/guides/storage/security/access-control

-- 1. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies for team-presentations bucket (if any)
DROP POLICY IF EXISTS "Team captains can upload presentations" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view presentations" ON storage.objects;
DROP POLICY IF EXISTS "Team captains can update their presentations" ON storage.objects;
DROP POLICY IF EXISTS "Team captains can delete their presentations" ON storage.objects;

-- 3. Policy: Only team captains can upload presentations for their team
CREATE POLICY "Team captains can upload presentations"
ON storage.objects
FOR INSERT
TO authenticated, anon
WITH CHECK (
  bucket_id = 'team-presentations'
  AND auth.uid() IN (
    SELECT captain_id
    FROM public.teams
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- 4. Policy: Everyone (authenticated + anon) can view presentations
CREATE POLICY "Anyone can view presentations"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (bucket_id = 'team-presentations');

-- 5. Policy: Only team captains can update their team's presentations
CREATE POLICY "Team captains can update their presentations"
ON storage.objects
FOR UPDATE
TO authenticated, anon
USING (
  bucket_id = 'team-presentations'
  AND auth.uid() IN (
    SELECT captain_id
    FROM public.teams
    WHERE id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'team-presentations'
  AND auth.uid() IN (
    SELECT captain_id
    FROM public.teams
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- 6. Policy: Only team captains can delete their team's presentations
CREATE POLICY "Team captains can delete their presentations"
ON storage.objects
FOR DELETE
TO authenticated, anon
USING (
  bucket_id = 'team-presentations'
  AND auth.uid() IN (
    SELECT captain_id
    FROM public.teams
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- 7. Ensure bucket exists and is configured properly
-- Run this manually in Supabase Dashboard > Storage if bucket doesn't exist:
--
-- Bucket name: team-presentations
-- Public bucket: false (keep private, use signed URLs)
-- File size limit: 50 MB
-- Allowed MIME types: application/pdf, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation
