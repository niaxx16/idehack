-- Mentor System: Database Schema
-- Enables mentors to guide teams with feedback during ideation phase

-- 1. Add mentor role to profiles (role enum already exists)
-- No changes needed - 'mentor' can be added as a value

-- 2. Create mentor_assignments table
CREATE TABLE IF NOT EXISTS public.mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mentor_id, team_id)
);

-- 3. Create mentor_feedback table
CREATE TABLE IF NOT EXISTS public.mentor_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  canvas_section TEXT NOT NULL, -- 'problem', 'solution', 'value_proposition', 'target_audience', 'key_features', 'revenue_model'
  feedback_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor ON public.mentor_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_team ON public.mentor_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_team ON public.mentor_feedback(team_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor ON public.mentor_feedback(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_read ON public.mentor_feedback(is_read);

-- 5. Enable RLS
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_feedback ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for mentor_assignments

-- Admins can manage all assignments
CREATE POLICY "Admins can manage mentor assignments"
ON public.mentor_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Mentors can view their own assignments
CREATE POLICY "Mentors can view their assignments"
ON public.mentor_assignments
FOR SELECT
TO authenticated
USING (
  mentor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Team members can see who their mentor is
CREATE POLICY "Team members can see their mentor"
ON public.mentor_assignments
FOR SELECT
TO authenticated, anon
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 7. RLS Policies for mentor_feedback

-- Mentors can create feedback for their assigned teams
CREATE POLICY "Mentors can create feedback for assigned teams"
ON public.mentor_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  mentor_id = auth.uid() AND
  team_id IN (
    SELECT team_id FROM public.mentor_assignments WHERE mentor_id = auth.uid()
  )
);

-- Mentors can view and update their own feedback
CREATE POLICY "Mentors can manage their feedback"
ON public.mentor_feedback
FOR ALL
TO authenticated
USING (mentor_id = auth.uid())
WITH CHECK (mentor_id = auth.uid());

-- Team members can view feedback for their team
CREATE POLICY "Team members can view their feedback"
ON public.mentor_feedback
FOR SELECT
TO authenticated, anon
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Team members can mark feedback as read
CREATE POLICY "Team members can mark feedback as read"
ON public.mentor_feedback
FOR UPDATE
TO authenticated, anon
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.mentor_feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 8. Create triggers for updated_at
CREATE TRIGGER update_mentor_assignments_updated_at
  BEFORE UPDATE ON public.mentor_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_feedback_updated_at
  BEFORE UPDATE ON public.mentor_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_assignments TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_feedback TO authenticated, anon;
