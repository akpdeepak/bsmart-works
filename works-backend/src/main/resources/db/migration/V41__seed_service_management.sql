-- V39: Iteration 9 seed — a demonstrable customer portal on the BCITS Support Desk (WS-002).
-- Seeds multi-tier SLAs, the three system request types with portal forms, a demo customer
-- organization + admin user, and publishes a couple of KB articles to the portal. Idempotent.
-- Demo customer login: admin@amrutilities.example / portal1234  (dev seed only). Forward-only.

-- ── Multi-tier customer SLAs for the support workspace ──────────────────────────────
INSERT INTO customer_sla_tiers (id, workspace_id, tier, response_minutes, resolution_minutes) VALUES
    ('SLT-WS002-PLAT', 'WS-002', 'PLATINUM', 15, 30),
    ('SLT-WS002-GOLD', 'WS-002', 'GOLD',     30, 120),
    ('SLT-WS002-SILV', 'WS-002', 'SILVER',   60, 480)
ON CONFLICT (workspace_id, tier) DO NOTHING;

-- ── System request types with portal forms (conditional fields supported via showIf) ─
INSERT INTO request_types (id, workspace_id, type_key, name, description, icon, default_priority,
                           is_system, sort_order, form_schema) VALUES
    ('RT-WS002-INC', 'WS-002', 'INCIDENT', 'Report an incident',
     'Something is broken or not working as expected.', 'alert', 'HIGH', TRUE, 1,
     $q$[
       {"key":"impact","label":"Impact","type":"select","required":true,"options":["Single user","Multiple users","Site-wide outage"]},
       {"key":"affected_system","label":"Affected system","type":"text","required":true},
       {"key":"started_at","label":"When did it start?","type":"date","required":false}
     ]$q$),
    ('RT-WS002-CHG', 'WS-002', 'CHANGE', 'Request a change',
     'Ask for a change to your service or configuration.', 'edit', 'MEDIUM', TRUE, 2,
     $q$[
       {"key":"change_summary","label":"What should change?","type":"textarea","required":true},
       {"key":"reason","label":"Business reason","type":"textarea","required":true},
       {"key":"preferred_date","label":"Preferred date","type":"date","required":false}
     ]$q$),
    ('RT-WS002-SVC', 'WS-002', 'SERVICE', 'Service request',
     'Request a standard service such as new user accounts or report access.', 'inbox', 'MEDIUM', TRUE, 3,
     $q$[
       {"key":"service","label":"Which service?","type":"select","required":true,"options":["New user accounts","Report access","Data export"]},
       {"key":"quantity","label":"How many accounts?","type":"number","required":false,"showIf":{"field":"service","equals":"New user accounts"}},
       {"key":"details","label":"Details","type":"textarea","required":false}
     ]$q$)
ON CONFLICT (id) DO NOTHING;

-- ── Demo customer organization (Platinum tier, white-labeled) ───────────────────────
INSERT INTO customer_accounts (id, workspace_id, name, tier, primary_color, subdomain, created_by) VALUES
    ('CA-DEMO01', 'WS-002', 'AMR Utilities Pvt Ltd', 'PLATINUM', '#0E7C5E', 'amr', 'USR-DEV1')
ON CONFLICT (id) DO NOTHING;

-- ── Demo customer admin user — password: portal1234 (BCrypt) ────────────────────────
INSERT INTO customer_users (id, customer_account_id, workspace_id, email, password_hash,
                            display_name, is_account_admin) VALUES
    ('CU-DEMO01', 'CA-DEMO01', 'WS-002', 'admin@amrutilities.example',
     '$2a$10$nIXd2ULNak3UIBYere4e2uV81feYYTautemSSEO7q5BX3.j5eotK6',
     'Asha Rao', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Publish a small subset of the support workspace's published articles to the portal ─
-- Safe no-op when no matching articles exist yet.
UPDATE articles SET portal_published = TRUE
 WHERE status = 'PUBLISHED'
   AND space_id IN (SELECT id FROM knowledge_spaces WHERE workspace_id = 'WS-002')
   AND id IN (
       SELECT id FROM articles
        WHERE status = 'PUBLISHED'
          AND space_id IN (SELECT id FROM knowledge_spaces WHERE workspace_id = 'WS-002')
        ORDER BY updated_at DESC
        LIMIT 5
   );
