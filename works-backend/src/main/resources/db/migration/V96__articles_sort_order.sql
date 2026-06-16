-- KR-033: sort_order for drag-to-reorder in the page tree sidebar.
-- Nullable; NULL sorts after 0 so existing rows keep their current ordering.
ALTER TABLE articles ADD COLUMN sort_order INTEGER DEFAULT 0;
