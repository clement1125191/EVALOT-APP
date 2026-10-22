ALTER TABLE assessments ADD COLUMN kind text NOT NULL DEFAULT 'ASSESSMENT' CHECK(kind IN ('EXAM','ASSESSMENT','CAT'));
CREATE TABLE preparation_materials (
 id uuid PRIMARY KEY, assessment_id uuid NOT NULL REFERENCES assessments(id), original_name text NOT NULL,
 mime_type text NOT NULL, bytes bytea NOT NULL, sha256 text NOT NULL, byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 10485760),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(assessment_id,sha256)
);
CREATE TABLE preparation_generations (
 id uuid PRIMARY KEY, assessment_id uuid NOT NULL REFERENCES assessments(id), teacher_id uuid NOT NULL REFERENCES teachers(id),
 prompt text NOT NULL, material_ids jsonb NOT NULL, model text NOT NULL, questions jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER preparation_generations_immutable BEFORE UPDATE OR DELETE ON preparation_generations FOR EACH ROW EXECUTE FUNCTION immutable_history();
