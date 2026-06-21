package com.bcits.works;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Relying-party configuration for real WebAuthn / FIDO2 (RB-40 §4,
 * EPIC-P1-webauthn-fido2). Bound from {@code app.webauthn.*}.
 *
 * <p>Locked decisions (EPIC §1): attestation is verified as <em>none/self</em> (no AAGUID/MDS trust
 * chain — see {@link WebAuthnFido2Verifier}); the relying-party id and the accepted client origins
 * come from <em>static config</em> here (per-workspace custom-domain origins are a deferred
 * enhancement). The {@link #allowedOrigins} mirror the CORS allow-list shape ({@code app.cors.*}):
 * every origin a passkey ceremony may legitimately run from must be listed, so a clientDataJSON from
 * any other origin is rejected.
 */
@Component
@ConfigurationProperties(prefix = "app.webauthn")
public class WebAuthnSettings {

    /** The relying-party id — the registrable domain the credential is scoped to (no scheme/port),
     *  e.g. {@code bsmart.works} in prod or {@code localhost} in dev. Must be a suffix of every
     *  allowed origin's host. */
    private String rpId = "localhost";

    /** Human-readable relying-party name shown by the authenticator UI during registration. */
    private String rpName = "bSmart Works";

    /** Client origins a ceremony may run from (scheme + host + optional port), e.g.
     *  {@code http://localhost:5173}. A clientDataJSON whose origin is not in this set is rejected. */
    private List<String> allowedOrigins = List.of("http://localhost:5173", "http://127.0.0.1:5173");

    /** Require user verification (biometric/PIN), not just user presence, on register and assert.
     *  Default false ("preferred") so security keys without a PIN still work; set true to mandate it. */
    private boolean userVerificationRequired = false;

    /** Master switch for routing the live ceremonies through the real FIDO2 verifier (wired in WA2).
     *  In WA1 the verifier ships built + tested but the legacy signed-nonce path stays in effect, so
     *  {@code main} remains shippable; flipping this on is a later slice's concern. */
    private boolean fido2Enabled = false;

    public String getRpId() { return rpId; }
    public void setRpId(String rpId) { this.rpId = rpId; }
    public String getRpName() { return rpName; }
    public void setRpName(String rpName) { this.rpName = rpName; }
    public List<String> getAllowedOrigins() { return allowedOrigins; }
    public void setAllowedOrigins(List<String> allowedOrigins) { this.allowedOrigins = allowedOrigins; }
    public boolean isUserVerificationRequired() { return userVerificationRequired; }
    public void setUserVerificationRequired(boolean userVerificationRequired) {
        this.userVerificationRequired = userVerificationRequired;
    }
    public boolean isFido2Enabled() { return fido2Enabled; }
    public void setFido2Enabled(boolean fido2Enabled) { this.fido2Enabled = fido2Enabled; }
}
