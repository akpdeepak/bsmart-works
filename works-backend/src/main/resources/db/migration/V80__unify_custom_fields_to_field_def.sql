-- =====================================================================
-- Unify card custom fields onto field_def + work_item_field_value (Option B, EXPAND phase)
-- =====================================================================
-- Two custom-field systems existed: field_def + work_item_field_value (table values, field-level
-- security) and custom_field_definitions + work_items.custom_fields JSONB (card values, #215).
-- This migrates the latter into the former so there is one definition store and one value store.
-- EXPAND only: custom_field_definitions and work_items.custom_fields are left in place (a later
-- contract migration drops them once nothing reads them). Forward-only (RB-10 §3).

-- 1. Definitions: each active custom_field_definitions row -> a field_def row (id reused, so the
--    JSONB value keys map straight across). field_type values (TEXT/NUMBER/DATE/SELECT) are all
--    valid field_def types; SELECT options carry over into config.options.
INSERT INTO field_def (id, workspace_id, project_id, name, field_key, field_type, config, required, position, created_at)
SELECT cfd.id, cfd.workspace_id, NULL, cfd.name, 'cfd_' || cfd.id, cfd.field_type,
       CASE WHEN cfd.options IS NOT NULL THEN jsonb_build_object('options', cfd.options) ELSE '{}'::jsonb END,
       FALSE, 0, COALESCE(cfd.created_at, NOW())
FROM custom_field_definitions cfd
WHERE cfd.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Values: work_items.custom_fields JSONB (keyed by the cfd / field_def id) -> work_item_field_value.
--    Stored as text (the display value); the detail panel and cards read value_text.
INSERT INTO work_item_field_value (id, work_item_id, field_def_id, value_text, created_at, updated_at)
SELECT 'FV-' || substr(md5(wi.id || kv.key), 1, 12), wi.id, kv.key, (kv.value #>> '{}'), NOW(), NOW()
FROM work_items wi
CROSS JOIN LATERAL jsonb_each(wi.custom_fields) kv
WHERE wi.custom_fields IS NOT NULL AND wi.custom_fields <> '{}'::jsonb
  AND EXISTS (SELECT 1 FROM field_def fd WHERE fd.id = kv.key)
ON CONFLICT (work_item_id, field_def_id) DO NOTHING;
