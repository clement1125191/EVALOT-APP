ALTER TABLE IF EXISTS correction_students ADD COLUMN evidence_review jsonb;
ALTER TABLE IF EXISTS correction_students ADD COLUMN reviewed_at timestamptz;
ALTER TABLE IF EXISTS correction_students ADD COLUMN reviewed_by uuid REFERENCES teachers(id);
