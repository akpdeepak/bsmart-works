package com.bcits.works.auth;

import com.bcits.works.shared.ApiException;

import com.webauthn4j.WebAuthnManager;
import com.webauthn4j.converter.AttestedCredentialDataConverter;
import com.webauthn4j.converter.util.ObjectConverter;
import com.webauthn4j.credential.CredentialRecord;
import com.webauthn4j.credential.CredentialRecordImpl;
import com.webauthn4j.data.AuthenticationData;
import com.webauthn4j.data.AuthenticationParameters;
import com.webauthn4j.data.AuthenticationRequest;
import com.webauthn4j.data.RegistrationData;
import com.webauthn4j.data.RegistrationParameters;
import com.webauthn4j.data.RegistrationRequest;
import com.webauthn4j.data.attestation.authenticator.AttestedCredentialData;
import com.webauthn4j.data.attestation.authenticator.AuthenticatorData;
import com.webauthn4j.data.attestation.statement.COSEAlgorithmIdentifier;
import com.webauthn4j.data.client.Origin;
import com.webauthn4j.data.client.challenge.DefaultChallenge;
import com.webauthn4j.server.ServerProperty;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Real WebAuthn / FIDO2 verification (RB-40 §4, EPIC-P1-webauthn-fido2), wrapping
 * {@link WebAuthnManager}. This is the production-grade replacement for {@link WebAuthnCrypto}'s
 * dependency-free signed-nonce demo: it parses the CBOR attestation object and authenticatorData,
 * and verifies the client-data origin, the rpId hash, the user-presence/verification flags, the
 * assertion signature over {@code authenticatorData || SHA-256(clientDataJSON)}, and the signature
 * counter for clone detection.
 *
 * <p>Attestation policy is <b>none/self</b> ({@link WebAuthnManager#createNonStrictWebAuthnManager()},
 * EPIC §1): we do not require an attestation trust chain or an AAGUID/MDS allow-list — appropriate
 * for first-party passkeys where the goal is phishing-resistant possession, not authenticator-model
 * attestation. Origin and rpId come from {@link WebAuthnSettings} (static config).
 *
 * <p><b>Counter persistence (the subtle part, EPIC §2):</b> webauthn4j reads the stored counter from
 * the {@link CredentialRecord} passed to {@code verify}. We persist the serialized
 * {@link AttestedCredentialData} (via {@link AttestedCredentialDataConverter}) plus a server-tracked
 * {@code sign_count}; at assertion we rebuild a {@link CredentialRecordImpl} that returns the
 * <em>persisted</em> counter, and after a successful verify the caller stores the new counter from
 * the assertion. Pure (no Spring beyond {@code @Component}, no DB), so it is unit-testable against
 * the webauthn4j-test authenticator emulator.
 */
@Component
public class WebAuthnFido2Verifier {

    private final WebAuthnSettings settings;
    private final WebAuthnManager manager;
    private final AttestedCredentialDataConverter attestedCredentialDataConverter;
    private final Set<Origin> origins;

    public WebAuthnFido2Verifier(WebAuthnSettings settings) {
        this.settings = settings;
        ObjectConverter objectConverter = new ObjectConverter();
        this.manager = WebAuthnManager.createNonStrictWebAuthnManager(objectConverter);
        this.attestedCredentialDataConverter = new AttestedCredentialDataConverter(objectConverter);
        this.origins = settings.getAllowedOrigins().stream()
                .map(Origin::new)
                .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Verify a registration ceremony's attestation and extract the durable credential material.
     *
     * @param attestationObject CBOR attestation object from {@code navigator.credentials.create()}
     * @param clientDataJSON    the client data the authenticator signed over
     * @param challenge         the raw bytes of the server challenge issued for this ceremony
     * @return the COSE credential, attestation metadata and initial counter to persist
     * @throws ApiException badRequest if attestation/origin/rpId verification fails
     */
    public RegistrationResult verifyRegistration(byte[] attestationObject, byte[] clientDataJSON,
                                                 byte[] challenge) {
        ServerProperty serverProperty =
                new ServerProperty(origins, settings.getRpId(), new DefaultChallenge(challenge));
        RegistrationData data;
        try {
            data = manager.verify(
                    new RegistrationRequest(attestationObject, clientDataJSON),
                    new RegistrationParameters(serverProperty, settings.isUserVerificationRequired(), true));
        } catch (RuntimeException e) {
            throw ApiException.badRequest("ATTESTATION_FAILED",
                    "Could not verify the passkey registration — attestation, origin or challenge did not match.");
        }
        AuthenticatorData<?> authenticatorData = data.getAttestationObject().getAuthenticatorData();
        AttestedCredentialData attested = authenticatorData.getAttestedCredentialData();
        return new RegistrationResult(
                attested.getCredentialId(),
                attestedCredentialDataConverter.convert(attested),
                String.valueOf(attested.getAaguid().getValue()),
                data.getAttestationObject().getFormat(),
                authenticatorData.getSignCount(),
                authenticatorData.isFlagUV(),
                algorithmName(attested.getCOSEKey().getAlgorithm()));
    }

    /**
     * Verify an assertion (passwordless sign-in) against a stored credential, including signature
     * and counter-regression (clone) checks.
     *
     * @param storedCoseCredential the {@code cose_credential} bytes persisted at registration
     * @param storedSignCount      the server-tracked counter from the last successful assertion
     * @param uvInitialized        whether the credential was registered with user verification
     * @param challenge            the raw bytes of the server challenge issued for this ceremony
     * @return the new signature counter to persist
     * @throws ApiException unauthorized if signature/origin/rpId/counter verification fails
     */
    public AssertionResult verifyAssertion(byte[] credentialId, byte[] userHandle,
                                           byte[] authenticatorData, byte[] clientDataJSON, byte[] signature,
                                           byte[] storedCoseCredential, long storedSignCount,
                                           boolean uvInitialized, byte[] challenge) {
        AttestedCredentialData attested = attestedCredentialDataConverter.convert(storedCoseCredential);
        CredentialRecord credentialRecord = new CredentialRecordImpl(
                null, uvInitialized, null, null, storedSignCount, attested, null, null, null, null);
        ServerProperty serverProperty =
                new ServerProperty(origins, settings.getRpId(), new DefaultChallenge(challenge));
        AuthenticationData data;
        try {
            data = manager.verify(
                    new AuthenticationRequest(credentialId, userHandle, authenticatorData, clientDataJSON, signature),
                    new AuthenticationParameters(serverProperty, credentialRecord, List.of(credentialId),
                            settings.isUserVerificationRequired(), true));
        } catch (RuntimeException e) {
            throw ApiException.unauthorized("Passkey verification failed.");
        }
        return new AssertionResult(data.getAuthenticatorData().getSignCount());
    }

    /** Best-effort human-readable label for the credential's COSE algorithm (informational column). */
    private static String algorithmName(COSEAlgorithmIdentifier alg) {
        if (COSEAlgorithmIdentifier.ES256.equals(alg)) {
            return "ES256";
        }
        if (COSEAlgorithmIdentifier.RS256.equals(alg)) {
            return "RS256";
        }
        if (COSEAlgorithmIdentifier.ES384.equals(alg)) {
            return "ES384";
        }
        if (COSEAlgorithmIdentifier.ES512.equals(alg)) {
            return "ES512";
        }
        if (COSEAlgorithmIdentifier.EdDSA.equals(alg)) {
            return "EdDSA";
        }
        return alg == null ? "ES256" : String.valueOf(alg);
    }

    /** Durable credential material extracted from a verified registration. */
    public record RegistrationResult(byte[] credentialId, byte[] coseCredential, String aaguid,
                                     String fmt, long signCount, boolean uvInitialized, String algorithm) {}

    /** Outcome of a verified assertion: the new signature counter to persist. */
    public record AssertionResult(long signCount) {}
}
