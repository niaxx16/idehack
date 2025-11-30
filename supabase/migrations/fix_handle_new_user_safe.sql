-- Fix handle_new_user function to safely handle role casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Safely determine the role
  BEGIN
    user_role_val := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'student';
  END;

  -- If role is null, default to student
  IF user_role_val IS NULL THEN
    user_role_val := 'student';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', 'Anonymous User'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous User'),
    user_role_val
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
