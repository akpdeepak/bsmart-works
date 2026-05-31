-- V14: Email Verification on Signup
-- Adds email_verified flag and verification_token to users table.
-- On signup, emailVerified = false and a token is generated.
-- /auth/verify?token=<token> sets emailVerified = true.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64);

-- Existing users are considered verified (migrated accounts)
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;
