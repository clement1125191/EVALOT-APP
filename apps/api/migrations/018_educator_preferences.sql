CREATE TABLE educator_marking_preferences (
 teacher_id uuid PRIMARY KEY REFERENCES teachers(id),
 settings jsonb NOT NULL DEFAULT '{"method":"FAIR","overrides":{},"percentages":{}}',
 revision integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS correction_sessions ADD COLUMN infer_reference_marks boolean NOT NULL DEFAULT false;
