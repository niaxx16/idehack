-- Allow students to read canvas contributions and team decisions
-- of the currently pitching team in their event.
-- Without this, students can only read their own team's data,
-- making the pitch viewer show empty for other teams.

-- Canvas contributions: allow reading pitching team's contributions
CREATE POLICY "canvas_select_pitching_team"
ON public.canvas_contributions
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.teams t ON t.id = p.team_id
    JOIN public.events e ON e.id = t.event_id
    WHERE p.id = auth.uid()
      AND e.current_team_id = canvas_contributions.team_id
  )
);

-- Team decisions: allow reading pitching team's decisions
CREATE POLICY "team_decisions_select_pitching_team"
ON public.team_decisions
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.teams t ON t.id = p.team_id
    JOIN public.events e ON e.id = t.event_id
    WHERE p.id = auth.uid()
      AND e.current_team_id = team_decisions.team_id
  )
);
