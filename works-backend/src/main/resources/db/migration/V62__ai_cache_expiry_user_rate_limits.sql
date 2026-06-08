-- Iteration 11 gap: AI cache TTL (RB-40 §2 — response caching).
-- Cache entries had no expiry, so they were served indefinitely. Adding expires_at
-- so the control plane can treat stale entries as misses and re-query the model.
-- Existing rows get a 24-hour TTL from migration time.

ALTER TABLE ai_cache_entries
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE ai_cache_entries
    SET expires_at = now() + INTERVAL '24 hours'
    WHERE expires_at IS NULL;

ALTER TABLE ai_cache_entries
    ALTER COLUMN expires_at SET NOT NULL;
