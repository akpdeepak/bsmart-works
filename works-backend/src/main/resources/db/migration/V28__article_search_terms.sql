-- V28: Knowledge-base search-term analytics — completes iteration-5 article analytics.
-- Records normalized terms typed into the article search so editors can see what readers
-- look for (and, via zero-result terms, what content is missing). Workspace-wide counter.

CREATE TABLE article_search_terms (
    term             TEXT        PRIMARY KEY,
    search_count     BIGINT      NOT NULL DEFAULT 0,
    last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_article_search_terms_count ON article_search_terms(search_count DESC);
