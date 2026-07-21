-- Token-version JWT revocation (RB-40 §4, RB-10 §8; W1 governance/security — rate-limit/JWT PR1).
--
-- bSmart issues stateless 7-day HS256 JWTs, so until now a GDPR erasure, password change, or password
-- reset left every previously-minted token valid for up to 7 days. This adds a per-subject "valid
-- after" cutoff: a token is rejected when its issued-at (iat) predates tokens_valid_after. Because the
-- cutoff lives in the shared DB (not per-instance memory), a bump invalidates tokens across every app
-- instance immediately — the distributed property the in-memory RateLimiter lacks.
--
-- NULLABLE on purpose: NULL = "never revoked", so introducing the column changes no existing session
-- (non-disruptive rollout — no mass logout). The cutoff is set to now() only on a real revocation
-- event (erase / password change / password reset; customer-portal password change for parity).
ALTER TABLE users          ADD COLUMN tokens_valid_after TIMESTAMPTZ;
ALTER TABLE customer_users ADD COLUMN tokens_valid_after TIMESTAMPTZ;

COMMENT ON COLUMN users.tokens_valid_after IS
  'JWT revocation cutoff: internal tokens issued (iat) before this instant are rejected. NULL = never revoked.';
COMMENT ON COLUMN customer_users.tokens_valid_after IS
  'JWT revocation cutoff: customer-portal tokens issued before this instant are rejected. NULL = never revoked.';
