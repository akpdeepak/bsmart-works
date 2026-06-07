-- App Marketplace foundation + Developer Portal (iteration 20, Cap R). Two tables:
--   marketplace_listings  — the GLOBAL extension catalogue, browsable by any workspace. Writes are
--                           restricted: a workspace may only publish/edit a listing it owns
--                           (publisher_workspace_id = the publishing workspace). First-party seeded
--                           listings have publisher_workspace_id NULL.
--   installed_extensions  — per-workspace installs. Workspace-scoped (RB-40 §1): every row carries a
--                           NOT NULL workspace_id and every query filters on it. granted_scopes is the
--                           subset of the listing's requested_scopes the admin approved at install time
--                           (permission scoping). One install per (workspace, listing).
-- Forward-only (RB-10 §3); scopes are stored as comma-separated permission strings.

CREATE TABLE marketplace_listings (
    id                     VARCHAR(100) PRIMARY KEY,
    slug                   VARCHAR(150) NOT NULL UNIQUE,
    name                   VARCHAR(200) NOT NULL,
    summary                VARCHAR(500),
    category               VARCHAR(80),
    publisher              VARCHAR(200),
    version                VARCHAR(40),
    icon                   VARCHAR(80),
    requested_scopes       TEXT         NOT NULL DEFAULT '',
    status                 VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    publisher_workspace_id VARCHAR(100),
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketplace_listings_status ON marketplace_listings (status);
CREATE INDEX idx_marketplace_listings_publisher_workspace ON marketplace_listings (publisher_workspace_id);

CREATE TABLE installed_extensions (
    id             VARCHAR(100) PRIMARY KEY,
    workspace_id   VARCHAR(100) NOT NULL,
    listing_id     VARCHAR(100) NOT NULL,
    granted_scopes TEXT         NOT NULL DEFAULT '',
    enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
    installed_by   VARCHAR(100),
    installed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_installed_extensions_ws_listing UNIQUE (workspace_id, listing_id)
);

CREATE INDEX idx_installed_extensions_workspace ON installed_extensions (workspace_id);

-- First-party seed catalogue (PUBLISHED, publisher_workspace_id NULL).
INSERT INTO marketplace_listings
    (id, slug, name, summary, category, publisher, version, icon, requested_scopes, status, publisher_workspace_id)
VALUES
    ('MKT-gitlab-sync', 'gitlab-issue-sync', 'Works GitLab Issue Sync',
     'Two-way sync of work items with GitLab issues.', 'SCM', 'bSmart Works', '1.2.0', 'GitMerge',
     'read_items,create_items,edit_any_item', 'PUBLISHED', NULL),
    ('MKT-slack-notifier', 'slack-notifier', 'Slack Notifier',
     'Post work-item updates and mentions to Slack channels.', 'Messaging', 'bSmart Works', '2.0.1', 'MessageSquare',
     'read_items,write_comments', 'PUBLISHED', NULL),
    ('MKT-jira-importer', 'jira-importer', 'Jira Importer',
     'One-click import of Jira projects, issues and history into Works.', 'Migration', 'bSmart Works', '1.0.4', 'Download',
     'read_items,create_items,manage_projects', 'PUBLISHED', NULL),
    ('MKT-pdf-exporter', 'pdf-report-exporter', 'PDF Report Exporter',
     'Generate branded PDF reports from any board, sprint or dashboard.', 'Reporting', 'bSmart Works', '1.1.0', 'FileText',
     'read_items', 'PUBLISHED', NULL);
