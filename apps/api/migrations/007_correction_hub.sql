CREATE TABLE correction_sessions (
 id uuid PRIMARY KEY, teacher_id uuid NOT NULL REFERENCES teachers(id), assessment_id uuid NOT NULL REFERENCES assessments(id),
 name text NOT NULL, mode text NOT NULL CHECK(mode IN ('INDIVIDUAL','BATCH')), status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','PUBLISHED')),
 revision integer NOT NULL DEFAULT 0, guide jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX correction_owner ON correction_sessions(teacher_id,created_at DESC);
CREATE TABLE correction_students (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES correction_sessions(id), name text NOT NULL DEFAULT '', registration text NOT NULL DEFAULT '',
 pages_complete boolean NOT NULL DEFAULT false, identity_confidence numeric NOT NULL DEFAULT 0, identity_confirmed boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'CAPTURING' CHECK(status IN ('CAPTURING','QUEUED','PROCESSING','REVIEW','REVIEWED','ERROR')),
 revision integer NOT NULL DEFAULT 0, answers jsonb NOT NULL DEFAULT '[]', error text NOT NULL DEFAULT '', review_reason text NOT NULL DEFAULT '',
 queued_at timestamptz, started_at timestamptz, job_token uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,session_id)
);
CREATE UNIQUE INDEX correction_registration ON correction_students(session_id,lower(registration)) WHERE identity_confirmed;
CREATE TABLE correction_files (
 id uuid PRIMARY KEY,session_id uuid NOT NULL REFERENCES correction_sessions(id), student_id uuid,
 kind text NOT NULL CHECK(kind IN ('QUESTION','GUIDE','PAGE')),position integer NOT NULL DEFAULT 1 CHECK(position>0),
 name text NOT NULL, mime_type text NOT NULL, page_count integer NOT NULL, byte_size integer NOT NULL, bytes bytea NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(student_id,session_id) REFERENCES correction_students(id,session_id),
 CHECK((kind='PAGE' AND student_id IS NOT NULL) OR (kind!='PAGE' AND student_id IS NULL))
);
CREATE UNIQUE INDEX correction_reference ON correction_files(session_id,kind) WHERE kind!='PAGE';
CREATE UNIQUE INDEX correction_page_order ON correction_files(student_id,position) WHERE kind='PAGE';
CREATE TABLE correction_publications (
 id uuid PRIMARY KEY,session_id uuid NOT NULL REFERENCES correction_sessions(id),version integer NOT NULL, rows jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(session_id,version)
);
CREATE TRIGGER correction_publication_immutable BEFORE UPDATE OR DELETE ON correction_publications FOR EACH ROW EXECUTE FUNCTION immutable_history();
CREATE TABLE correction_claims (
 id uuid PRIMARY KEY,session_id uuid NOT NULL REFERENCES correction_sessions(id),student_id uuid NOT NULL,publication_id uuid NOT NULL REFERENCES correction_publications(id),
 reason text NOT NULL,status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED')),resolution text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(student_id,session_id) REFERENCES correction_students(id,session_id)
);
