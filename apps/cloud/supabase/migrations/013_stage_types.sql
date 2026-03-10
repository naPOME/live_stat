-- Stage type: group (has divisions/groups), elimination (advancing from previous), finals (advancing + invitational)
ALTER TABLE stages ADD COLUMN IF NOT EXISTS stage_type text NOT NULL DEFAULT 'group'
  CHECK (stage_type IN ('group', 'elimination', 'finals'));

-- Number of teams advancing from the previous stage
ALTER TABLE stages ADD COLUMN IF NOT EXISTS advancing_count int;

-- Extra invitational slots (for finals that include invited teams)
ALTER TABLE stages ADD COLUMN IF NOT EXISTS invitational_count int NOT NULL DEFAULT 0;
