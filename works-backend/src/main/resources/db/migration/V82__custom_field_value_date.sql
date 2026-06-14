-- V82: typed DATE column for custom-field values, so BQL can run relational/range queries
-- (>, <, BETWEEN) on custom date fields instead of treating them as text (BQL round-3 follow-up).
-- value_text still holds the display value; value_date is the queryable, typed projection.

ALTER TABLE work_item_field_value ADD COLUMN IF NOT EXISTS value_date DATE;

-- Backfill existing DATE-typed custom fields from their ISO-prefixed text value. Regex-guarded so
-- any non-ISO display text is left NULL rather than failing the cast (forward-only, RB-10 §3).
UPDATE work_item_field_value v
SET value_date = substring(v.value_text FROM 1 FOR 10)::date
FROM field_def fd
WHERE fd.id = v.field_def_id
  AND fd.field_type = 'DATE'
  AND v.value_text ~ '^\d{4}-\d{2}-\d{2}';
