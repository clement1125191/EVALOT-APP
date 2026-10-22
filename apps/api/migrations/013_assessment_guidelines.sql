CREATE TABLE assessment_guidelines (
 id uuid PRIMARY KEY,teacher_id uuid NOT NULL REFERENCES teachers(id),metadata jsonb NOT NULL,
 original_name text NOT NULL,mime_type text NOT NULL,bytes bytea NOT NULL,sha256 text NOT NULL,
 page_count integer NOT NULL,chunk_count integer NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assessment_guidelines_owner ON assessment_guidelines(teacher_id,status);
CREATE TABLE guideline_chunks (
 id uuid PRIMARY KEY,document_id uuid NOT NULL REFERENCES assessment_guidelines(id),
 page integer NOT NULL,part integer NOT NULL,text text NOT NULL,UNIQUE(document_id,page,part)
);
CREATE INDEX guideline_chunks_document ON guideline_chunks(document_id);
ALTER TABLE preparation_generations ADD COLUMN guideline_sources jsonb NOT NULL DEFAULT '[]';
ALTER TABLE preparation_generations ADD COLUMN guideline_warning text;
