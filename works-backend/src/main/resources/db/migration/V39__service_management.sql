-- V39: Iteration 9 — Service Management / Customer Portal (Cap N + Cap M).
-- The external face of Works: a branded, per-customer portal where a utility's people raise
-- requests (incidents, change requests, service requests), watch their SLA countdown, browse a
-- published knowledge base, and rate resolutions — all of it flowing into the agent queues the
-- internal support team works from. Customers are a SEPARATE identity from internal `users`
-- (Cap N): a `customer_account` belongs to a `customer_organization`, which itself belongs to a
-- workspace (the tenant). The "one SLA engine, two contexts" commitment is honoured by reusing
-- iteration 8's SLA tables verbatim — a customer request links to a work item, and that item's
-- clocks (driven by tier-matching policies, see sla_policies.customer_tier from V38) are what both
-- agent and customer watch.
--
-- All tenant-scoped tables carry workspace_id (RB-40 §1): nothing can cross a tenant. Customer-
-- facing reads are additionally organization-scoped server-side so one customer can never see
-- another customer's requests. Every mutation is recorded to the append-only `events` table
-- (RB-10 §3), so the service-management audit log is rebuildable from the event store.

-- ── Permission: internal agent/admin service-management actions (LEAD tier) ────
INSERT INTO permissions (id, description, min_tier) VALUES
    ('manage_service', 'Manage customer orgs, request types, agent queues, KB publishing and CSAT', 3)
ON CONFLICT (id) DO NOTHING;

-- ── Customer organizations (the tenant's customers; white-label + tier) ───────
CREATE TABLE customer_organizations (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,
    name          TEXT         NOT NULL,
    tier          VARCHAR(20)  NOT NULL DEFAULT 'SILVER', -- PLATINUM | GOLD | SILVER
    subdomain     VARCHAR(100),                           -- branded portal host key (e.g. "acme")
    logo_url      TEXT,
    primary_color VARCHAR(20),                            -- portal accent (hex stored as data, not a token)
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    VARCHAR(100) REFERENCES users(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customer_orgs_workspace ON customer_organizations(workspace_id);
-- Subdomain is the public lookup key for portal branding; unique where present.
CREATE UNIQUE INDEX uq_customer_orgs_subdomain ON customer_organizations(subdomain)
    WHERE subdomain IS NOT NULL;

-- ── Customer accounts (external identity, SEPARATE from internal users) ────────
CREATE TABLE customer_accounts (
    id              VARCHAR(50)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    organization_id VARCHAR(50)  NOT NULL REFERENCES customer_organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    password_hash   TEXT         NOT NULL,                -- BCrypt, same scheme as internal auth
    full_name       TEXT,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customer_accounts_org ON customer_accounts(organization_id);
CREATE INDEX idx_customer_accounts_workspace ON customer_accounts(workspace_id);
-- A given email is one account within a workspace (its own namespace, separate from `users`).
CREATE UNIQUE INDEX uq_customer_accounts_email ON customer_accounts(workspace_id, email);

-- ── Request types (Incident / Change Request / Service Request / custom) ──────
CREATE TABLE request_types (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    name         TEXT         NOT NULL,
    category     VARCHAR(30)  NOT NULL DEFAULT 'SERVICE_REQUEST', -- INCIDENT|CHANGE_REQUEST|SERVICE_REQUEST|CUSTOM
    description  TEXT,
    form_schema  JSONB        NOT NULL DEFAULT '[]',  -- ordered field defs: label,key,type,required,options,conditional
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    created_by   VARCHAR(100) REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_request_types_workspace ON request_types(workspace_id);

-- ── Customer requests (the agent queue's working set + the customer's tickets) ─
CREATE TABLE customer_requests (
    id              VARCHAR(50)  PRIMARY KEY,
    workspace_id    VARCHAR(100) NOT NULL,
    organization_id VARCHAR(50)  NOT NULL REFERENCES customer_organizations(id) ON DELETE CASCADE,
    request_type_id VARCHAR(50)  REFERENCES request_types(id),
    submitted_by    VARCHAR(50)  NOT NULL REFERENCES customer_accounts(id), -- the customer account
    subject         TEXT         NOT NULL,
    description     TEXT,
    form_data       JSONB        NOT NULL DEFAULT '{}',  -- answers keyed by the request type's field keys
    status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN', -- OPEN|IN_PROGRESS|WAITING|RESOLVED|CLOSED
    priority        VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM', -- LOW|MEDIUM|HIGH|CRITICAL
    assignee_id     VARCHAR(100) REFERENCES users(id),    -- the internal agent who owns it
    work_item_id    VARCHAR(50),                          -- linked internal work item (NULL until triaged)
    csat_rating     INTEGER      CHECK (csat_rating BETWEEN 1 AND 5),
    csat_comment    TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customer_requests_workspace ON customer_requests(workspace_id);
CREATE INDEX idx_customer_requests_org       ON customer_requests(organization_id);
CREATE INDEX idx_customer_requests_assignee  ON customer_requests(assignee_id);
CREATE INDEX idx_customer_requests_status    ON customer_requests(status);
CREATE INDEX idx_customer_requests_priority  ON customer_requests(priority);
CREATE INDEX idx_customer_requests_submitter ON customer_requests(submitted_by);

-- ── Portal KB articles (the subset of internal KB published to the portal) ────
CREATE TABLE portal_kb_articles (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    article_id   VARCHAR(50),                            -- source internal article (provenance)
    title        TEXT         NOT NULL,
    body         TEXT,
    published_by VARCHAR(100) REFERENCES users(id),
    published_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_portal_kb_workspace ON portal_kb_articles(workspace_id);
-- An internal article publishes to the portal at most once per workspace.
CREATE UNIQUE INDEX uq_portal_kb_article ON portal_kb_articles(workspace_id, article_id)
    WHERE article_id IS NOT NULL;
