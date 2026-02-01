-- Add school_name and advisor_teacher columns to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS advisor_teacher TEXT;

-- Add comment for documentation
COMMENT ON COLUMN teams.school_name IS 'Name of the school the team represents';
COMMENT ON COLUMN teams.advisor_teacher IS 'Name of the advisor teacher for the team';
