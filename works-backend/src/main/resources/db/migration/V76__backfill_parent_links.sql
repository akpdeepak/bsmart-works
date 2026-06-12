-- =====================================================================
-- Project hierarchy into the links table (parent/child managed in the Links surface)
-- =====================================================================
-- Hierarchy is a 1:N relationship and stays anchored on work_items.parent_id (the board,
-- backlog, epic rail, and validation all read it). To surface and manage parent/child in the
-- Links section alongside typed M:N links, the backend now PROJECTS parent_id into a PARENT
-- link row per child ({source_id = child, target_id = parent, link_type = 'PARENT'}) and keeps
-- it in sync on every parent_id change. This backfill seeds those rows for existing items.
-- Forward-only (RB-10 §3).

INSERT INTO work_item_links (source_id, target_id, link_type, created_at)
SELECT id, parent_id, 'PARENT', NOW()
FROM work_items
WHERE parent_id IS NOT NULL AND deleted_at IS NULL
ON CONFLICT (source_id, target_id, link_type) DO NOTHING;
