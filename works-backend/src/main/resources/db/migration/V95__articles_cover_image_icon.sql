-- V95: article cover image + icon/emoji — KR-009 + KR-010 (Know Studio P0)
-- cover_image: external HTTPS URL or a gradient key like "gradient:brand-navy-to-orange";
--              validated at the API boundary (no javascript: scheme).
-- icon:        emoji string (e.g. "📝") or Lucide icon name prefixed "lucide:";
--              displayed beside the article title in the page tree and article header.
ALTER TABLE articles
    ADD COLUMN cover_image VARCHAR(500),
    ADD COLUMN icon        VARCHAR(50);
