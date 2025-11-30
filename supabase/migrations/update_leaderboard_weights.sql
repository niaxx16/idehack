-- Update leaderboard calculation to use 70% jury score and 30% student investment
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
    t.id,
    t.name,
    t.total_investment,
    COALESCE(AVG(
      (js.scores->>'innovation')::INTEGER +
      (js.scores->>'presentation')::INTEGER +
      (js.scores->>'feasibility')::INTEGER +
      (js.scores->>'impact')::INTEGER
    ), 0) as jury_avg_score,
    -- Final score: 70% jury score + 30% investment (normalized)
    (COALESCE(AVG(
      (js.scores->>'innovation')::INTEGER +
      (js.scores->>'presentation')::INTEGER +
      (js.scores->>'feasibility')::INTEGER +
      (js.scores->>'impact')::INTEGER
    ), 0) * 0.7) +
    (t.total_investment::NUMERIC / NULLIF((SELECT MAX(total_investment) FROM public.teams WHERE event_id = event_id_input), 0) * 40 * 0.3) as final_score
  FROM public.teams t
  LEFT JOIN public.jury_scores js ON js.team_id = t.id
  WHERE t.event_id = event_id_input
  GROUP BY t.id, t.name, t.total_investment
  ORDER BY final_score DESC;
END;
$$ LANGUAGE plpgsql;
