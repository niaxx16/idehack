-- Update leaderboard calculation to use 85% jury score and 15% student investment
-- Updated for new 5-criteria scoring system (100 points total):
-- - problem_understanding (1-20)
-- - innovation (1-20)
-- - value_impact (1-20)
-- - feasibility (1-20)
-- - presentation_teamwork (1-20)

CREATE OR REPLACE FUNCTION get_leaderboard(event_id_input UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  total_investment INTEGER,
  jury_avg_score NUMERIC,
  final_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.total_investment AS total_investment,
    -- New 5-criteria scoring (100 points total)
    COALESCE(AVG(
      COALESCE((js.scores->>'problem_understanding')::INTEGER, 0) +
      COALESCE((js.scores->>'innovation')::INTEGER, 0) +
      COALESCE((js.scores->>'value_impact')::INTEGER, 0) +
      COALESCE((js.scores->>'feasibility')::INTEGER, 0) +
      COALESCE((js.scores->>'presentation_teamwork')::INTEGER, 0)
    ), 0) AS jury_avg_score,
    -- Final score: 85% jury score (out of 100) + 15% investment (normalized to 100)
    (COALESCE(AVG(
      COALESCE((js.scores->>'problem_understanding')::INTEGER, 0) +
      COALESCE((js.scores->>'innovation')::INTEGER, 0) +
      COALESCE((js.scores->>'value_impact')::INTEGER, 0) +
      COALESCE((js.scores->>'feasibility')::INTEGER, 0) +
      COALESCE((js.scores->>'presentation_teamwork')::INTEGER, 0)
    ), 0) * 0.85) +
    (t.total_investment::NUMERIC / NULLIF((SELECT MAX(t2.total_investment) FROM public.teams t2 WHERE t2.event_id = event_id_input), 0) * 100 * 0.15) AS final_score
  FROM public.teams t
  LEFT JOIN public.jury_scores js ON js.team_id = t.id
  WHERE t.event_id = event_id_input
  GROUP BY t.id, t.name, t.total_investment
  ORDER BY final_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
