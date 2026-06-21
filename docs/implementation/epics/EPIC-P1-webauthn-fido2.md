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
**COMPLETE — WA1 + WA2 + WA3 + WA4 all built, validated and merged this session.** Real FIDO2
(webauthn4j) is the only passkey path; the legacy signed-nonce backend is removed. This was the sole
remaining Phase-1 (W1) build, so **Phase 1 / workstream W1 is now complete.** One deferred,
non-blocking follow-up: a CONTRACT migration to drop the now-unused `webauthn_credentials.public_key_pem`
column (kept nullable; same EXPAND/CONTRACT discipline as the PII-vault column drop).

---

## 7. Slice WA1 — backend verifier + schema + config — plan & as-built

> Lane: Large/risky (new dependency · auth · schema). Branch `feat/w1-webauthn-wa1-verifier` off
> `origin/main`. **Purely additive — nothing in the live signed-nonce path changes, so `main` stays
> shippable.** The real verifier ships built + unit-tested but is not yet wired into the ceremonies
> (that is WA2), gated conceptually by `app.webauthn.fido2-enabled` (default off).

**Scope.** Add the webauthn4j dependency, the relying-party config, the V119 COSE schema, and a
production-grade FIDO2 verifier (`WebAuthnFido2Verifier`) wrapping `WebAuthnManager`, covered by an
authenticator-emulator round-trip + rejection tests. No controller/service/DTO/frontend change.

**Analysis (related scopes covered).**
- *Engineering (RB-10):* new managed dependency `com.webauthn4j:webauthn4j-core 0.31.7.RELEASE`
  (+`webauthn4j-test`, test scope). webauthn4j 0.31.7 uses **Jackson 3** (`tools.jackson.*`), already
  managed by the Spring Boot 4.1 parent — no version pin needed, no Jackson 2 conflict. Flyway-only
  schema change (V119), forward-only/additive. Pure verifier (`@Component`, no DB) → unit-testable.
- *Governance (RB-40 §4):* this is the spec-committed real WebAuthn. Attestation policy **none/self**
  (`createNonStrictWebAuthnManager`); origin + rpId from static `app.webauthn.*` config (mirrors the
  CORS allow-list). `webauthn_credentials` is already `@Filter`'d (workspace-scoped) — unchanged.
- *Data model:* V119 adds nullable `cose_credential BYTEA`, `aaguid`, `fmt`, `user_handle`,
  `uv_initialized` and relaxes `public_key_pem` to nullable. Existing legacy rows untouched (no
  backfill); new FIDO2 rows use `cose_credential`. The entity maps the new columns so the Flyway boot
  + `ddl-auto=validate` ITs validate schema↔entity alignment.
- *Counter crux (EPIC §2), verified against the 0.31.7 JAR via `javap`:* persist the serialized
  `AttestedCredentialData` (`AttestedCredentialDataConverter.convert`) + a server-tracked `sign_count`;
  at assertion rebuild `CredentialRecordImpl(null, uvInitialized, null, null, storedSignCount, acd,
  null, null, null, null)` so `verify` reads the **persisted** counter and the caller stores the new
  one. (Discovered while testing: webauthn4j counters are unsigned-32-bit — `CredentialRecordImpl`
  rejects a counter > 4294967295; production counters are always uint32, so this only constrains test
  fixtures.)

**Files.**
- `works-backend/pom.xml` — `${webauthn4j.version}` property + `webauthn4j-core` (compile) +
  `webauthn4j-test` (test).
- `WebAuthnSettings.java` (new) — `@ConfigurationProperties("app.webauthn")`: rpId, rpName,
  allowedOrigins, userVerificationRequired, fido2Enabled.
- `WebAuthnFido2Verifier.java` (new) — `verifyRegistration(...)` → persistable `RegistrationResult`
  (credentialId, coseCredential, aaguid, fmt, signCount, uvInitialized, algorithm);
  `verifyAssertion(...)` → `AssertionResult` (new signCount). webauthn4j exceptions translated to
  `ApiException` (badRequest on registration, unauthorized on assertion).
- `V119__webauthn_fido2_cose_columns.sql` (new) — additive COSE columns + relax `public_key_pem`.
- `WebAuthnCredential.java` — map the five new columns (getters/setters).
- `application.properties` — §18 `app.webauthn.*`.
- `WebAuthnFido2VerifierTest.java` (new, `@Tag("unit")`) — webauthn4j-test `ClientPlatform`
  (`NONE_ATTESTATION_AUTHENTICATOR`) round-trip.
- `ai-rules/00-ORCHESTRATOR.md` §6 — high-water V118→**V119**, next migration →V120; regenerated
  CLAUDE.md/AGENTS.md/etc. via `scripts/generate-ai-rules.mjs`.

**Acceptance criteria.** Real attestation + assertion verified (origin/rpId/signature/counter);
credentials yield a serialized COSE credential; wrong-origin, wrong-challenge, tampered-signature and
counter-regression (clone) all rejected as `ApiException`; full local gate green; ai-rules `--check`
in sync.

**Validation (this session, all green).** `./mvnw -Dgroups=unit clean verify` → **1455** unit tests,
0 failures + Checkstyle + JaCoCo gates pass. `WebAuthnFido2VerifierTest` 5/5 (valid round-trip;
wrong-origin; wrong-challenge; tampered-signature; counter-regression). `npm run guardrails` blocking
rules pass (only pre-existing baseline hex debt warned, unrelated). `generate-ai-rules.mjs --check`
OK. Full `failsafe:integration-test failsafe:verify` (Docker up) — V1→V119 boot + `ddl-auto=validate`
green, 121 ITs. **Merged: PR #438 (`a293154a`).**

---

## 8. Slice WA2 — wire the ceremonies + DTOs — plan & as-built

> Lane: Large/risky (auth path). Branch `feat/w1-webauthn-wa2-ceremonies` off `origin/main`. Both
> crypto paths are flag-gated by `app.webauthn.fido2-enabled` (**default off**), so the live ceremonies
> still run the legacy signed-nonce path and the existing frontend is unaffected — `main` stays
> shippable. Flipping the flag on (after WA3 ships the real frontend) activates FIDO2.

**Scope.** Route `WebAuthnService.finishRegistration`/`finishAuthentication` through
`WebAuthnFido2Verifier` when the flag is on (legacy `WebAuthnCrypto` otherwise); extend the DTOs with
the FIDO2 fields; enrich the `begin` responses with the full `navigator.credentials` option shape.

**Analysis (related scopes covered).**
- *Engineering (RB-10):* the finish methods now take the request DTO (the controller is the only
  caller — verified by grep). Base64url decode/encode at the service boundary (the stored challenge is
  base64url-without-padding; `Base64.getUrlDecoder` tolerates the missing padding). The `userHandle` is
  deterministic — `base64url(userId)` — so registration needs no extra round-trip and assertion can
  pass a possibly-null handle straight through.
- *Governance (RB-40 §1/§4):* still self-scoped (identity from JWT on register, from begin-ceremony on
  assert); no new tenant surface; `webauthn_credentials` stays `@Filter`'d. Fail-closed: a legacy
  (no-COSE) credential is refused on the FIDO2 assertion path; missing FIDO2 fields → 401/400.
- *Compatibility:* DTOs relax the legacy fields to optional and add nullable FIDO2 fields, so the
  existing frontend payload still deserializes and (flag off) runs the unchanged legacy path. The
  enriched `begin` response only **adds** keys — the legacy frontend reads `challenge` and ignores the
  rest. No migration, no schema change (V119 columns from WA1 are now populated by the FIDO2 path).

**Files.** `WebAuthnService.java` (dual-path routing + `userHandle` + base64url helpers),
`WebAuthnController.java` (inject `WebAuthnSettings`; pass DTOs; enrich both `begin` responses with
rp/user/pubKeyCredParams/authenticatorSelection/excludeCredentials/allowCredentials + legacy fields),
`dto/PasskeyRegisterRequest.java` (+`attestationObject`/`clientDataJSON`; legacy fields optional),
`dto/PasskeyAuthFinishRequest.java` (+`authenticatorData`/`clientDataJSON`/`userHandle`; `signature`
optional), `WebAuthnFido2CeremonyIT.java` (new).

**Acceptance criteria.** With the flag on, a real emulator attestation registers and persists a COSE
credential (public_key_pem null), and a real assertion against it signs the user in and advances the
counter; a legacy credential is rejected on the FIDO2 path; with the flag off the legacy path is
unchanged. Full gate green.

**Validation (this session, all green).** `./mvnw -Dgroups=unit clean verify` → 1455 unit + Checkstyle
(0 violations) + JaCoCo (all checks met). `WebAuthnFido2CeremonyIT` 2/2 (register+assert via FIDO2;
legacy-credential rejection) against Testcontainers Postgres. `npm run guardrails` blocking rules pass.
Full `failsafe:integration-test failsafe:verify` green (note appended on merge).

---

## 9. Slice WA3 — frontend cutover to navigator.credentials + login — plan & as-built

> Lane: Large/risky (auth, coupled cutover). Branch `feat/w1-webauthn-wa3-frontend` off `origin/main`.
> **Atomic cutover:** the frontend now uses `navigator.credentials`, so it posts FIDO2 fields that only
> the real verifier accepts — therefore this slice also flips `app.webauthn.fido2-enabled` **on by
> default** (backend + frontend ship together, as flagged in §0/§3). The legacy `WebAuthnCrypto` path
> stays as fallback until WA4 removes it. (Safe to flip: the old passwordless login was dead code and
> the old credentials were per-browser localStorage demos — no real users to migrate, MFA/password
> remain.)

**Scope.** Rewrite `passkey.js` to real WebAuthn; add the pre-auth authenticate client; build the
login-view passkey sign-in; flip the FIDO2 flag default on.

**Analysis (related scopes covered).**
- *Design (RB-30):* the new login button uses design tokens (`brand-navy`, `brand-navy-tint/40`
  focus ring) and the established five-state button pattern + a `Fingerprint` Lucide icon; it renders
  only when `passkeysSupported()` (so unsupported browsers/jsdom never show it).
- *Engineering (RB-10):* `passkey.js` drops the WebCrypto software-authenticator (localStorage keypair,
  PEM, P1363→DER) for `navigator.credentials.create/get`; base64url is the single wire codec. The new
  `securityClient.beginAuthenticatePasskey/finishAuthenticatePasskey` go through the one `apiClient`
  (pre-auth, no token needed — the endpoints are permit-all). On success the login handler establishes
  the session exactly like password/MFA login (`setCurrentUser`/`setToken`/`bSmartSession`).
- *Governance (RB-40 §4):* `passkeysSupported()` now gates on `window.PublicKeyCredential` (was
  `crypto.subtle`). rpId/origins come from server config; in prod set `BSMART_WEBAUTHN_RP_ID` +
  `BSMART_WEBAUTHN_ALLOWED_ORIGINS` (localhost defaults are dev-only).
- *Compatibility:* the export names (`registerPasskey`/`authenticatePasskey`/`passkeysSupported`) are
  unchanged, so `security-center.jsx` registration and its test (which mocks `@/lib/passkey`) keep
  working; the register ceremony now produces a real attestation that the (now-on) verifier accepts.

**Files.** `works-frontend/src/lib/passkey.js` (rewrite), `works-frontend/src/lib/security.js`
(+authenticate methods), `works-frontend/src/app/AppShell.jsx` (imports + `handlePasskeyLogin` +
login-form passkey button), `works-backend/.../WebAuthnSettings.java` + `application.properties`
(flip `fido2-enabled` default → true).

**Acceptance criteria.** `passkeysSupported()` reflects `PublicKeyCredential`; registration via
`navigator.credentials.create` and passwordless login via `.get` work against the live (flag-on)
backend; the login view offers "Sign in with a passkey"; the legacy export contract is preserved;
frontend lint/test/build + backend gate green.

**Validation (this session, all green).** Frontend: `eslint` 0 errors (only pre-existing AppShell
baseline-debt warnings); `vitest run` **1733** tests / 233 files pass (incl. `security-center.test.jsx`);
`vite build` OK. Backend: `./mvnw -Dgroups=unit clean verify` → 1455 unit + Checkstyle 0 + JaCoCo met;
`npm run guardrails` blocking rules pass; full `failsafe:integration-test` green (note appended on
merge). Live login screenshot skipped — dev port 5173 was held by a peer process; the change is covered
by lint + the full test suite + build (button is conditional on `PublicKeyCredential`).

---

## 10. Slice WA4 — remove the legacy path + flag — plan & as-built

> Lane: Large/risky (auth). Branch `feat/w1-webauthn-wa4-cleanup` off `origin/main`. Makes FIDO2 the
> unconditional, only passkey path. Safe to remove the legacy backend now: it was a dependency-free
> signed-nonce demo, the old passwordless login was dead code, and post-WA3 the live frontend posts
> FIDO2 fields the legacy path would reject anyway. The real fallback (MFA/password, RB-40 §2) is
> untouched.

**Scope.** Delete `WebAuthnCrypto` + `WebAuthnCryptoTest`; drop the dual-path routing and the
`app.webauthn.fido2-enabled` flag; trim the legacy DTO fields; FIDO2 becomes unconditional.

**Analysis (related scopes covered).** Full `git grep` blast-radius first (per the verify-before-act
discipline): the only non-legacy `WebAuthnCrypto` use was `newChallenge()` in `begin()` — inlined into
`WebAuthnService` (SecureRandom + base64url). The flag was read only in `WebAuthnService` (two
branches, now gone) and set only in `WebAuthnSettings`/properties/the ceremony IT. The legacy register
DTO fields (`credentialId`/`publicKeyPem`/`algorithm`/`signature`) were consumed only by `registerLegacy`.
The entity's `publicKeyPem` field + column are **kept** (now always null) so an orphaned pre-cutover
row is recognised and rejected at assertion (`cred.getCoseCredential() == null` guard); dropping the
column is a deferred CONTRACT migration. No migration in this slice; no frontend change (WA3 already
posts only FIDO2 fields).

**Files.** Deleted: `WebAuthnCrypto.java`, `WebAuthnCryptoTest.java`. Modified: `WebAuthnService.java`
(FIDO2-only; inlined `newChallenge`; dropped `WebAuthnSettings` dep), `WebAuthnSettings.java` (drop
`fido2Enabled`), `application.properties` (drop the flag), `dto/PasskeyRegisterRequest.java`
(attestation-only, `@NotBlank`), `dto/PasskeyAuthFinishRequest.java` (FIDO2 fields `@NotBlank`),
`WebAuthnController.java` + `WebAuthnCredential.java` (javadoc), `WebAuthnFido2CeremonyIT.java` (drop
the flag property + adapt to the trimmed register DTO).

**Acceptance criteria.** No `WebAuthnCrypto` / `fido2-enabled` references remain; registration and
passwordless login still work via FIDO2; an orphaned legacy credential is rejected; full gate green;
JaCoCo bundle gate still met after removing the (covered) legacy class.

**Validation (this session, all green).** `./mvnw -Dgroups=unit clean verify` → **1449** unit
(−6 = the removed legacy test) + Checkstyle 0 + JaCoCo all checks met. `npm run guardrails` blocking
rules pass. Full `failsafe:integration-test failsafe:verify` (Docker) — `WebAuthnFido2CeremonyIT` 2/2
and the suite green (note appended on merge).
