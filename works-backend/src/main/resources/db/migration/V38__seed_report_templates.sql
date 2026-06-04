-- V38: Iteration 6 — complete the seeded report template library (Cap J, S05).
-- V30 seeded Sprint / Project / Weekly templates; the spec also names Release,
-- Monthly executive summary, and Customer status. These three close that gap.
-- Templates are global reports (owner_id NULL, is_template = TRUE); the UI clones
-- their sections into a new user-owned report ("start from template"). Section shape
-- matches V30: { type: kpi|chart|table|narrative, title, config }.

INSERT INTO reports (id, name, description, sections, is_template) VALUES
('RPT-TPL-RELEASE', 'Release status', 'Scope and readiness for an upcoming release',
 '[{"type":"kpi","title":"Total items","config":{"metric":"count"}},
   {"type":"kpi","title":"Completed","config":{"metric":"count","filter":{"done":true}}},
   {"type":"chart","title":"By status","config":{"chartType":"bar","dimension":"status"}},
   {"type":"chart","title":"By type","config":{"chartType":"pie","dimension":"type"}},
   {"type":"table","title":"Open items in scope","config":{"limit":25,"filter":{"open":true}}},
   {"type":"narrative","title":"Release readiness","config":{"text":""}}]'::jsonb, TRUE),

('RPT-TPL-EXEC-MONTHLY', 'Monthly executive summary', 'Leadership view — delivery, risk and trend for the month',
 '[{"type":"kpi","title":"Total items","config":{"metric":"count"}},
   {"type":"kpi","title":"Overdue","config":{"metric":"count","filter":{"overdue":true}}},
   {"type":"kpi","title":"High priority open","config":{"metric":"count","filter":{"highPriority":true,"open":true}}},
   {"type":"chart","title":"Status distribution","config":{"chartType":"pie","dimension":"status"}},
   {"type":"chart","title":"Priority mix","config":{"chartType":"bar","dimension":"priority"}},
   {"type":"narrative","title":"Executive summary","config":{"text":""}},
   {"type":"narrative","title":"Risks & decisions","config":{"text":""}}]'::jsonb, TRUE),

('RPT-TPL-CUSTOMER', 'Customer status', 'Customer-facing status of their requests and resolution',
 '[{"type":"kpi","title":"Open requests","config":{"metric":"count","filter":{"open":true}}},
   {"type":"kpi","title":"Resolved","config":{"metric":"count","filter":{"done":true}}},
   {"type":"chart","title":"By status","config":{"chartType":"bar","dimension":"status"}},
   {"type":"table","title":"Your requests","config":{"limit":20}},
   {"type":"narrative","title":"Summary for the customer","config":{"text":""}}]'::jsonb, TRUE);
