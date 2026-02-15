-- Migration: Add mentor_evaluations table
-- Mentors can write a general evaluation per team (independent from section-specific feedback)

-- Create the mentor_evaluations table
CREATE TABLE IF NOT EXISTS mentor_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evaluation_text TEXT NOT NULL DEFAULT '',
  project_paths TEXT[] NOT NULL DEFAULT '{}',
  project_path_reasoning TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (team_id, mentor_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mentor_evaluations_team_id ON mentor_evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_mentor_evaluations_mentor_id ON mentor_evaluations(mentor_id);

-- Enable RLS
ALTER TABLE mentor_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all evaluations (for teams in their events)
CREATE POLICY "Admins can view all mentor evaluations"
  ON mentor_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Mentors can view evaluations for teams they are assigned to
CREATE POLICY "Mentors can view evaluations for assigned teams"
  ON mentor_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mentor_assignments ma
      WHERE ma.mentor_id = auth.uid() AND ma.team_id = mentor_evaluations.team_id
    )
  );

-- Mentors can insert their own evaluations for assigned teams
CREATE POLICY "Mentors can insert evaluations for assigned teams"
  ON mentor_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    mentor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM mentor_assignments ma
      WHERE ma.mentor_id = auth.uid() AND ma.team_id = mentor_evaluations.team_id
    )
  );

-- Mentors can update their own evaluations
CREATE POLICY "Mentors can update own evaluations"
  ON mentor_evaluations FOR UPDATE
  TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- Admins can manage all evaluations
CREATE POLICY "Admins can insert mentor evaluations"
  ON mentor_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update mentor evaluations"
  ON mentor_evaluations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete mentor evaluations"
  ON mentor_evaluations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_mentor_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_mentor_evaluations_updated_at
  BEFORE UPDATE ON mentor_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_mentor_evaluations_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mentor_evaluations;
