CREATE TABLE IF NOT EXISTS correction_mark_adjustments (
 id uuid PRIMARY KEY,session_id uuid NOT NULL REFERENCES correction_sessions(id),teacher_id uuid NOT NULL REFERENCES teachers(id),request_id uuid NOT NULL,reason text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(session_id,request_id)
);
CREATE TRIGGER correction_mark_adjustments_immutable BEFORE UPDATE OR DELETE ON correction_mark_adjustments FOR EACH ROW EXECUTE FUNCTION immutable_history();
