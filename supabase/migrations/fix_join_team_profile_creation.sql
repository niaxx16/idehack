-- Fix join_team_by_code to create profile if it doesn't exist
-- This ensures students can join teams even if their profile wasn't created yet

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

  -- Create or update profile if needed (UPSERT)
  INSERT INTO profiles (id, role, full_name, display_name, email, team_id, wallet_balance)
  VALUES (
    user_id,
    'student',
    member_name,
    member_name,
    user_email,
    team_record.id,
    1000
  )
  ON CONFLICT (id) DO UPDATE
  SET team_id = team_record.id,
      full_name = COALESCE(profiles.full_name, member_name),
      display_name = COALESCE(profiles.display_name, member_name);

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

  RETURN jsonb_build_object(
    'success', TRUE,
    'team_id', team_record.id,
    'team_name', team_record.name,
    'is_captain', is_first_member
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION join_team_by_code(TEXT, TEXT, TEXT) TO authenticated, anon;
