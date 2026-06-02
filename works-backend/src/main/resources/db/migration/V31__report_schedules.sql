-- V31: Iteration 6 — scheduled report delivery.
-- A schedule fires a report to its recipients on a cadence. Delivery creates an in-app
-- notification (and/or an email) pointing at the report; the visual report itself stays
-- client-rendered, so delivery is a "your report is ready" signal with a link.

CREATE TABLE report_schedules (
    id           VARCHAR(50)  PRIMARY KEY,
    report_id    VARCHAR(50)  NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    owner_id     VARCHAR(100) REFERENCES users(id),
    cadence      VARCHAR(20)  NOT NULL DEFAULT 'WEEKLY',  -- DAILY | WEEKLY | MONTHLY
    channel      VARCHAR(20)  NOT NULL DEFAULT 'IN_APP',  -- IN_APP | EMAIL | BOTH
    recipients   TEXT,                                    -- comma-separated user ids (owner always included)
    next_run_at  TIMESTAMPTZ,
    last_run_at  TIMESTAMPTZ,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_schedules_report ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_owner  ON report_schedules(owner_id);
-- The delivery scheduler polls this composite predicate (active + due).
CREATE INDEX idx_report_schedules_due    ON report_schedules(active, next_run_at);
