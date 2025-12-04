-- Create team_decisions table for captain's final decisions on each canvas section
CREATE TABLE IF NOT EXISTS public.team_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('problem', 'solution', 'value_proposition', 'target_audience', 'key_features', 'revenue_model')),
  content TEXT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each team can have only one decision per section
  UNIQUE(team_id, section)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_decisions_team_id ON public.team_decisions(team_id);

-- Enable RLS
ALTER TABLE public.team_decisions ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view their team's decisions
CREATE POLICY "Team members can view their team decisions"
ON public.team_decisions
FOR SELECT
TO authenticated, anon
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Policy: Team captain can insert decisions
CREATE POLICY "Team captain can insert decisions"
ON public.team_decisions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id
    AND t.captain_id = auth.uid()
  )
);

-- Policy: Team captain can update decisions
CREATE POLICY "Team captain can update decisions"
ON public.team_decisions
FOR UPDATE
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id
    AND t.captain_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_id
    AND t.captain_id = auth.uid()
  )
);

-- Policy: Mentors can view all decisions in their event
CREATE POLICY "Mentors can view team decisions"
ON public.team_decisions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.teams t ON t.event_id = p.event_id
    WHERE p.id = auth.uid()
    AND p.role = 'mentor'
    AND t.id = team_id
  )
);

-- Policy: Jury can view all decisions
CREATE POLICY "Jury can view all team decisions"
ON public.team_decisions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'jury'
  )
);

-- Policy: Admin can do everything
CREATE POLICY "Admin full access to team decisions"
ON public.team_decisions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Add comment
COMMENT ON TABLE public.team_decisions IS 'Stores the team captain''s final decision/synthesis for each canvas section';
