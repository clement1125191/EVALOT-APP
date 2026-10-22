ALTER TABLE teachers ADD COLUMN email text;
ALTER TABLE teachers ADD COLUMN password_hash text;
CREATE UNIQUE INDEX teachers_email_unique ON teachers(lower(email)) WHERE email IS NOT NULL;
CREATE TABLE teacher_sessions (
  token_hash text PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_teacher ON teacher_sessions(teacher_id);
CREATE TABLE auth_rate_limits (
  bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE auth_events (
  id uuid PRIMARY KEY, teacher_id uuid NOT NULL REFERENCES teachers(id),
  action text NOT NULL CHECK(action IN ('ACCOUNT_CREATED','SIGNED_IN','SIGNED_OUT')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER auth_events_immutable BEFORE UPDATE OR DELETE ON auth_events FOR EACH ROW EXECUTE FUNCTION immutable_history();
