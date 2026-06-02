-- V30: Iteration 6 — custom reports + seeded report templates.
-- A report is a named, ordered list of sections (JSONB). Each section is
-- { "type": "kpi"|"chart"|"table"|"narrative", "title": "...", "config": { ... } }.
-- Templates are reports with is_template = TRUE and no owner; the UI clones their
-- sections into a new user-owned report ("start from template").

CREATE TABLE reports (
    id           VARCHAR(50)  PRIMARY KEY,
    workspace_id VARCHAR(100),
    owner_id     VARCHAR(100) REFERENCES users(id),
    name         TEXT         NOT NULL,
    description  TEXT,
    project_id   VARCHAR(100),
    sections     JSONB        NOT NULL DEFAULT '[]',
    is_template  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_owner     ON reports(owner_id);
CREATE INDEX idx_reports_workspace ON reports(workspace_id);
CREATE INDEX idx_reports_template  ON reports(is_template);

-- Seeded templates (owner_id NULL = global). Sections align with the iter-6 widgets:
-- chartType pie/bar + dimension status/priority/type; kpi count; table; narrative.
INSERT INTO reports (id, name, description, sections, is_template) VALUES
('RPT-TPL-SPRINT', 'Sprint status', 'Sprint progress at a glance',
 '[{"type":"kpi","title":"Open items","config":{"metric":"count","filter":{"open":true}}},
   {"type":"chart","title":"By status","config":{"chartType":"bar","dimension":"status"}},
   {"type":"chart","title":"By priority","config":{"chartType":"pie","dimension":"priority"}},
   {"type":"table","title":"Open work items","config":{"limit":20,"filter":{"open":true}}},
   {"type":"narrative","title":"Summary","config":{"text":""}}]'::jsonb, TRUE),
('RPT-TPL-PROJECT', 'Project status', 'Project health summary for stakeholders',
 '[{"type":"kpi","title":"Total items","config":{"metric":"count"}},
   {"type":"chart","title":"By type","config":{"chartType":"pie","dimension":"type"}},
   {"type":"chart","title":"By status","config":{"chartType":"bar","dimension":"status"}},
   {"type":"narrative","title":"Status narrative","config":{"text":""}}]'::jsonb, TRUE),
('RPT-TPL-WEEKLY', 'Weekly digest', 'Weekly delivery digest',
 '[{"type":"kpi","title":"Open items","config":{"metric":"count","filter":{"open":true}}},
   {"type":"chart","title":"By priority","config":{"chartType":"bar","dimension":"priority"}},
   {"type":"table","title":"Recent items","config":{"limit":15}},
   {"type":"narrative","title":"Notes","config":{"text":""}}]'::jsonb, TRUE);
