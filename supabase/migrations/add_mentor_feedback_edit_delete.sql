-- Allow mentors to update and delete their own feedback

-- Mentors can update their own feedback text
CREATE POLICY "mentor_update_own_feedback"
  ON public.mentor_feedback
  FOR UPDATE
  TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- Mentors can delete their own feedback
CREATE POLICY "mentor_delete_own_feedback"
  ON public.mentor_feedback
  FOR DELETE
  TO authenticated
  USING (mentor_id = auth.uid());
