-- KR-025: block-level comment threads anchored to block_id within an article.
-- parent_id supports KR-027 threaded replies (depth 1; root rows have parent_id IS NULL).
-- metadata JSONB supports KR-026 inline text-selection ranges
--   (selectionStart, selectionEnd, selectedText).
CREATE TABLE article_block_comments (
    id           VARCHAR(50)  PRIMARY KEY,
    article_id   VARCHAR(50)  NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    block_id     VARCHAR(100) NOT NULL,
    workspace_id VARCHAR(50)  NOT NULL,
    author_id    VARCHAR(50)  NOT NULL,
    content      TEXT         NOT NULL,
    resolved     BOOLEAN      NOT NULL DEFAULT FALSE,
    parent_id    VARCHAR(50)  REFERENCES article_block_comments(id) ON DELETE CASCADE,
    metadata     JSONB,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_abc_article_block ON article_block_comments (article_id, block_id);
CREATE INDEX idx_abc_workspace     ON article_block_comments (workspace_id);
CREATE INDEX idx_abc_parent        ON article_block_comments (parent_id);
