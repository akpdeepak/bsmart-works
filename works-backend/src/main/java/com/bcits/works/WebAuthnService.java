package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.dto.PasskeyAuthFinishRequest;
import com.bcits.works.shared.dto.PasskeyRegisterRequest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Passkey / WebAuthn ceremonies (iteration 19 Cap T, RB-40 §4): registration and passwordless,
 * phishing-resistant authentication via real FIDO2 ({@link WebAuthnFido2Verifier}). Self-scoped —
 * every operation acts on a single user's own credentials (the user id comes from the JWT for
 * registration, and from the begin-ceremony for authentication).
 *
 * <p>The cryptographic check (CBOR attestation/assertion, origin + rpId binding, signature and the
 * signature counter) lives in {@link WebAuthnFido2Verifier}. This service owns the ceremony state:
 * issuing the single-use challenge, persisting the verified COSE credential, and advancing the
 * server-tracked counter.
 *
 * <p>Fallback contract (RB-40 §2): passkeys are an <em>additional</em> phishing-resistant factor;
 * password + TOTP MFA remain available, so a lost authenticator never locks a user out.
 */
@Service
public class WebAuthnService {

    private static final long CHALLENGE_TTL_SECONDS = 300;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Decoder B64URL_DECODER = Base64.getUrlDecoder();
    private static final Base64.Encoder B64URL_ENCODER = Base64.getUrlEncoder().withoutPadding();

    private final WebAuthnCredentialRepository credentials;
    private final WebAuthnChallengeRepository challenges;
    private final SecurityAuditLogService auditLog;
    private final WebAuthnFido2Verifier fido2Verifier;

    public WebAuthnService(WebAuthnCredentialRepository credentials,
                           WebAuthnChallengeRepository challenges,
                           SecurityAuditLogService auditLog,
                           WebAuthnFido2Verifier fido2Verifier) {
        this.credentials = credentials;
        this.challenges = challenges;
        this.auditLog = auditLog;
        this.fido2Verifier = fido2Verifier;
    }

    public List<WebAuthnCredential> list(String userId) {
        return credentials.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /** The stable WebAuthn {@code user.id} handle for a user (base64url of the user id). */
    public String userHandle(String userId) {
        return B64URL_ENCODER.encodeToString(userId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /** Step 1 of either ceremony: issue a fresh single-use challenge bound to the user. */
    @Transactional
    public WebAuthnChallenge begin(String userId, String ceremony) {
        challenges.deleteByUserId(userId);   // one outstanding challenge per user
        WebAuthnChallenge c = new WebAuthnChallenge();
        c.setId("WAC-" + UUID.randomUUID().toString().substring(0, 12));
        c.setUserId(userId);
        c.setChallenge(newChallenge());
        c.setCeremony(ceremony);
        c.setCreatedAt(OffsetDateTime.now());
        c.setExpiresAt(OffsetDateTime.now().plusSeconds(CHALLENGE_TTL_SECONDS));
        return challenges.save(c);
    }

    /** Step 2 of registration: store the new credential after verifying its attestation. */
    @Transactional
    public WebAuthnCredential finishRegistration(String userId, PasskeyRegisterRequest req) {
        WebAuthnChallenge challenge = activeChallenge(userId, "REGISTER");
        if (isBlank(req.attestationObject()) || isBlank(req.clientDataJSON())) {
            throw ApiException.badRequest("INVALID_REQUEST",
                    "attestationObject and clientDataJSON are required.");
        }
        WebAuthnFido2Verifier.RegistrationResult result = fido2Verifier.verifyRegistration(
                decode(req.attestationObject()), decode(req.clientDataJSON()),
                decode(challenge.getChallenge()));

        WebAuthnCredential cred = new WebAuthnCredential();
        cred.setId("PK-" + UUID.randomUUID().toString().substring(0, 12));
        cred.setUserId(userId);
        cred.setWorkspaceId(req.workspaceId());
        cred.setLabel(req.label() == null || req.label().isBlank() ? "Passkey" : req.label().trim());
        cred.setTransports(req.transports());
        cred.setCreatedAt(OffsetDateTime.now());
        cred.setCredentialId(B64URL_ENCODER.encodeToString(result.credentialId()));
        cred.setCoseCredential(result.coseCredential());
        cred.setAaguid(result.aaguid());
        cred.setFmt(result.fmt());
        cred.setAlgorithm(result.algorithm());
        cred.setSignCount(result.signCount());
        cred.setUvInitialized(result.uvInitialized());
        cred.setUserHandle(userHandle(userId));

        if (credentials.findByCredentialId(cred.getCredentialId()).isPresent()) {
            throw ApiException.conflict("This passkey is already registered.");
        }
        credentials.save(cred);
        challenges.delete(challenge);
        if (req.workspaceId() != null) {
            auditLog.record(req.workspaceId(), userId, "PASSKEY_REGISTERED", "user", userId,
                    "Registered passkey \"" + cred.getLabel() + "\"");
        }
        return cred;
    }

    /**
     * Step 2 of authentication: verify the assertion over the challenge. Returns the credential's
     * owner on success; the caller mints the session token. Advances the server-tracked signature
     * counter (clone detection) and last-used timestamp.
     */
    @Transactional
    public WebAuthnCredential finishAuthentication(PasskeyAuthFinishRequest req) {
        WebAuthnChallenge challenge = activeChallenge(req.userId(), "AUTHENTICATE");
        WebAuthnCredential cred = credentials.findByCredentialId(req.credentialId())
                .orElseThrow(() -> ApiException.unauthorized("Unknown passkey."));
        if (!cred.getUserId().equals(req.userId())) {
            throw ApiException.unauthorized("This passkey does not belong to that account.");
        }
        if (cred.getCoseCredential() == null) {
            // A pre-cutover (signed-nonce) credential has no COSE key and cannot be asserted; re-register it.
            throw ApiException.unauthorized("This passkey must be re-registered.");
        }
        WebAuthnFido2Verifier.AssertionResult result = fido2Verifier.verifyAssertion(
                decode(req.credentialId()),
                isBlank(req.userHandle()) ? null : decode(req.userHandle()),
                decode(req.authenticatorData()),
                decode(req.clientDataJSON()),
                decode(req.signature()),
                cred.getCoseCredential(),
                cred.getSignCount(),
                cred.isUvInitialized(),
                decode(challenge.getChallenge()));
        cred.setSignCount(result.signCount());
        cred.setLastUsedAt(OffsetDateTime.now());
        credentials.save(cred);
        challenges.delete(challenge);
        return cred;
    }

    @Transactional
    public void delete(String userId, String credentialPk) {
        WebAuthnCredential cred = credentials.findById(credentialPk)
                .orElseThrow(() -> ApiException.notFound("Passkey", credentialPk));
        if (!cred.getUserId().equals(userId)) {
            throw ApiException.forbidden("You can only remove your own passkeys.");
        }
        credentials.delete(cred);
    }

    private WebAuthnChallenge activeChallenge(String userId, String ceremony) {
        WebAuthnChallenge c = challenges
                .findFirstByUserIdAndCeremonyOrderByCreatedAtDesc(userId, ceremony)
                .orElseThrow(() -> ApiException.badRequest("NO_CHALLENGE",
                        "No active passkey challenge — start the ceremony first."));
        if (c.getExpiresAt().isBefore(OffsetDateTime.now())) {
            challenges.delete(c);
            throw ApiException.badRequest("CHALLENGE_EXPIRED", "The passkey challenge expired. Try again.");
        }
        return c;
    }

    /** A fresh 32-byte, single-use challenge, base64url-encoded for the client. */
    private static String newChallenge() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return B64URL_ENCODER.encodeToString(bytes);
    }

    /** Decode a base64url value (the client and our challenges are base64url-without-padding). */
    private static byte[] decode(String b64url) {
        return B64URL_DECODER.decode(b64url);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
