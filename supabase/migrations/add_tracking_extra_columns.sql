-- Add extra tracking columns

-- Konsorsiyum Demoday participation
ALTER TABLE team_tracking
ADD COLUMN IF NOT EXISTS consortium_demoday TEXT CHECK (consortium_demoday IN ('participated', 'not_participated', NULL));

-- Collaborator support received
ALTER TABLE team_tracking
ADD COLUMN IF NOT EXISTS collaborator_support TEXT CHECK (collaborator_support IN ('received', 'not_received', NULL));

-- Type of support received (free text)
ALTER TABLE team_tracking
ADD COLUMN IF NOT EXISTS support_type TEXT;
