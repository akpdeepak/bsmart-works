-- Iteration 12 gap: KPI target + BQL formula field (RB-10 §6, RB-40 §2).
-- target:      Optional numeric target for a metric. When set the KPI service
--              evaluates ON_TRACK / AT_RISK / OFF_TRACK per snapshot.
-- bql_formula: Optional BQL expression used as the metric's filter definition,
--              satisfying the "one query language" unification requirement
--              (RB-10 §6: BQL is the single query language for filters,
--              compliance rules, KPI definitions, and dashboard widgets).

ALTER TABLE metric_definitions
    ADD COLUMN IF NOT EXISTS target DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS bql_formula TEXT;
