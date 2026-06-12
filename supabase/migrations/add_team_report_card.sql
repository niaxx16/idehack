-- Post-event team report card RPC.
-- Returns jury averages, anonymous jury comments, project path counts and
-- named mentor evaluations as a single JSONB. Raw jury_scores rows (and jury
-- identities) never reach the client.
-- Access: team members only while their event is COMPLETED; event-owner
-- admins and super admins at any time. Everyone else gets NULL.

CREATE OR REPLACE FUNCTION get_team_report_card(team_id_input UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller profiles%ROWTYPE;
  target_team teams%ROWTYPE;
  target_event events%ROWTYPE;
  is_allowed BOOLEAN := FALSE;
  jury_count INTEGER;
  jury_averages JSONB;
  jury_total NUMERIC;
  jury_comments JSONB;
  jury_paths JSONB;
  mentor_evals JSONB;
BEGIN
  SELECT * INTO target_team FROM teams WHERE id = team_id_input;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO target_event FROM events WHERE id = target_team.event_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF caller.role = 'admin'
     AND (COALESCE(caller.is_super_admin, FALSE) OR target_event.created_by = caller.id) THEN
    is_allowed := TRUE;
  ELSIF caller.team_id = team_id_input AND target_event.status = 'COMPLETED' THEN
    is_allowed := TRUE;
  END IF;

  IF NOT is_allowed THEN RETURN NULL; END IF;

  -- Jury aggregates: only new-format rows (5-criteria scoring)
  SELECT
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN NULL ELSE jsonb_build_object(
      'problem_understanding', ROUND(AVG((js.scores->>'problem_understanding')::NUMERIC), 1),
      'innovation',            ROUND(AVG((js.scores->>'innovation')::NUMERIC), 1),
      'value_impact',          ROUND(AVG((js.scores->>'value_impact')::NUMERIC), 1),
      'feasibility',           ROUND(AVG((js.scores->>'feasibility')::NUMERIC), 1),
      'presentation_teamwork', ROUND(AVG((js.scores->>'presentation_teamwork')::NUMERIC), 1)
    ) END,
    CASE WHEN COUNT(*) = 0 THEN NULL ELSE ROUND(AVG(
      (js.scores->>'problem_understanding')::NUMERIC +
      (js.scores->>'innovation')::NUMERIC +
      (js.scores->>'value_impact')::NUMERIC +
      (js.scores->>'feasibility')::NUMERIC +
      (js.scores->>'presentation_teamwork')::NUMERIC
    ), 1) END
  INTO jury_count, jury_averages, jury_total
  FROM jury_scores js
  WHERE js.team_id = team_id_input
    AND js.scores ? 'problem_understanding';

  -- Anonymous comments (non-empty only, oldest first)
  SELECT COALESCE(jsonb_agg(c.comments ORDER BY c.created_at), '[]'::jsonb)
  INTO jury_comments
  FROM (
    SELECT js.comments, js.created_at
    FROM jury_scores js
    WHERE js.team_id = team_id_input
      AND js.scores ? 'problem_understanding'
      AND btrim(COALESCE(js.comments, '')) <> ''
  ) c;

  -- Project path suggestion counts from jury scores
  SELECT COALESCE(jsonb_object_agg(p.path, p.cnt), '{}'::jsonb)
  INTO jury_paths
  FROM (
    SELECT pe.path, COUNT(*) AS cnt
    FROM jury_scores js,
         jsonb_array_elements_text(js.scores->'project_paths') AS pe(path)
    WHERE js.team_id = team_id_input
      AND js.scores ? 'problem_understanding'
      AND jsonb_typeof(js.scores->'project_paths') = 'array'
    GROUP BY pe.path
  ) p;

  -- Named mentor evaluations (skip fully empty rows)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'mentor_name', pr.full_name,
    'evaluation_text', me.evaluation_text,
    'project_paths', to_jsonb(me.project_paths),
    'project_path_reasoning', me.project_path_reasoning
  ) ORDER BY me.created_at), '[]'::jsonb)
  INTO mentor_evals
  FROM mentor_evaluations me
  JOIN profiles pr ON pr.id = me.mentor_id
  WHERE me.team_id = team_id_input
    AND (btrim(me.evaluation_text) <> '' OR COALESCE(array_length(me.project_paths, 1), 0) > 0);

  RETURN jsonb_build_object(
    'team_name', target_team.name,
    'jury', jsonb_build_object(
      'jury_count', jury_count,
      'averages', jury_averages,
      'total_avg', jury_total,
      'comments', jury_comments,
      'project_paths', jury_paths
    ),
    'mentor_evaluations', mentor_evals
  );
END;
$$;
