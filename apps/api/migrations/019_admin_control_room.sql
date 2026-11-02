CREATE TABLE admin_accounts(teacher_id uuid PRIMARY KEY REFERENCES teachers(id),active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE account_controls(teacher_id uuid PRIMARY KEY REFERENCES teachers(id),suspended boolean NOT NULL DEFAULT false,revision integer NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE billing_configuration(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),policy jsonb NOT NULL,revision integer NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE admin_events(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES teachers(id),action text NOT NULL,target_id text NOT NULL DEFAULT '',reason text NOT NULL,payload jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER admin_events_immutable BEFORE UPDATE OR DELETE ON admin_events FOR EACH ROW EXECUTE FUNCTION immutable_history();
