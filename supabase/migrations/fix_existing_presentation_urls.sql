-- Fix existing presentation URLs that point to Vercel instead of Supabase
-- This updates all URLs that contain the Vercel domain to point to Supabase storage

UPDATE public.teams
SET presentation_url = REPLACE(
  presentation_url,
  'https://idehack-bursaarge.vercel.app/',
  'https://udlkyxytmyxxktflzfpi.supabase.co/storage/v1/object/public/team-presentations/'
)
WHERE presentation_url LIKE 'https://idehack-bursaarge.vercel.app/%';

-- Show affected rows
SELECT id, name, presentation_url
FROM public.teams
WHERE presentation_url IS NOT NULL;
