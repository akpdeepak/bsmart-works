-- V88: Cap J — make the seeded report templates genuinely insightful.
--
-- The templates were count-only (a KPI is just items.length; charts were a single bar/pie). The
-- report builder already supports `pivot` sections that render through the shared multi-dimensional
-- pivot engine (workspace-scoped server-side, real measures, 19 chart types) — but the templates
-- never used them, so "Use template" produced a thin, un-insightful report (product-owner feedback).
--
-- Forward-only (RB-10 §3): the three template rows already exist (V38, owner_id NULL,
-- is_template = TRUE; EXEC-MONTHLY + CUSTOMER were last touched in V84). This UPDATEs their
-- `sections` in place to a richer set: a KPI grid (headline counts) + several pivot-backed charts
-- (status / type / priority / workload-by-assignee) + a table of open work + narrative prompts.
--
-- Pivot section shape consumed by ReportSectionCard → PivotSectionBody → buildPivotSpec():
--   {"type":"pivot","title":"…","config":{"spec":{
--      "sourceKind":"guided","mode":"group",
--      "measures":[{"field":"*","agg":"COUNT"}],   -- COUNT(*) per bucket
--      "dimensions":["status"],                     -- allow-listed: status|type|priority|assignee
--      "filters":null,"chartType":"bar"}}}          -- bar|donut|…
-- KPI/table sections keep the {"filter":{…}} shape the renderer counts/lists from.

UPDATE reports SET sections =
 '[{"type":"kpi","title":"Total items","config":{"filter":{}}},
   {"type":"kpi","title":"Delivered","config":{"filter":{"done":true}}},
   {"type":"kpi","title":"Overdue","config":{"filter":{"overdue":true}}},
   {"type":"pivot","title":"Work by status","config":{"spec":{"sourceKind":"guided","mode":"group","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["status"],"filters":null,"chartType":"bar"}}},
   {"type":"pivot","title":"Throughput by type","config":{"spec":{"sourceKind":"guided","mode":"group","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["type"],"filters":null,"chartType":"donut"}}},
   {"type":"pivot","title":"Workload by assignee","config":{"spec":{"sourceKind":"guided","mode":"group","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["assignee"],"filters":null,"chartType":"bar"}}},
   {"type":"pivot","title":"Priority mix","config":{"spec":{"sourceKind":"guided","mode":"group","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["priority"],"filters":null,"chartType":"donut"}}},
   {"type":"narrative","title":"Executive summary","config":{"text":""}},
   {"type":"narrative","title":"Risk summary","config":{"text":""}}]'::jsonb
 WHERE id = 'RPT-TPL-EXEC-MONTHLY';

UPDATE reports SET sections =
 '[{"type":"kpi","title":"Open requests","config":{"filter":{"open":true}}},
   {"type":"kpi","title":"Resolved","config":{"filter":{"done":true}}},
   {"type":"kpi","title":"At risk (overdue)","config":{"filter":{"overdue":true}}},
   {"type":"pivot","title":"Open by status","config":{"spec":{"sourceKind":"guided","mode":"group","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["status"],"filters":null,"chartType":"bar"}}},
   {"type":"pivot","title":"Open by priority","config":{"spec":{"sourceKind":"guided","mode":"group","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["priority"],"filters":null,"chartType":"donut"}}},
   {"type":"table","title":"Open requests","config":{"limit":20,"filter":{"open":true}}},
   {"type":"narrative","title":"Summary for the customer","config":{"text":""}}]'::jsonb
 WHERE id = 'RPT-TPL-CUSTOMER';

UPDATE reports SET sections =
 '[{"type":"kpi","title":"Total in release","config":{"filter":{}}},
   {"type":"kpi","title":"Done","config":{"filter":{"done":true}}},
   {"type":"kpi","title":"Remaining","config":{"filter":{"open":true}}},
   {"type":"pivot","title":"Readiness by status","config":{"spec":{"sourceKind":"guided","mode":"group","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["status"],"filters":null,"chartType":"bar"}}},
   {"type":"pivot","title":"Scope by type","config":{"spec":{"sourceKind":"guided","mode":"group","measures":[{"field":"*","agg":"COUNT"}],"dimensions":["type"],"filters":null,"chartType":"donut"}}},
   {"type":"table","title":"Open items / blockers","config":{"limit":20,"filter":{"open":true}}},
   {"type":"narrative","title":"Release notes","config":{"text":""}}]'::jsonb
 WHERE id = 'RPT-TPL-RELEASE';
