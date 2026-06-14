-- V83: contract phase — bql_filter is superseded by saved_views (one saved-query concept after
-- the BQL Filters/Views consolidation, #250). Migrate any existing saved filters into saved_views,
-- then drop the legacy table. Forward-only (RB-10 §3).

INSERT INTO saved_views (id, workspace_id, project_id, item_type, name, description, bql_filter,
                         column_keys, is_shared, created_by, created_at, updated_at, deleted_at)
SELECT 'SV-' || f.id, f.workspace_id, NULL, NULL, f.name, NULL, f.query,
       '[]', f.is_shared, f.created_by, f.created_at, NOW(), NULL
FROM bql_filter f
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS bql_filter;
