CREATE TABLE password_resets(token_hash text PRIMARY KEY, teacher_id uuid NOT NULL REFERENCES teachers(id), expires_at timestamptz NOT NULL);
CREATE TABLE google_flows(state_hash text PRIMARY KEY, browser_hash text NOT NULL, verifier text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE google_identities(subject text PRIMARY KEY, teacher_id uuid NOT NULL UNIQUE REFERENCES teachers(id));
ALTER TABLE auth_events DROP CONSTRAINT auth_events_action_check;
ALTER TABLE auth_events ADD CHECK(action IN ('ACCOUNT_CREATED','SIGNED_IN','SIGNED_OUT','PASSWORD_RESET'));
