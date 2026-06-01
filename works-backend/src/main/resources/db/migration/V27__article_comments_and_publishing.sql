-- V27: Iteration 5 completion — inline article comments + publishing-workflow tracking.
-- Adds threaded/inline comments on knowledge articles and the review metadata the
-- Author -> Review -> Publish workflow needs (reviewer + submission timestamp).

CREATE TABLE article_comments (
    id                BIGSERIAL PRIMARY KEY,
    article_id        VARCHAR(50)  NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    parent_comment_id BIGINT       REFERENCES article_comments(id) ON DELETE CASCADE,
    section_anchor    TEXT,        -- optional heading/section the comment is anchored to (inline comments)
    body              TEXT         NOT NULL,
    author_id         VARCHAR(100) REFERENCES users(id),
    resolved          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_article_comments_article ON article_comments(article_id);
CREATE INDEX idx_article_comments_parent  ON article_comments(parent_comment_id);

-- Publishing-workflow metadata on the article itself.
ALTER TABLE articles ADD COLUMN reviewer_id  VARCHAR(100) REFERENCES users(id);
ALTER TABLE articles ADD COLUMN submitted_at TIMESTAMPTZ;
