-- Fix security issue: Add search_path to SECURITY DEFINER functions
-- This prevents potential SQL injection via search_path manipulation
-- Reference: https://supabase.com/docs/guides/database/postgres/security

-- 1. Fix handle_new_user function (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous User'));
  RETURN NEW;
END;
$$;

-- 2. Fix join_team_by_token function
CREATE OR REPLACE FUNCTION join_team_by_token(access_token_input UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_record RECORD;
  user_id_val UUID;
BEGIN
  user_id_val := auth.uid();

  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the team
  SELECT * INTO team_record FROM public.teams WHERE access_token = access_token_input;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid access token');
  END IF;

  -- Update user's profile
  UPDATE public.profiles
  SET team_id = team_record.id
  WHERE id = user_id_val;

  RETURN jsonb_build_object(
    'success', true,
    'team_id', team_record.id,
    'team_name', team_record.name
  );
END;
$$;

-- 3. Fix submit_portfolio function
CREATE OR REPLACE FUNCTION submit_portfolio(votes JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_val UUID;
  user_balance INTEGER;
  total_amount INTEGER := 0;
  vote_item JSONB;
  team_id_val UUID;
  amount_val INTEGER;
BEGIN
  user_id_val := auth.uid();

  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user's current balance
  SELECT wallet_balance INTO user_balance
  FROM public.profiles
  WHERE id = user_id_val;

  -- Calculate total amount
  FOR vote_item IN SELECT * FROM jsonb_array_elements(votes)
  LOOP
    amount_val := (vote_item->>'amount')::INTEGER;
    total_amount := total_amount + amount_val;
  END LOOP;

  -- Check if user has enough balance
  IF total_amount > user_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Process each vote
  FOR vote_item IN SELECT * FROM jsonb_array_elements(votes)
  LOOP
    team_id_val := (vote_item->>'team_id')::UUID;
    amount_val := (vote_item->>'amount')::INTEGER;

    -- Insert or update portfolio
    INSERT INTO public.portfolios (user_id, team_id, amount)
    VALUES (user_id_val, team_id_val, amount_val)
    ON CONFLICT (user_id, team_id)
    DO UPDATE SET amount = portfolios.amount + amount_val;

    -- Update team's total investment
    IF team_id_val IS NOT NULL THEN
      UPDATE public.teams
      SET total_investment = total_investment + amount_val
      WHERE id = team_id_val;
    END IF;
  END LOOP;

  -- Deduct from user's balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - total_amount
  WHERE id = user_id_val;

  RETURN jsonb_build_object('success', true, 'invested', total_amount);
END;
$$;

-- 4. Fix join_team_by_code function
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

-- 2. Fix setup_team_name function
CREATE OR REPLACE FUNCTION setup_team_name(
  team_id_input UUID,
  new_team_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 3. Ensure permissions are still set
GRANT EXECUTE ON FUNCTION join_team_by_code(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION setup_team_name(UUID, TEXT) TO authenticated;
