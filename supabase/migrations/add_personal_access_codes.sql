-- Add personal access codes for students to rejoin
-- Each student gets a unique 6-character code to log back in

-- Add personal_code column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS personal_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_personal_code ON public.profiles(personal_code);

-- Function to generate a unique personal code
CREATE OR REPLACE FUNCTION generate_personal_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars
  code TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := '';
    -- Generate 6-character code
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE personal_code = code) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN code;
END;
$$;

-- Update join_team_by_code to generate personal code
CREATE OR REPLACE FUNCTION join_team_by_code(
  activation_code_input TEXT,
  member_name TEXT,
  member_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_record teams%ROWTYPE;
  user_id UUID;
  user_email TEXT;
  is_first_member BOOLEAN;
  personal_code_val TEXT;
BEGIN
  -- Get current user
  user_id := auth.uid();

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email from auth
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;

  -- Find team by activation code
  SELECT * INTO team_record
  FROM teams
  WHERE teams.activation_code = UPPER(activation_code_input);

  IF team_record IS NULL THEN
    RAISE EXCEPTION 'Invalid activation code';
  END IF;

  -- Check if this is the first member (captain)
  is_first_member := team_record.captain_id IS NULL;

  -- Generate personal code
  personal_code_val := generate_personal_code();

  -- Create or update profile if needed (UPSERT)
  INSERT INTO profiles (id, role, full_name, display_name, email, team_id, wallet_balance, personal_code)
  VALUES (
    user_id,
    'student',
    member_name,
    member_name,
    user_email,
    team_record.id,
    1000,
    personal_code_val
  )
  ON CONFLICT (id) DO UPDATE
  SET team_id = team_record.id,
      full_name = COALESCE(profiles.full_name, member_name),
      display_name = COALESCE(profiles.display_name, member_name),
      personal_code = COALESCE(profiles.personal_code, personal_code_val);

  -- If first member, set as captain
  IF is_first_member THEN
    UPDATE teams
    SET captain_id = user_id,
        is_activated = TRUE
    WHERE id = team_record.id;
  END IF;

  -- Add member to team_members array
  UPDATE teams
  SET team_members = team_members || jsonb_build_object(
    'user_id', user_id,
    'name', member_name,
    'role', member_role,
    'is_captain', is_first_member,
    'joined_at', NOW()
  )::jsonb
  WHERE id = team_record.id;

  -- Get the personal code (in case it was already set)
  SELECT personal_code INTO personal_code_val
  FROM profiles
  WHERE id = user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'team_id', team_record.id,
    'team_name', team_record.name,
    'is_captain', is_first_member,
    'personal_code', personal_code_val
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_personal_code() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION join_team_by_code(TEXT, TEXT, TEXT) TO authenticated, anon;

-- Function to rejoin using personal code
-- This transfers the old profile data to a new anonymous session
CREATE OR REPLACE FUNCTION rejoin_with_personal_code(
  personal_code_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_profile profiles%ROWTYPE;
  new_user_id UUID;
  team_record teams%ROWTYPE;
  member_data JSONB;
BEGIN
  -- Get current user (new anonymous session)
  new_user_id := auth.uid();
  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find old profile by personal code
  SELECT * INTO old_profile
  FROM profiles
  WHERE personal_code = UPPER(personal_code_input);

  IF old_profile IS NULL THEN
    RAISE EXCEPTION 'Invalid personal code';
  END IF;

  -- Check if profile has a team
  IF old_profile.team_id IS NULL THEN
    RAISE EXCEPTION 'No team associated with this code';
  END IF;

  -- Get team details
  SELECT * INTO team_record
  FROM teams
  WHERE id = old_profile.team_id;

  -- Find member data in team_members array
  SELECT elem INTO member_data
  FROM jsonb_array_elements(team_record.team_members) elem
  WHERE elem->>'user_id' = old_profile.id::text;

  -- Delete the auto-created profile for new session (if exists)
  DELETE FROM profiles WHERE id = new_user_id;

  -- Update old profile to use new user_id
  UPDATE profiles
  SET id = new_user_id
  WHERE personal_code = UPPER(personal_code_input);

  -- Update team_members array to use new user_id
  IF member_data IS NOT NULL THEN
    UPDATE teams
    SET team_members = (
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'user_id' = old_profile.id::text
          THEN jsonb_set(elem, '{user_id}', to_jsonb(new_user_id::text))
          ELSE elem
        END
      )
      FROM jsonb_array_elements(team_members) elem
    )
    WHERE id = old_profile.team_id;

    -- Update captain_id if this user was captain
    UPDATE teams
    SET captain_id = new_user_id
    WHERE id = old_profile.team_id AND captain_id = old_profile.id;
  END IF;

  -- Update canvas_contributions
  UPDATE canvas_contributions
  SET user_id = new_user_id
  WHERE user_id = old_profile.id;

  -- Update transactions (sender)
  UPDATE transactions
  SET sender_id = new_user_id
  WHERE sender_id = old_profile.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', new_user_id,
    'team_id', old_profile.team_id,
    'team_name', team_record.name,
    'full_name', old_profile.full_name
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION rejoin_with_personal_code(TEXT) TO authenticated, anon;
