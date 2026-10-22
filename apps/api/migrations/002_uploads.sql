ALTER TABLE scripts ADD COLUMN original_name text NOT NULL DEFAULT 'student-script';
ALTER TABLE scripts ADD COLUMN byte_size integer NOT NULL DEFAULT 1 CHECK (byte_size BETWEEN 1 AND 10485760);
ALTER TABLE scripts ADD COLUMN page_count integer NOT NULL DEFAULT 1 CHECK (page_count BETWEEN 1 AND 50);
CREATE UNIQUE INDEX scripts_reference_case_insensitive ON scripts(assessment_id,lower(student_reference));
CREATE UNIQUE INDEX scripts_unique_content ON scripts(assessment_id,sha256);
CREATE TABLE assessment_documents (
  id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL UNIQUE REFERENCES assessments(id),
  storage_key text NOT NULL UNIQUE,
  sha256 text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
  original_name text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  page_count integer NOT NULL CHECK (page_count BETWEEN 1 AND 50),
  created_at timestamptz NOT NULL DEFAULT now()
);
