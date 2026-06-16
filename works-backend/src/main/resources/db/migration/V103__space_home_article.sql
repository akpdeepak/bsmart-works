-- KR-037: Space home article — a space can designate one article as its "home";
-- opening the space auto-navigates to it. ON DELETE SET NULL ensures the column
-- is nulled (not cascaded) if the article is deleted, keeping the space intact.
-- Note: articles.id is TEXT (e.g. "ART-XXXXXXXX"), so home_article_id is also TEXT.
ALTER TABLE knowledge_spaces ADD COLUMN IF NOT EXISTS home_article_id TEXT REFERENCES articles(id) ON DELETE SET NULL;
