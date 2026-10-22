CREATE TABLE library_materials (
 id uuid PRIMARY KEY,teacher_id uuid NOT NULL REFERENCES teachers(id),assignment_id uuid NOT NULL REFERENCES teaching_assignments(id),
 original_name text NOT NULL,mime_type text NOT NULL,bytes bytea NOT NULL,sha256 text NOT NULL,byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 10485760),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(teacher_id,assignment_id,sha256)
);
CREATE INDEX library_materials_folder ON library_materials(teacher_id,assignment_id,created_at DESC);
CREATE TABLE library_material_uses (
 assessment_id uuid NOT NULL REFERENCES assessments(id),material_id uuid NOT NULL REFERENCES preparation_materials(id),source_id uuid NOT NULL REFERENCES library_materials(id),
 PRIMARY KEY(assessment_id,source_id),UNIQUE(material_id)
);
