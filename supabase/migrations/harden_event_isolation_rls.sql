-- Harden event isolation across core tables
-- Goal: prevent cross-event data visibility and writes for student/mentor/jury/admin roles.

-- ============================================================
-- EVENTS
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Everyone can view events" ON public.events;
DROP POLICY IF EXISTS "Events are editable by admins only" ON public.events;
DROP POLICY IF EXISTS "Only admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Only admins can update events" ON public.events;
DROP POLICY IF EXISTS "Only admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Admins can view own events" ON public.events;
DROP POLICY IF EXISTS "Admins can insert own events" ON public.events;
DROP POLICY IF EXISTS "Admins can update own events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete own events" ON public.events;

CREATE POLICY "events_select_scoped"
ON public.events
FOR SELECT
TO authenticated
USING (
  -- super admin: all events
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND ap.is_super_admin = true
  )
  OR
  -- admin: only events created by self
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND events.created_by = ap.id
  )
  OR
  -- mentor/jury: only assigned event
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.event_id = events.id
      AND p.role IN ('mentor', 'jury')
  )
  OR
  -- student: only event of their team
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.teams t ON t.id = p.team_id
    WHERE p.id = auth.uid()
      AND t.event_id = events.id
  )
);

CREATE POLICY "events_insert_admin"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR created_by = ap.id
      )
  )
);

CREATE POLICY "events_update_admin_scoped"
ON public.events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR events.created_by = ap.id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR created_by = ap.id
      )
  )
);

CREATE POLICY "events_delete_admin_scoped"
ON public.events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR events.created_by = ap.id
      )
  )
);

-- ============================================================
-- TEAMS
-- ============================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams in their events" ON public.teams;
DROP POLICY IF EXISTS "Teams can be created by admins" ON public.teams;
DROP POLICY IF EXISTS "Teams can be updated by team members or admins" ON public.teams;
DROP POLICY IF EXISTS "Admins can insert teams in own events" ON public.teams;
DROP POLICY IF EXISTS "Admins can update teams in own events" ON public.teams;
DROP POLICY IF EXISTS "Admins can delete teams in own events" ON public.teams;

CREATE POLICY "teams_select_scoped"
ON public.teams
FOR SELECT
TO authenticated
USING (
  -- super admin
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND ap.is_super_admin = true
  )
  OR
  -- admin owns event
  EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = teams.event_id
      AND e.created_by = auth.uid()
  )
  OR
  -- mentor/jury same event
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.event_id = teams.event_id
      AND p.role IN ('mentor', 'jury')
  )
  OR
  -- student own team
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.team_id = teams.id
  )
);

CREATE POLICY "teams_insert_admin_scoped"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR EXISTS (
          SELECT 1
          FROM public.events e
          WHERE e.id = event_id
            AND e.created_by = ap.id
        )
      )
  )
);

CREATE POLICY "teams_update_scoped"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  -- admin scope
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR EXISTS (
          SELECT 1
          FROM public.events e
          WHERE e.id = teams.event_id
            AND e.created_by = ap.id
        )
      )
  )
  OR
  -- team members can update own team
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.team_id = teams.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR EXISTS (
          SELECT 1
          FROM public.events e
          WHERE e.id = event_id
            AND e.created_by = ap.id
        )
      )
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.team_id = id
  )
);

CREATE POLICY "teams_delete_admin_scoped"
ON public.teams
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR EXISTS (
          SELECT 1
          FROM public.events e
          WHERE e.id = teams.event_id
            AND e.created_by = ap.id
        )
      )
  )
);

-- ============================================================
-- CANVAS CONTRIBUTIONS
-- ============================================================
ALTER TABLE public.canvas_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view team contributions" ON public.canvas_contributions;
DROP POLICY IF EXISTS "Mentors can view all contributions" ON public.canvas_contributions;
DROP POLICY IF EXISTS "Jury can view all contributions" ON public.canvas_contributions;

CREATE POLICY "canvas_select_scoped"
ON public.canvas_contributions
FOR SELECT
TO authenticated
USING (
  -- student own team
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.team_id = canvas_contributions.team_id
  )
  OR
  -- mentor/jury same event
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.teams t ON t.id = canvas_contributions.team_id
    WHERE p.id = auth.uid()
      AND p.event_id = t.event_id
      AND p.role IN ('mentor', 'jury')
  )
  OR
  -- admin owning event (or super admin)
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    JOIN public.teams t ON t.id = canvas_contributions.team_id
    JOIN public.events e ON e.id = t.event_id
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR e.created_by = ap.id
      )
  )
);

-- ============================================================
-- TEAM DECISIONS
-- ============================================================
ALTER TABLE public.team_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view their team decisions" ON public.team_decisions;
DROP POLICY IF EXISTS "Team captain can insert decisions" ON public.team_decisions;
DROP POLICY IF EXISTS "Team captain can update decisions" ON public.team_decisions;
DROP POLICY IF EXISTS "Mentors can view team decisions" ON public.team_decisions;
DROP POLICY IF EXISTS "Jury can view all team decisions" ON public.team_decisions;
DROP POLICY IF EXISTS "Admin full access to team decisions" ON public.team_decisions;

CREATE POLICY "team_decisions_select_scoped"
ON public.team_decisions
FOR SELECT
TO authenticated
USING (
  -- student own team
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.team_id = team_decisions.team_id
  )
  OR
  -- mentor/jury same event
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.teams t ON t.id = team_decisions.team_id
    WHERE p.id = auth.uid()
      AND p.event_id = t.event_id
      AND p.role IN ('mentor', 'jury')
  )
  OR
  -- admin owning event (or super admin)
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    JOIN public.teams t ON t.id = team_decisions.team_id
    JOIN public.events e ON e.id = t.event_id
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR e.created_by = ap.id
      )
  )
);

CREATE POLICY "team_decisions_insert_captain"
ON public.team_decisions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = team_id
      AND t.captain_id = auth.uid()
  )
);

CREATE POLICY "team_decisions_update_captain"
ON public.team_decisions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = team_decisions.team_id
      AND t.captain_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = team_id
      AND t.captain_id = auth.uid()
  )
);

CREATE POLICY "team_decisions_admin_manage_scoped"
ON public.team_decisions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    JOIN public.teams t ON t.id = team_decisions.team_id
    JOIN public.events e ON e.id = t.event_id
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR e.created_by = ap.id
      )
  )
);

-- ============================================================
-- JURY SCORES
-- ============================================================
ALTER TABLE public.jury_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jury scores are viewable by admins and the scoring jury" ON public.jury_scores;
DROP POLICY IF EXISTS "Jury members can create their own scores" ON public.jury_scores;
DROP POLICY IF EXISTS "Jury members can update their own scores" ON public.jury_scores;
DROP POLICY IF EXISTS "Jury can view their own scores" ON public.jury_scores;
DROP POLICY IF EXISTS "Jury can insert their own scores" ON public.jury_scores;
DROP POLICY IF EXISTS "Jury can update their own scores" ON public.jury_scores;

CREATE POLICY "jury_scores_select_scoped"
ON public.jury_scores
FOR SELECT
TO authenticated
USING (
  -- jury can see own scores only
  jury_id = auth.uid()
  OR
  -- admin can see scores in owned events (or all if super admin)
  EXISTS (
    SELECT 1
    FROM public.profiles ap
    JOIN public.teams t ON t.id = jury_scores.team_id
    JOIN public.events e ON e.id = t.event_id
    WHERE ap.id = auth.uid()
      AND ap.role = 'admin'
      AND (
        ap.is_super_admin = true
        OR e.created_by = ap.id
      )
  )
);

CREATE POLICY "jury_scores_insert_scoped"
ON public.jury_scores
FOR INSERT
TO authenticated
WITH CHECK (
  jury_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.teams t ON t.id = team_id
    WHERE p.id = auth.uid()
      AND p.role = 'jury'
      AND p.event_id = t.event_id
  )
);

CREATE POLICY "jury_scores_update_scoped"
ON public.jury_scores
FOR UPDATE
TO authenticated
USING (
  jury_id = auth.uid()
)
WITH CHECK (
  jury_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.teams t ON t.id = team_id
    WHERE p.id = auth.uid()
      AND p.role = 'jury'
      AND p.event_id = t.event_id
  )
);

