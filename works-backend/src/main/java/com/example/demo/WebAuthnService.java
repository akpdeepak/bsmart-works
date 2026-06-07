package com.example.demo;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Passkey / WebAuthn ceremonies (iteration 19 Cap T, RB-40 §4): registration and passwordless,
 * phishing-resistant authentication. Self-scoped — every operation acts on a single user's own
 * credentials (the user id comes from the JWT for registration, and from the begin-ceremony for
 * authentication). The cryptographic check lives in {@link WebAuthnCrypto}.
 *
 * <p>Fallback contract (RB-40 §2): passkeys are an <em>additional</em> phishing-resistant factor;
 * password + TOTP MFA remain available, so a lost authenticator never locks a user out.
 */
@Service
public class WebAuthnService {

    private static final long CHALLENGE_TTL_SECONDS = 300;

    private final WebAuthnCredentialRepository credentials;
    private final WebAuthnChallengeRepository challenges;
    private final AuditLogService auditLog;

    public WebAuthnService(WebAuthnCredentialRepository credentials,
                           WebAuthnChallengeRepository challenges,
                           AuditLogService auditLog) {
        this.credentials = credentials;
        this.challenges = challenges;
        this.auditLog = auditLog;
    }

    public List<WebAuthnCredential> list(String userId) {
        return credentials.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /** Step 1 of either ceremony: issue a fresh single-use challenge bound to the user. */
    @Transactional
    public WebAuthnChallenge begin(String userId, String ceremony) {
        challenges.deleteByUserId(userId);   // one outstanding challenge per user
        WebAuthnChallenge c = new WebAuthnChallenge();
        c.setId("WAC-" + UUID.randomUUID().toString().substring(0, 12));
        c.setUserId(userId);
        c.setChallenge(WebAuthnCrypto.newChallenge());
        c.setCeremony(ceremony);
        c.setCreatedAt(OffsetDateTime.now());
        c.setExpiresAt(OffsetDateTime.now().plusSeconds(CHALLENGE_TTL_SECONDS));
        return challenges.save(c);
    }

    /** Step 2 of registration: store the new credential after proving possession of its private key. */
    @Transactional
    public WebAuthnCredential finishRegistration(String userId, String workspaceId, String credentialId,
                                                 String publicKeyPem, String algorithm, String label,
                                                 String transports, String signature) {
        WebAuthnChallenge challenge = activeChallenge(userId, "REGISTER");
        if (!WebAuthnCrypto.verify(publicKeyPem, algorithm, challenge.getChallenge(), signature)) {
            throw ApiException.badRequest("ATTESTATION_FAILED",
                    "Could not verify the passkey — the signature did not match the challenge.");
        }
        if (credentials.findByCredentialId(credentialId).isPresent()) {
            throw ApiException.conflict("This passkey is already registered.");
        }
        WebAuthnCredential cred = new WebAuthnCredential();
        cred.setId("PK-" + UUID.randomUUID().toString().substring(0, 12));
        cred.setUserId(userId);
        cred.setWorkspaceId(workspaceId);
        cred.setCredentialId(credentialId);
        cred.setPublicKeyPem(publicKeyPem);
        cred.setAlgorithm(algorithm == null ? "ES256" : algorithm);
        cred.setLabel(label == null || label.isBlank() ? "Passkey" : label.trim());
        cred.setTransports(transports);
        cred.setSignCount(0);
        cred.setCreatedAt(OffsetDateTime.now());
        credentials.save(cred);
        challenges.delete(challenge);
        if (workspaceId != null) {
            auditLog.record(workspaceId, userId, "PASSKEY_REGISTERED", "user", userId,
                    "Registered passkey \"" + cred.getLabel() + "\"");
        }
        return cred;
    }

    /**
     * Step 2 of authentication: verify the assertion signature over the challenge. Returns the
     * credential's owner on success; the caller mints the session token. Bumps the signature
     * counter (clone detection) and last-used timestamp.
     */
    @Transactional
    public WebAuthnCredential finishAuthentication(String userId, String credentialId, String signature) {
        WebAuthnChallenge challenge = activeChallenge(userId, "AUTHENTICATE");
        WebAuthnCredential cred = credentials.findByCredentialId(credentialId)
                .orElseThrow(() -> ApiException.unauthorized("Unknown passkey."));
        if (!cred.getUserId().equals(userId)) {
            throw ApiException.unauthorized("This passkey does not belong to that account.");
        }
        if (!WebAuthnCrypto.verify(cred.getPublicKeyPem(), cred.getAlgorithm(),
                challenge.getChallenge(), signature)) {
            throw ApiException.unauthorized("Passkey verification failed.");
        }
        cred.setSignCount(cred.getSignCount() + 1);
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
}
