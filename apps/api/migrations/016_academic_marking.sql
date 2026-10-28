ALTER TABLE questions ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'Section A';
ALTER TABLE IF EXISTS educator_profiles ADD COLUMN IF NOT EXISTS educator_role text NOT NULL DEFAULT 'TEACHER';
ALTER TABLE IF EXISTS teaching_assignments ADD COLUMN IF NOT EXISTS education_level text NOT NULL DEFAULT 'SECONDARY';
ALTER TABLE IF EXISTS correction_sessions ADD COLUMN IF NOT EXISTS marking_settings jsonb NOT NULL DEFAULT '{"method":"FAIR","overrides":{},"percentages":{}}';
ALTER TABLE IF EXISTS correction_sessions ADD COLUMN IF NOT EXISTS roster jsonb NOT NULL DEFAULT '[]';
