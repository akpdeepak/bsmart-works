-- W1 Phase-1 / rate-limit & JWT revocation PR3 — distributed (DB-backed) rate-limit store.
--
-- The in-memory RateLimiter counts per JVM, so with N horizontally-scaled instances an attacker gets
-- N x the budget. This table is the shared fixed-window store: a single atomic UPSERT increments the
-- window count using the DB clock (no cross-instance skew), so the limit is enforced across all
-- instances. It backs DbRateLimitStore, selected by app.rate-limit.distributed (default off → the
-- in-memory store still runs, so merging changes nothing until an operator flips it for a multi-
-- instance deploy). No new dependency (Redis/ElastiCache is the deferred AWS-infra follow-up).
--
-- window_start is indexed so stale windows (keys that stopped attempting) can be pruned cheaply.
-- Forward-only, additive.
CREATE TABLE rate_limit_windows (
    rl_key       VARCHAR(255) PRIMARY KEY,   -- the caller-supplied bucket key (e.g. "login:email:ip")
    window_start TIMESTAMPTZ  NOT NULL,       -- DB-clock start of the current fixed window
    count        INTEGER      NOT NULL        -- attempts counted in the current window
);

CREATE INDEX idx_rate_limit_windows_start ON rate_limit_windows(window_start);
