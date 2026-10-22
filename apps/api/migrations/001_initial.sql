CREATE TABLE teachers (
  id uuid PRIMARY KEY, display_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE assessments (
  id uuid PRIMARY KEY, teacher_id uuid NOT NULL REFERENCES teachers(id),
  title text NOT NULL, subject text NOT NULL, class_name text NOT NULL,
  total_marks integer NOT NULL CHECK (total_marks BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','READY','PROCESSING','REVIEW','FINALIZED')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessments_owner ON assessments(teacher_id, created_at DESC);
CREATE TABLE questions (
  id uuid PRIMARY KEY, assessment_id uuid NOT NULL REFERENCES assessments(id),
  position integer NOT NULL CHECK (position > 0), type text NOT NULL CHECK (type IN ('MCQ','TRUE_FALSE','SHORT_ANSWER','ESSAY')),
  prompt text NOT NULL, max_marks integer NOT NULL CHECK (max_marks > 0),
  options jsonb NOT NULL DEFAULT '[]', expected_answer text NOT NULL DEFAULT '', rubric jsonb NOT NULL DEFAULT '[]',
  UNIQUE(assessment_id,position), UNIQUE(id,assessment_id)
);
-- Later phases activate these tables; Phase 1 exposes no script/mark endpoints.
CREATE TABLE scripts (
  id uuid PRIMARY KEY, assessment_id uuid NOT NULL REFERENCES assessments(id), student_reference text NOT NULL,
  storage_key text NOT NULL, sha256 text NOT NULL, mime_type text NOT NULL,
  status text NOT NULL DEFAULT 'UPLOADED', created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,assessment_id), UNIQUE(assessment_id,student_reference)
);
CREATE TABLE answers (
  id uuid PRIMARY KEY, assessment_id uuid NOT NULL REFERENCES assessments(id), script_id uuid NOT NULL,
  question_id uuid NOT NULL, extracted_text text, source_region jsonb NOT NULL,
  extraction_confidence numeric NOT NULL CHECK (extraction_confidence BETWEEN 0 AND 1),
  FOREIGN KEY(script_id,assessment_id) REFERENCES scripts(id,assessment_id),
  FOREIGN KEY(question_id,assessment_id) REFERENCES questions(id,assessment_id), UNIQUE(script_id,question_id)
);
CREATE TABLE evaluations (
  id uuid PRIMARY KEY, answer_id uuid NOT NULL REFERENCES answers(id), suggested_mark numeric NOT NULL CHECK (suggested_mark >= 0),
  confidence numeric NOT NULL CHECK (confidence BETWEEN 0 AND 1), rationale text NOT NULL,
  engine text NOT NULL, engine_version text NOT NULL, guide_revision integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE teacher_reviews (
  id uuid PRIMARY KEY, evaluation_id uuid NOT NULL REFERENCES evaluations(id), teacher_id uuid NOT NULL REFERENCES teachers(id),
  final_mark numeric NOT NULL CHECK (final_mark >= 0), reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY, assessment_id uuid NOT NULL REFERENCES assessments(id), teacher_id uuid NOT NULL REFERENCES teachers(id),
  action text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'History is append-only'; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TRIGGER reviews_immutable BEFORE UPDATE OR DELETE ON teacher_reviews FOR EACH ROW EXECUTE FUNCTION immutable_history();
