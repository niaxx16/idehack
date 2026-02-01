-- Add advisor_phone to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS advisor_phone TEXT;

COMMENT ON COLUMN teams.advisor_phone IS 'Phone number of the advisor teacher';

-- Create team_tracking table for post-event tracking
CREATE TABLE IF NOT EXISTS team_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    project_path TEXT CHECK (project_path IN ('startup', 'tubitak', 'teknofest', 'other', NULL)),
    project_path_other TEXT, -- If project_path is 'other', store custom value here
    incubation_status TEXT DEFAULT 'not_started' CHECK (incubation_status IN ('not_started', 'in_progress', 'completed')),
    incubation_start_date TIMESTAMPTZ,
    incubation_end_date TIMESTAMPTZ,
    incubation_notes TEXT,
    mentor_project_expert TEXT, -- Name of project expert mentor
    mentor_domain_expert TEXT, -- Name of domain expert mentor
    application_submitted BOOLEAN DEFAULT FALSE,
    application_date TIMESTAMPTZ,
    application_result TEXT CHECK (application_result IN ('pending', 'accepted', 'rejected', NULL)),
    result_notes TEXT,
    notes TEXT, -- General notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id)
);

-- Enable RLS
ALTER TABLE team_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_tracking
-- Admins can manage tracking for teams in their events
CREATE POLICY "Admins can view tracking for their event teams"
    ON team_tracking FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON t.event_id = e.id
            WHERE t.id = team_tracking.team_id
            AND e.created_by = auth.uid()
        )
    );

CREATE POLICY "Admins can insert tracking for their event teams"
    ON team_tracking FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON t.event_id = e.id
            WHERE t.id = team_tracking.team_id
            AND e.created_by = auth.uid()
        )
    );

CREATE POLICY "Admins can update tracking for their event teams"
    ON team_tracking FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON t.event_id = e.id
            WHERE t.id = team_tracking.team_id
            AND e.created_by = auth.uid()
        )
    );

CREATE POLICY "Admins can delete tracking for their event teams"
    ON team_tracking FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM teams t
            JOIN events e ON t.event_id = e.id
            WHERE t.id = team_tracking.team_id
            AND e.created_by = auth.uid()
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_team_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_tracking_updated_at
    BEFORE UPDATE ON team_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_team_tracking_updated_at();

-- Enable realtime for team_tracking
ALTER PUBLICATION supabase_realtime ADD TABLE team_tracking;
