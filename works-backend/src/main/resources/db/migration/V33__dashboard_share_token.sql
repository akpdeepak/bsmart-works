-- V33: Iteration 6 — embeddable dashboards. A dashboard can mint an unguessable, revocable
-- share token that grants public, read-only access via GET /api/v1/public/dashboards/{token}.
-- Partial unique index: tokens are unique when set; many dashboards may have NULL (not shared).

ALTER TABLE dashboards ADD COLUMN share_token VARCHAR(64);

CREATE UNIQUE INDEX idx_dashboards_share_token ON dashboards(share_token) WHERE share_token IS NOT NULL;
