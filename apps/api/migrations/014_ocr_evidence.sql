ALTER TABLE correction_students ADD COLUMN ocr_evidence jsonb;
ALTER TABLE correction_students ADD COLUMN ocr_only boolean NOT NULL DEFAULT false;
