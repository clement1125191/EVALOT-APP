ALTER TABLE correction_files ADD COLUMN cleaned_bytes bytea;
ALTER TABLE correction_files ADD COLUMN cleaned_quality jsonb;
ALTER TABLE correction_files ADD COLUMN use_cleaned boolean NOT NULL DEFAULT false;
CREATE TABLE capture_previews (
 id uuid PRIMARY KEY,session_id uuid NOT NULL REFERENCES correction_sessions(id),student_id uuid NOT NULL,teacher_id uuid NOT NULL REFERENCES teachers(id),
 student_revision integer NOT NULL,name text NOT NULL,original_mime text NOT NULL,original_bytes bytea NOT NULL,cleaned_bytes bytea NOT NULL,quality jsonb NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes', FOREIGN KEY(student_id,session_id) REFERENCES correction_students(id,session_id)
);
CREATE INDEX capture_previews_expiry ON capture_previews(expires_at);
