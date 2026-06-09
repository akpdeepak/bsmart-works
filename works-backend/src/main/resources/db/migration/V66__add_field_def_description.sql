-- V66 (fix-forward, 2026-06-09): origin/main's FieldDef entity declares
-- `@Column(columnDefinition = "TEXT") private String description;` but no prior
-- migration ever created the column, so Hibernate ddl-auto=validate fails to boot.
-- This adds the missing column. IF NOT EXISTS keeps it safe on a shared DB.
ALTER TABLE field_def ADD COLUMN IF NOT EXISTS description TEXT;
