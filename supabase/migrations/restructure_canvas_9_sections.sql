-- Migration: Restructure canvas from 6 sections to 9 sections
-- Removes: revenue_model
-- Adds: evidence, pilot_plan, success_metrics, resources_risks
-- Increases content limit from 500 to 1000 characters

-- Step 1: Delete existing revenue_model data before changing constraints
DELETE FROM canvas_contributions WHERE section = 'revenue_model';
DELETE FROM team_decisions WHERE section = 'revenue_model';
DELETE FROM mentor_feedback WHERE canvas_section = 'revenue_model';

-- Step 2: Drop old CHECK constraints
ALTER TABLE canvas_contributions DROP CONSTRAINT IF EXISTS canvas_contributions_section_check;
ALTER TABLE team_decisions DROP CONSTRAINT IF EXISTS team_decisions_section_check;
ALTER TABLE mentor_feedback DROP CONSTRAINT IF EXISTS mentor_feedback_canvas_section_check;

-- Step 3: Add new CHECK constraints with 9 sections
ALTER TABLE canvas_contributions ADD CONSTRAINT canvas_contributions_section_check
  CHECK (section IN ('problem', 'solution', 'value_proposition', 'target_audience', 'key_features', 'evidence', 'pilot_plan', 'success_metrics', 'resources_risks'));

ALTER TABLE team_decisions ADD CONSTRAINT team_decisions_section_check
  CHECK (section IN ('problem', 'solution', 'value_proposition', 'target_audience', 'key_features', 'evidence', 'pilot_plan', 'success_metrics', 'resources_risks'));

ALTER TABLE mentor_feedback ADD CONSTRAINT mentor_feedback_canvas_section_check
  CHECK (canvas_section IN ('problem', 'solution', 'value_proposition', 'target_audience', 'key_features', 'evidence', 'pilot_plan', 'success_metrics', 'resources_risks'));

-- Step 4: Increase content character limit from 500 to 1000
-- Drop old constraint if exists, then add new one
ALTER TABLE canvas_contributions DROP CONSTRAINT IF EXISTS canvas_contributions_content_check;
ALTER TABLE canvas_contributions ADD CONSTRAINT canvas_contributions_content_check
  CHECK (char_length(content) <= 1000);
