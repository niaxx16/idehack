-- Fix: Prevent duplicate team members when user rejoins
-- Check if user is already in team_members array before adding

CREATE OR REPLACE FUNCTION join_team_by_code(
  activation_code_input TEXT,
  member_name TEXT,
  member_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_record teams%ROWTYPE;
  user_id UUID;
  is_first_member BOOLEAN;
  is_already_member BOOLEAN;
BEGIN
  -- Get current user
  user_id := auth.uid();

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find team by activation code
  SELECT * INTO team_record
  FROM teams
  WHERE teams.activation_code = UPPER(activation_code_input);

  IF team_record IS NULL THEN
    RAISE EXCEPTION 'Invalid activation code';
  END IF;

  -- Check if user is already a member of this team
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(team_record.team_members) AS member
    WHERE member->>'user_id' = user_id::text
  ) INTO is_already_member;

  IF is_already_member THEN
    -- User is already a member, just return team info
    -- Update their profile team_id in case it was cleared
    UPDATE profiles
    SET team_id = team_record.id
    WHERE id = user_id;

    RETURN jsonb_build_object(
      'success', TRUE,
      'team_id', team_record.id,
      'team_name', team_record.name,
      'is_captain', team_record.captain_id = user_id,
      'already_member', TRUE
    );
  END IF;

  -- Check if this is the first member (captain)
  is_first_member := team_record.captain_id IS NULL;

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

  -- Update user's profile
  UPDATE profiles
  SET team_id = team_record.id
  WHERE id = user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'team_id', team_record.id,
    'team_name', team_record.name,
    'is_captain', is_first_member,
    'already_member', FALSE
  );
END;
$$;
