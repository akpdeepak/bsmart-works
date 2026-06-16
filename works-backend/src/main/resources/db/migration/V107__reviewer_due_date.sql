-- V107: KR-018 reviewer due date column
ALTER TABLE articles ADD COLUMN IF NOT EXISTS reviewer_due_date TIMESTAMPTZ;
