-- V38: Iteration 9 — Service Management / Customer Portal (Cap N + Cap M).
-- The external face of Works: customer organizations, their external users (a SEPARATE
-- identity from internal `users`), admin-defined request types with per-type portal forms,
-- service requests worked by internal agents through pre-filtered queues, multi-tier
-- customer SLAs, and post-resolution CSAT. Every table carries workspace_id so a customer
-- of one DISCOM workspace can never see another's data (RB-40 §1). Forward-only.

-- ── Customer accounts: an external customer organization, scoped to a workspace ──────
CREATE TABLE customer_accounts (
    id            VARCHAR(50)  PRIMARY KEY,
    workspace_id  VARCHAR(100) NOT NULL,                    -- the BCITS workspace serving this customer
    name          TEXT         NOT NULL,
    tier          VARCHAR(20)  NOT NULL DEFAULT 'SILVER',   -- PLATINUM | GOLD | SILVER (drives SLA targets)
    primary_color VARCHAR(20),                              -- white-label branding
    logo_url      TEXT,
    subdomain     VARCHAR(100),                             -- white-label custom subdomain
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customer_accounts_workspace ON customer_accounts(workspace_id);
CREATE UNIQUE INDEX uq_customer_accounts_subdomain ON customer_accounts(subdomain) WHERE subdomain IS NOT NULL;

-- ── Customer users: external identity, separate auth flow from internal users ────────
CREATE TABLE customer_users (
    id                  VARCHAR(50)  PRIMARY KEY,
    customer_account_id VARCHAR(50)  NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    workspace_id        VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    display_name        VARCHAR(150),
    is_account_admin    BOOLEAN      NOT NULL DEFAULT FALSE, -- customer-side admin (can request new accounts)
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_customer_users_email ON customer_users(LOWER(email));
CREATE INDEX idx_customer_users_account   ON customer_users(customer_account_id);
CREATE INDEX idx_customer_users_workspace ON customer_users(workspace_id);

-- ── Request types: Incident / Change / Service + admin-defined, each with a portal form ─
CREATE TABLE request_types (
    id               VARCHAR(50)  PRIMARY KEY,
    workspace_id     VARCHAR(100) NOT NULL,
    type_key         VARCHAR(50)  NOT NULL,                 -- INCIDENT | CHANGE | SERVICE | custom
    name             TEXT         NOT NULL,
    description      TEXT,
    icon             VARCHAR(20),
    form_schema      JSONB        NOT NULL DEFAULT '[]',    -- ordered field defs incl. conditional `showIf`
    default_priority VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    is_system        BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order       INT          NOT NULL DEFAULT 0,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_request_types_workspace ON request_types(workspace_id);

-- ── Customer SLA tiers: target minutes per tier, per workspace (multi-tier SLAs) ─────
CREATE TABLE customer_sla_tiers (
    id                 VARCHAR(50)  PRIMARY KEY,
    workspace_id       VARCHAR(100) NOT NULL,
    tier               VARCHAR(20)  NOT NULL,               -- PLATINUM | GOLD | SILVER
    response_minutes   INT          NOT NULL,               -- first-response target
    resolution_minutes INT          NOT NULL,               -- resolution target
    active             BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_customer_sla_tier ON customer_sla_tiers(workspace_id, tier);

-- ── Service requests: the customer-filed item, worked by internal agents ─────────────
CREATE TABLE service_requests (
    id                   VARCHAR(50)  PRIMARY KEY,
    workspace_id         VARCHAR(100) NOT NULL,
    customer_account_id  VARCHAR(50)  NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
    request_type_id      VARCHAR(50)  NOT NULL,
    type_key             VARCHAR(50),                        -- snapshot for queue display
    submitted_by         VARCHAR(50),                        -- customer_users.id
    subject              TEXT         NOT NULL,
    description          TEXT,
    form_data            JSONB        NOT NULL DEFAULT '{}',
    priority             VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    status               VARCHAR(20)  NOT NULL DEFAULT 'NEW', -- NEW|OPEN|IN_PROGRESS|WAITING_CUSTOMER|RESOLVED|CLOSED
    assignee_id          VARCHAR(100),                        -- internal agent (users.id)
    sla_tier             VARCHAR(20),
    sla_response_minutes INT,
    sla_resolution_minutes INT,
    sla_due_at           TIMESTAMPTZ,                         -- resolution deadline
    first_responded_at   TIMESTAMPTZ,
    resolved_at          TIMESTAMPTZ,
    closed_at            TIMESTAMPTZ,
    linked_work_item_id  VARCHAR(50),                         -- integration point to an internal Incident
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_service_requests_workspace ON service_requests(workspace_id);
CREATE INDEX idx_service_requests_account   ON service_requests(customer_account_id);
CREATE INDEX idx_service_requests_assignee  ON service_requests(assignee_id);
CREATE INDEX idx_service_requests_status    ON service_requests(status);
CREATE INDEX idx_service_requests_due       ON service_requests(sla_due_at);

-- ── CSAT: one post-resolution rating per request ────────────────────────────────────
CREATE TABLE csat_responses (
    id                  VARCHAR(50)  PRIMARY KEY,
    service_request_id  VARCHAR(50)  NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    workspace_id        VARCHAR(100) NOT NULL,
    customer_account_id VARCHAR(50),
    rating              INT          NOT NULL,               -- 1..5
    comment             TEXT,
    submitted_by        VARCHAR(50),                         -- customer_users.id
    submitted_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_csat_per_request ON csat_responses(service_request_id);
CREATE INDEX idx_csat_workspace ON csat_responses(workspace_id);

-- ── Customer-facing knowledge base: a subset of internal articles published to portal ─
ALTER TABLE articles ADD COLUMN IF NOT EXISTS portal_published BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_articles_portal_published ON articles(portal_published);

-- ── Permissions: managing the service desk (LEAD) vs working the queues (MEMBER) ─────
INSERT INTO permissions (id, description, min_tier) VALUES
    ('manage_service', 'Manage customer accounts, request types, SLA tiers and the customer portal', 3),
    ('work_service',   'Work the agent queues: pick up, assign, respond to and resolve requests',     2)
ON CONFLICT (id) DO NOTHING;
