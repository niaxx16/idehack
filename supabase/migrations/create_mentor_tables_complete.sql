-- Create mentor system tables and RLS policies
-- Sprint 1: Database & Schema

-- 1. Mentor assignments table (mentor -> team mapping)
CREATE TABLE IF NOT EXISTS public.mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mentor_id, team_id)
);

-- 2. Mentor feedback table (section-specific feedback)
CREATE TABLE IF NOT EXISTS public.mentor_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  canvas_section TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor ON public.mentor_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_team ON public.mentor_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_team ON public.mentor_feedback(team_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor ON public.mentor_feedback(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_section ON public.mentor_feedback(canvas_section);

-- 4. Enable RLS
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_feedback ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for mentor_assignments (separate policies for each operation)

CREATE POLICY "admin_select_assignments"
ON public.mentor_assignments
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "admin_insert_assignments"
ON public.mentor_assignments
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_assignments"
ON public.mentor_assignments
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_assignments"
ON public.mentor_assignments
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Mentors can view their own assignments
CREATE POLICY "mentor_view_own_assignments"
ON public.mentor_assignments
FOR SELECT
TO authenticated
USING (mentor_id = auth.uid());

-- 6. RLS Policies for mentor_feedback

-- Admins can view all feedback
CREATE POLICY "admin_view_all_feedback"
ON public.mentor_feedback
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Mentors can create feedback for assigned teams
CREATE POLICY "mentor_create_feedback"
ON public.mentor_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  mentor_id = auth.uid() AND
  team_id IN (
    SELECT team_id FROM public.mentor_assignments WHERE mentor_id = auth.uid()
  )
);

-- Mentors can view their own feedback
CREATE POLICY "mentor_view_own_feedback"
ON public.mentor_feedback
FOR SELECT
TO authenticated
USING (mentor_id = auth.uid());

-- Team members can view their team's feedback
CREATE POLICY "team_view_feedback"
ON public.mentor_feedback
FOR SELECT
TO authenticated, anon
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Team members can mark feedback as read
CREATE POLICY "team_mark_feedback_read"
ON public.mentor_feedback
FOR UPDATE
TO authenticated, anon
USING (
  team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

-- 7. Triggers for updated_at (use existing function)
DROP TRIGGER IF EXISTS update_mentor_assignments_updated_at ON public.mentor_assignments;
CREATE TRIGGER update_mentor_assignments_updated_at
  BEFORE UPDATE ON public.mentor_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mentor_feedback_updated_at ON public.mentor_feedback;
CREATE TRIGGER update_mentor_feedback_updated_at
  BEFORE UPDATE ON public.mentor_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant permissions
GRANT ALL ON public.mentor_assignments TO authenticated;
GRANT ALL ON public.mentor_feedback TO authenticated;
GRANT SELECT ON public.mentor_assignments TO anon;
GRANT SELECT ON public.mentor_feedback TO anon;
