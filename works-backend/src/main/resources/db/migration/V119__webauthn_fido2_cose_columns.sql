-- W1 Phase-1 · Real WebAuthn (FIDO2) via webauthn4j — Slice WA1 (RB-40 §4,
-- docs/implementation/epics/EPIC-P1-webauthn-fido2.md).
--
-- The original passkey path (V52) stored an SPKI/PEM public key and verified a raw-challenge
-- signature — a dependency-free demo, not real FIDO2. Real WebAuthn stores the authenticator's
-- COSE credential (serialized AttestedCredentialData: aaguid + credentialId + COSE public key) and
-- tracks attestation metadata. These columns are additive and nullable so existing legacy rows are
-- untouched; new FIDO2 registrations populate cose_credential and leave public_key_pem null.
--
-- Forward-only, non-disruptive: no backfill, no data loss. The legacy public_key_pem column is kept
-- (now nullable) until the dual path is removed in Slice WA4.

ALTER TABLE webauthn_credentials
    ADD COLUMN cose_credential BYTEA,                                  -- serialized AttestedCredentialData (FIDO2)
    ADD COLUMN aaguid          VARCHAR(64),                            -- authenticator model id (UUID string)
    ADD COLUMN fmt             VARCHAR(32),                            -- attestation statement format, e.g. 'none'
    ADD COLUMN user_handle     VARCHAR(255),                           -- WebAuthn user.id handle (base64url)
    ADD COLUMN uv_initialized  BOOLEAN NOT NULL DEFAULT FALSE;         -- user-verification was performed at registration

-- Legacy signed-nonce rows keep public_key_pem; FIDO2 rows leave it null and use cose_credential.
ALTER TABLE webauthn_credentials ALTER COLUMN public_key_pem DROP NOT NULL;
