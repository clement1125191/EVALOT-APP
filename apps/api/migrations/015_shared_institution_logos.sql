CREATE TABLE shared_institution_logos (
 id uuid PRIMARY KEY,
 institution_name text NOT NULL,
 institution_key text NOT NULL,
 sha256 text NOT NULL,
 bytes bytea NOT NULL,
 contributed_by uuid NOT NULL REFERENCES teachers(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(institution_key,sha256)
);
ALTER TABLE library_logos ADD COLUMN shared_logo_id uuid REFERENCES shared_institution_logos(id);
CREATE UNIQUE INDEX library_shared_logo_owner ON library_logos(teacher_id,shared_logo_id);
