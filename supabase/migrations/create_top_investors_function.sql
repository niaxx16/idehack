-- Create function to get top investors
-- Calculates weighted ROI score based on investments in top 3 teams
-- 1st place team = 3x multiplier
-- 2nd place team = 2x multiplier
-- 3rd place team = 1x multiplier

CREATE OR REPLACE FUNCTION get_top_investors(event_id_input UUID)
RETURNS TABLE (
  investor_id UUID,
  investor_name TEXT,
  investor_team_id UUID,
  investor_team_name TEXT,
  total_invested INTEGER,
  roi_score NUMERIC,
  winning_investments JSONB
) AS $$
DECLARE
  top_teams UUID[];
  first_place_team UUID;
  second_place_team UUID;
  third_place_team UUID;
BEGIN
  -- Get top 3 teams from leaderboard
  SELECT ARRAY_AGG(team_id ORDER BY final_score DESC) INTO top_teams
  FROM get_leaderboard(event_id_input)
  LIMIT 3;

  -- If less than 3 teams, return empty
  IF array_length(top_teams, 1) < 3 THEN
    RETURN;
  END IF;

  first_place_team := top_teams[1];
  second_place_team := top_teams[2];
  third_place_team := top_teams[3];

  RETURN QUERY
  SELECT
    p.id as investor_id,
    COALESCE(p.full_name, p.display_name, 'Anonymous') as investor_name,
    p.team_id as investor_team_id,
    t_investor.name as investor_team_name,
    SUM(tr.amount)::INTEGER as total_invested,
    (
      -- Calculate weighted ROI score
      SUM(CASE
        WHEN tr.receiver_team_id = first_place_team THEN tr.amount * 3
        WHEN tr.receiver_team_id = second_place_team THEN tr.amount * 2
        WHEN tr.receiver_team_id = third_place_team THEN tr.amount * 1
        ELSE 0
      END)
    )::NUMERIC as roi_score,
    -- Create JSONB with details of winning investments
    jsonb_agg(
      jsonb_build_object(
        'team_id', tr.receiver_team_id,
        'team_name', t_winning.name,
        'amount', tr.amount,
        'rank', CASE
          WHEN tr.receiver_team_id = first_place_team THEN 1
          WHEN tr.receiver_team_id = second_place_team THEN 2
          WHEN tr.receiver_team_id = third_place_team THEN 3
          ELSE NULL
        END,
        'multiplier', CASE
          WHEN tr.receiver_team_id = first_place_team THEN 3
          WHEN tr.receiver_team_id = second_place_team THEN 2
          WHEN tr.receiver_team_id = third_place_team THEN 1
          ELSE 0
        END
      ) ORDER BY tr.amount DESC
    ) FILTER (WHERE tr.receiver_team_id = ANY(top_teams)) as winning_investments
  FROM public.profiles p
  INNER JOIN public.transactions tr ON tr.sender_id = p.id
  LEFT JOIN public.teams t_investor ON t_investor.id = p.team_id
  LEFT JOIN public.teams t_winning ON t_winning.id = tr.receiver_team_id
  WHERE
    -- Only include investments in top 3 teams
    tr.receiver_team_id = ANY(top_teams)
    -- Only students (exclude admin, jury, mentor)
    AND p.role = 'student'
  GROUP BY p.id, p.full_name, p.display_name, p.team_id, t_investor.name
  HAVING SUM(tr.amount) > 0
  ORDER BY roi_score DESC, total_invested DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;
