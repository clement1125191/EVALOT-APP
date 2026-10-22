ALTER TABLE assessments DROP CONSTRAINT assessments_kind_check;
ALTER TABLE assessments ADD CONSTRAINT assessments_kind_check CHECK(kind IN ('EXAM','ASSESSMENT','CAT','ASSIGNMENT'));
