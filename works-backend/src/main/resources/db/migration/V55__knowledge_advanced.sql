-- ============================================================
-- V52: Advanced Knowledge features (Capability I, iteration 20)
--   1. document_templates    — reusable, workspace-scoped markdown templates with placeholders
--   2. article_authors       — multi-author collaboration on knowledge articles
-- ============================================================
-- Both tables are workspace-scoped (RB-40 §1): workspace_id is NOT NULL and every repository query
-- filters on it, so a row can never be read across the tenant boundary. Forward-only (RB-10 §3).

-- ---- Document templates ----------------------------------------------------
-- A library of first-party + workspace-authored document templates. The body is the markdown
-- skeleton (with {{placeholders}}) an author starts a new article from. Plural, snake_case (RB-10 §5).
CREATE TABLE document_templates (
    id          VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    name        TEXT         NOT NULL,
    description TEXT,
    category    VARCHAR(80),
    body        TEXT,
    created_by  VARCHAR(100),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Every list/read query filters on workspace_id, often narrowing by category — index both.
CREATE INDEX IF NOT EXISTS idx_document_templates_workspace_id ON document_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_ws_category  ON document_templates(workspace_id, category);

-- ---- Article authors (multi-author collaboration) --------------------------
-- Knowledge articles (the `articles` table) get a co-authoring roster: AUTHOR / CO_AUTHOR / REVIEWER.
-- workspace_id is carried on the row so the collaboration roster is workspace-scoped without a join
-- back through article -> space (RB-40 §1). One row per (article, user).
CREATE TABLE article_authors (
    id          VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    article_id  VARCHAR(100) NOT NULL,
    user_id     VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'CO_AUTHOR',
    added_by    VARCHAR(100),
    added_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_article_authors_article_user UNIQUE (article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_authors_workspace_id ON article_authors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_article_authors_article_id   ON article_authors(article_id);
CREATE INDEX IF NOT EXISTS idx_article_authors_user_id      ON article_authors(user_id);

-- ---- Seed first-party templates for the canonical dogfood workspace (WS-001) ----
-- Workspace-scoped seeds (RB-40 §1). WS-001 is the seed workspace from V8.
INSERT INTO document_templates (id, workspace_id, name, description, category, body, created_by, created_at, updated_at) VALUES
    ('DTPL-RUNBOOK', 'WS-001', 'Operational Runbook',
     'Step-by-step runbook for operating or recovering a service.', 'RUNBOOK',
     E'# {{service}} Runbook\n\n## Purpose\n_What this runbook covers._\n\n## Prerequisites\n- \n\n## Steps\n1. \n2. \n\n## Rollback\n- \n\n## Escalation\n- On-call: {{oncall}}\n',
     'USR-DEV1', NOW(), NOW()),
    ('DTPL-ADR', 'WS-001', 'Architecture Decision Record',
     'Capture an architectural decision, its context and consequences.', 'ADR',
     E'# ADR-{{number}}: {{title}}\n\n## Status\nProposed\n\n## Context\n_What is the problem and the forces at play?_\n\n## Decision\n_What did we decide?_\n\n## Consequences\n_What becomes easier or harder?_\n',
     'USR-DEV1', NOW(), NOW()),
    ('DTPL-POSTMORTEM', 'WS-001', 'Incident Postmortem',
     'Blameless postmortem for a production incident.', 'POSTMORTEM',
     E'# Postmortem: {{incident}}\n\n## Summary\n_One-paragraph impact summary._\n\n## Timeline\n- {{time}} — \n\n## Root cause\n- \n\n## Action items\n- [ ] \n\n## Lessons learned\n- \n',
     'USR-DEV1', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
