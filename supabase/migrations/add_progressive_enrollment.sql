-- Progressive Enrollment: Add activation code and team members
-- Run this in Supabase SQL Editor

-- 1. Add new columns to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS activation_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS captain_id UUID REFERENCES profiles(id);

-- 2. Generate activation codes for existing teams (if any)
UPDATE teams
SET activation_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE activation_code IS NULL;

-- 3. Create index on activation_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_activation_code ON teams(activation_code);

-- 4. Drop old join_team_by_token function
DROP FUNCTION IF EXISTS join_team_by_token(TEXT);

-- 5. Create new join_team_by_code function for Progressive Enrollment
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
  is_first_member BOOLEAN;
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
    'is_captain', is_first_member
  );
END;
$$;

-- 6. Create function to setup team name (captain only)
CREATE OR REPLACE FUNCTION setup_team_name(
  team_id_input UUID,
  new_team_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  team_record teams%ROWTYPE;
BEGIN
  user_id := auth.uid();

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get team
  SELECT * INTO team_record
  FROM teams
  WHERE id = team_id_input;

  IF team_record IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Check if user is captain
  IF team_record.captain_id != user_id THEN
    RAISE EXCEPTION 'Only team captain can change team name';
  END IF;

  -- Update team name
  UPDATE teams
  SET name = new_team_name
  WHERE id = team_id_input;

  RETURN TRUE;
END;
$$;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION join_team_by_code(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION setup_team_name(UUID, TEXT) TO authenticated;
