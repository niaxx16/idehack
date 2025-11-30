-- Improved submit_portfolio function with validation rules:
-- 1. Minimum 1 team, maximum 3 teams
-- 2. Cannot invest in own team
-- 3. Better error messages

CREATE OR REPLACE FUNCTION submit_portfolio(votes JSONB)
RETURNS JSONB AS $$
DECLARE
  user_id_val UUID;
  user_team_id UUID;
  user_balance INTEGER;
  total_amount INTEGER := 0;
  vote_item JSONB;
  team_id_val UUID;
  amount_val INTEGER;
  team_count INTEGER := 0;
  invested_teams UUID[] := ARRAY[]::UUID[];
BEGIN
  user_id_val := auth.uid();

  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user's current balance and team_id
  SELECT wallet_balance, team_id INTO user_balance, user_team_id
  FROM public.profiles
  WHERE id = user_id_val;

  -- Count unique teams with non-zero investments
  FOR vote_item IN SELECT * FROM jsonb_array_elements(votes)
  LOOP
    team_id_val := (vote_item->>'team_id')::UUID;
    amount_val := (vote_item->>'amount')::INTEGER;

    IF amount_val > 0 THEN
      -- Check if investing in own team
      IF team_id_val = user_team_id THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'You cannot invest in your own team'
        );
      END IF;

      -- Add to invested teams array if not already there
      IF NOT (team_id_val = ANY(invested_teams)) THEN
        invested_teams := array_append(invested_teams, team_id_val);
        team_count := team_count + 1;
      END IF;

      total_amount := total_amount + amount_val;
    END IF;
  END LOOP;

  -- Validate minimum and maximum team count
  IF team_count < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must invest in at least 1 team'
    );
  END IF;

  IF team_count > 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You can invest in maximum 3 teams'
    );
  END IF;

  -- Check if user has enough balance
  IF total_amount > user_balance THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance. You have ' || user_balance || ' IdeCoins available'
    );
  END IF;

  -- All validations passed, process each investment
  FOR vote_item IN SELECT * FROM jsonb_array_elements(votes)
  LOOP
    team_id_val := (vote_item->>'team_id')::UUID;
    amount_val := (vote_item->>'amount')::INTEGER;

    IF amount_val > 0 THEN
      -- Insert transaction
      INSERT INTO public.transactions (sender_id, receiver_team_id, amount)
      VALUES (user_id_val, team_id_val, amount_val);

      -- Update team's total investment
      UPDATE public.teams
      SET total_investment = total_investment + amount_val
      WHERE id = team_id_val;
    END IF;
  END LOOP;

  -- Deduct from user's balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - total_amount
  WHERE id = user_id_val;

  RETURN jsonb_build_object(
    'success', true,
    'invested', total_amount,
    'teams', team_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
