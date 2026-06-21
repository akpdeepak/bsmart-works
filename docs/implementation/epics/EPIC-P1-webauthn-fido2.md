# EPIC P1 — Real WebAuthn (FIDO2) via webauthn4j

> Phase 1 (Governance & security closure), the final W1 item. **Lane: Large/risky** (new dependency ·
> auth · schema · coupled frontend). **Execution-ready plan** — decisions locked, library API verified.
> Deepak (2026-06-21): build it now as a multi-PR sequence (spanning sessions); attestation = none/self;
> origin = static config allowlist.

## 0. Why this is a rebuild, not a tweak (verified by discovery)
The current passkey path is a **dependency-free signed-nonce demo**, not real FIDO2:
- `WebAuthnCrypto.verify()` signs the **raw challenge string** (`sig.update(challenge.getBytes())`),
  NOT `authData || SHA256(clientDataJSON)`. No attestation, no `clientDataJSON`, no `authenticatorData`,
  no origin/rpIdHash binding, no real counter-regression.
- Credentials store an **SPKI/PEM** public key, not a COSE key; no aaguid/fmt/user_handle.
- Frontend `passkey.js` is a **localStorage WebCrypto software authenticator** (per-browser, never syncs),
  NOT `navigator.credentials`. `passkeysSupported()` only checks `crypto.subtle`, not `PublicKeyCredential`.
- The passwordless **login** path is **dead code** (`authenticatePasskey` imported nowhere; no login view
  calls it). Only the **registration** flow (`security-center.jsx`) is wired.
So real WebAuthn is largely net-new. It is a **hardening upgrade, not an open leak** (MFA/password remain),
which is why it is sequenced last in Phase 1.

## 1. Locked decisions (Deepak, 2026-06-21)
- **Library:** `com.webauthn4j:webauthn4j-core` **0.31.7.RELEASE** (latest stable; Java 17+, we run 21).
  Use `webauthn4j-core` directly (NOT `webauthn4j-spring-security-*` — this app has a custom stateless
  JWT filter, not Spring Security's WebAuthn config). Add `com.webauthn4j:webauthn4j-test` (test scope)
  for ceremony fixtures.
- **Attestation policy:** **none / self** — `WebAuthnManager.createNonStrictWebAuthnManager()`. Verify
  origin + rpId + signature + counter; do NOT require an attestation trust chain / AAGUID-MDS allowlist.
- **Origin / rpId source:** **static config** `app.webauthn.*` (rpId, rpName, allowed-origins) — reuse
  the CORS allowed-origins shape. Per-workspace custom-domain origins (V60 `custom_domains`) are a future
  enhancement, explicitly deferred.

## 2. Verified webauthn4j 0.31.7 API shape
```java
WebAuthnManager m = WebAuthnManager.createNonStrictWebAuthnManager();   // attestation 'none'
// Registration:
RegistrationData rd = m.parse(new RegistrationRequest(attestationObject, clientDataJSON));
ServerProperty sp = new ServerProperty(new Origin(origin), rpId, new DefaultChallenge(challengeBytes), null);
m.verify(rd, new RegistrationParameters(sp, pubKeyCredParams /*nullable*/, userVerificationRequired, userPresenceRequired));
// Persist from rd.getAttestationObject().getAuthenticatorData().getAttestedCredentialData():
//   credentialId (byte[]), COSEKey (the public key), aaguid; signCount from authenticatorData.getSignCount().
// Authentication:
AuthenticationData ad = m.parse(new AuthenticationRequest(credentialId, userHandle, authenticatorData, clientDataJSON, signature));
m.verify(ad, new AuthenticationParameters(sp, credentialRecord, allowCredentials, userVerificationRequired, userPresenceRequired));
updateCounter(ad.getCredentialId(), ad.getAuthenticatorData().getSignCount());   // counter-regression handled by verify()
```
**Persistence/counter crux:** webauthn4j's `verify` reads the stored counter from the `CredentialRecord`
you pass. Persist the serialized `AttestedCredentialData` (via `AttestedCredentialDataConverter`) +
attestation statement + the **server-tracked** `sign_count`; at assertion build a `CredentialRecordImpl`
that returns the *persisted* counter (not the original). This is the one subtle part — get the 0.31.7
`CredentialRecord`/`CredentialRecordImpl` constructor shape exactly right (verify against the 0.31.7
javadoc before coding).

## 3. Slice plan (multi-PR; each CI-green; main stays shippable)
- **WA1 — backend verifier + schema + config (additive, legacy path preserved).**
  pom: webauthn4j-core + webauthn4j-test. `WebAuthnSettings` + `app.webauthn.*` (§18). **V119**:
  nullable `cose_credential BYTEA`, `aaguid`, `fmt`, `user_handle`, `uv_initialized` on
  `webauthn_credentials` (keep `public_key_pem` nullable for legacy rows). New `WebAuthnFido2Verifier`
  wrapping `WebAuthnManager` for registration + assertion. **Tests:** webauthn4j-test `EmulatorUtil`/
  `ClientPlatform` round-trip — valid register/assert verify; tampered origin/challenge/signature +
  counter-regression rejected. Verifier may ship tested-but-not-yet-wired (staged, like the flag-gated
  slices) OR wire it behind a `webauthn.fido2.enabled` flag with the legacy path as fallback.
- **WA2 — wire the ceremonies + DTOs.** `WebAuthnService.finishRegistration/finishAuthentication` route
  to the verifier; DTOs gain `attestationObject`/`clientDataJSON` (register) +
  `authenticatorData`/`clientDataJSON`/`signature`/`userHandle` (assert). Keep the legacy branch until
  the frontend cuts over (so main stays shippable), OR flag-gate both paths.
- **WA3 — frontend.** `passkey.js` → `navigator.credentials.create()/get()`; `security.js` gains
  `beginAuthenticatePasskey`/`finishAuthenticatePasskey`; build the **login-view passkey integration**
  (currently absent); `passkeysSupported()` → check `window.PublicKeyCredential`.
- **WA4 — cleanup.** Remove `WebAuthnCrypto` + the legacy DTO fields + the dual path once WA3 soaks;
  rewrite `WebAuthnCryptoTest` → `WebAuthnFido2VerifierTest`/IT. (JaCoCo note: `WebAuthnCrypto` is
  currently unit-covered; the replacement is covered by webauthn4j-test ITs — watch the 60% bundle gate.)

## 4. Files (from discovery)
Backend: `WebAuthnCrypto.java` (→ replace), `WebAuthnService.java` (lines 41-131 ceremonies),
`WebAuthnController.java` (`/api/v1/auth/passkeys*` + `/passkey/authenticate/*`), DTOs
`PasskeyRegisterRequest`/`PasskeyAuthBeginRequest`/`PasskeyAuthFinishRequest`, `WebAuthnCredential`
(+repo), `WebAuthnChallenge` (+repo, DB-stored challenges, 300s TTL), `SecurityConfig` (permit-all
authenticate endpoints), pom.xml, application.properties (§18 new). Migration `V119`. Frontend:
`works-frontend/src/lib/passkey.js`, `src/lib/security.js`, `src/components/works/organisms/security-center.jsx`,
+ a login view. Existing test: `WebAuthnCryptoTest`.

## 5. Acceptance
Real attestation + assertion verified (origin/rpId/signature/counter); credentials store COSE keys;
counter-regression clone detection; tamper/replay/origin/rpIdHash ITs (webauthn4j-test); frontend uses
`navigator.credentials`; passkey login wired; full gate green. rpId/origins from `app.webauthn.*`.

## 6. Status
**Not started in code** (this doc is the execution-ready plan). Branch placeholder
`feat/w1-webauthn-fido2-backend`. Everything before this (PII-vault, #243 A-D/F, FLS 1-3, rate-limit
PR1-4, SOC2 matrix) is merged on `main`; WebAuthn is the sole remaining Phase-1 build.
