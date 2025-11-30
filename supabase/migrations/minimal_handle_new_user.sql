-- Minimal handle_new_user function - only essential fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'mentor' THEN 'mentor'::user_role
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
      WHEN NEW.raw_user_meta_data->>'role' = 'jury' THEN 'jury'::user_role
      ELSE 'student'::user_role
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
