-- V24: Knowledge repository — knowledge_spaces, articles, article_versions, article_work_item_links

CREATE TABLE knowledge_spaces (
    id           VARCHAR(50) PRIMARY KEY,
    workspace_id VARCHAR(100),
    name         TEXT NOT NULL,
    description  TEXT,
    icon         TEXT DEFAULT 'book',
    visibility   VARCHAR(20) NOT NULL DEFAULT 'TEAM',  -- PUBLIC | TEAM | PRIVATE
    created_by   VARCHAR(100) REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE articles (
    id              VARCHAR(50) PRIMARY KEY,
    space_id        VARCHAR(50) NOT NULL REFERENCES knowledge_spaces(id) ON DELETE CASCADE,
    parent_id       VARCHAR(50) REFERENCES articles(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    content         TEXT,
    template_type   VARCHAR(50),  -- RUNBOOK | ADR | POSTMORTEM | ONBOARDING | KB | TROUBLESHOOTING | CUSTOM
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | IN_REVIEW | PUBLISHED | ARCHIVED
    author_id       VARCHAR(100) REFERENCES users(id),
    published_at    TIMESTAMPTZ,
    version_number  INTEGER NOT NULL DEFAULT 1,
    helpful_votes   INTEGER NOT NULL DEFAULT 0,
    view_count      INTEGER NOT NULL DEFAULT 0,
    created_by      VARCHAR(100) REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE article_versions (
    id             BIGSERIAL PRIMARY KEY,
    article_id     VARCHAR(50) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title          TEXT NOT NULL,
    content        TEXT,
    saved_by       VARCHAR(100) REFERENCES users(id),
    saved_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE article_work_item_links (
    id           BIGSERIAL PRIMARY KEY,
    article_id   VARCHAR(50) NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    work_item_id VARCHAR(100) NOT NULL,
    link_type    VARCHAR(30) NOT NULL DEFAULT 'RELATED',  -- RELATED | DOCUMENTS | REFERENCED_BY
    created_by   VARCHAR(100) REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (article_id, work_item_id)
);

-- Seed a default Engineering knowledge space
INSERT INTO knowledge_spaces (id, name, description, icon, visibility, created_at, updated_at)
VALUES
    ('KS-ENGINEERING', 'Engineering',  'Runbooks, ADRs, and technical guides',     'code',   'TEAM',   NOW(), NOW()),
    ('KS-SUPPORT',     'Support',      'Customer KB, troubleshooting guides',       'headset','TEAM',   NOW(), NOW()),
    ('KS-ONBOARDING',  'Onboarding',   'Guides for new team members',               'star',   'TEAM',   NOW(), NOW());
