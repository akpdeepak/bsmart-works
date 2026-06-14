-- V84: Iteration 6 / Cap J (S05) — enrich the Monthly-executive-summary and Customer-status
-- report templates to the full section set the spec names (INSIGHTS-AI-ALIGNMENT-REVIEW §3.9).
--
-- Both rows already exist (seeded global templates, owner_id NULL, is_template = TRUE) from
-- V38. Migrations are forward-only (RB-10 §3) — V38 is shipped and must not be edited — so this
-- migration UPDATEs the two existing rows in place rather than re-INSERTing (which would collide
-- on the primary key). The section shape is unchanged from V30/V38:
--   { "type": "kpi"|"chart"|"table"|"narrative", "title": "...", "config": { ... } }
-- chart: chartType pie|bar + dimension status|priority|type; kpi: count + optional filter;
-- table: limit + optional filter; narrative: text. (Matches the ReportSectionCard renderer.)
--
-- Monthly executive summary  → KPI grid + velocity/trend chart + narrative + risk summary.
-- Customer status            → customer health + SLA + open-requests table + narrative.

UPDATE reports SET sections =
 '[{"type":"kpi","title":"Total items","config":{"metric":"count"}},
   {"type":"kpi","title":"Overdue","config":{"metric":"count","filter":{"overdue":true}}},
   {"type":"kpi","title":"High priority open","config":{"metric":"count","filter":{"highPriority":true,"open":true}}},
   {"type":"chart","title":"Velocity & delivery trend","config":{"chartType":"bar","dimension":"status"}},
   {"type":"chart","title":"Priority mix","config":{"chartType":"pie","dimension":"priority"}},
   {"type":"narrative","title":"Executive summary","config":{"text":""}},
   {"type":"narrative","title":"Risk summary","config":{"text":""}}]'::jsonb
 WHERE id = 'RPT-TPL-EXEC-MONTHLY';

UPDATE reports SET sections =
 '[{"type":"kpi","title":"Customer health","config":{"metric":"count","filter":{"open":true}}},
   {"type":"kpi","title":"Within SLA","config":{"metric":"count","filter":{"done":true}}},
   {"type":"kpi","title":"SLA at risk","config":{"metric":"count","filter":{"overdue":true}}},
   {"type":"chart","title":"By status","config":{"chartType":"bar","dimension":"status"}},
   {"type":"table","title":"Open requests","config":{"limit":20,"filter":{"open":true}}},
   {"type":"narrative","title":"Summary for the customer","config":{"text":""}}]'::jsonb
 WHERE id = 'RPT-TPL-CUSTOMER';
