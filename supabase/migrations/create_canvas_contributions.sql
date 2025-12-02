-- Create canvas_contributions table for collaborative canvas
-- Each student can add their own ideas to each canvas section

CREATE TABLE IF NOT EXISTS public.canvas_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('problem', 'solution', 'value_proposition', 'target_audience', 'key_features', 'revenue_model')),
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_canvas_contributions_team ON public.canvas_contributions(team_id);
CREATE INDEX idx_canvas_contributions_section ON public.canvas_contributions(team_id, section);
CREATE INDEX idx_canvas_contributions_user ON public.canvas_contributions(user_id);

-- Enable RLS
ALTER TABLE public.canvas_contributions ENABLE ROW LEVEL SECURITY;

-- Policy: Students can read all contributions in their team
CREATE POLICY "Students can view team contributions"
  ON public.canvas_contributions
  FOR SELECT
  TO authenticated, anon
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Students can insert their own contributions
CREATE POLICY "Students can add contributions"
  ON public.canvas_contributions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Students can update their own contributions
CREATE POLICY "Students can update own contributions"
  ON public.canvas_contributions
  FOR UPDATE
  TO authenticated, anon
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Students can delete their own contributions
CREATE POLICY "Students can delete own contributions"
  ON public.canvas_contributions
  FOR DELETE
  TO authenticated, anon
  USING (user_id = auth.uid());

-- Policy: Mentors and admins can view all contributions
CREATE POLICY "Mentors can view all contributions"
  ON public.canvas_contributions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('mentor', 'admin')
    )
  );

-- Function to add a contribution with profile info
CREATE OR REPLACE FUNCTION add_canvas_contribution(
  section_input TEXT,
  content_input TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_val UUID;
  team_id_val UUID;
  profile_data RECORD;
  contribution_id UUID;
BEGIN
  -- Get current user
  user_id_val := auth.uid();
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's team_id and profile info
  SELECT p.team_id, p.full_name, p.role
  INTO profile_data
  FROM public.profiles p
  WHERE p.id = user_id_val;

  IF profile_data.team_id IS NULL THEN
    RAISE EXCEPTION 'User is not in a team';
  END IF;

  team_id_val := profile_data.team_id;

  -- Insert contribution
  INSERT INTO public.canvas_contributions (team_id, user_id, section, content)
  VALUES (team_id_val, user_id_val, section_input, content_input)
  RETURNING id INTO contribution_id;

  -- Return success with contribution details
  RETURN jsonb_build_object(
    'success', TRUE,
    'contribution_id', contribution_id,
    'user_name', profile_data.full_name,
    'created_at', NOW()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_canvas_contribution(TEXT, TEXT) TO authenticated, anon;

-- Enable realtime for contributions
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_contributions;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_canvas_contribution_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canvas_contribution_updated_at
  BEFORE UPDATE ON public.canvas_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_canvas_contribution_timestamp();
