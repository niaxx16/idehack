-- Merge mentor_project_expert and mentor_domain_expert into supporting_experts

-- First, combine any existing data (if mentor_project_expert is empty, use mentor_domain_expert)
UPDATE team_tracking
SET mentor_project_expert = COALESCE(
    NULLIF(TRIM(mentor_project_expert), ''),
    mentor_domain_expert
)
WHERE mentor_project_expert IS NULL OR TRIM(mentor_project_expert) = '';

-- If both have values, concatenate them
UPDATE team_tracking
SET mentor_project_expert = mentor_project_expert || ', ' || mentor_domain_expert
WHERE mentor_project_expert IS NOT NULL
  AND TRIM(mentor_project_expert) != ''
  AND mentor_domain_expert IS NOT NULL
  AND TRIM(mentor_domain_expert) != '';

-- Rename mentor_project_expert to supporting_experts
ALTER TABLE team_tracking
RENAME COLUMN mentor_project_expert TO supporting_experts;

-- Drop mentor_domain_expert column
ALTER TABLE team_tracking
DROP COLUMN IF EXISTS mentor_domain_expert;
