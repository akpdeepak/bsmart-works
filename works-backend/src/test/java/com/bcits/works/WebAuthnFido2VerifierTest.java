package com.bcits.works;
import com.bcits.works.auth.api.User;

import com.bcits.works.auth.WebAuthnFido2Verifier;
import com.bcits.works.auth.WebAuthnSettings;

import com.bcits.works.shared.ApiException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bcits.works.auth.WebAuthnFido2Verifier.AssertionResult;
import com.bcits.works.auth.WebAuthnFido2Verifier.RegistrationResult;
import com.webauthn4j.data.AttestationConveyancePreference;
import com.webauthn4j.data.AuthenticatorAssertionResponse;
import com.webauthn4j.data.AuthenticatorAttachment;
import com.webauthn4j.data.AuthenticatorAttestationResponse;
import com.webauthn4j.data.AuthenticatorSelectionCriteria;
import com.webauthn4j.data.PublicKeyCredential;
import com.webauthn4j.data.PublicKeyCredentialCreationOptions;
import com.webauthn4j.data.PublicKeyCredentialDescriptor;
import com.webauthn4j.data.PublicKeyCredentialParameters;
import com.webauthn4j.data.PublicKeyCredentialRequestOptions;
import com.webauthn4j.data.PublicKeyCredentialRpEntity;
import com.webauthn4j.data.PublicKeyCredentialType;
import com.webauthn4j.data.PublicKeyCredentialUserEntity;
import com.webauthn4j.data.ResidentKeyRequirement;
import com.webauthn4j.data.UserVerificationRequirement;
import com.webauthn4j.data.attestation.statement.COSEAlgorithmIdentifier;
import com.webauthn4j.data.client.Origin;
import com.webauthn4j.data.client.challenge.DefaultChallenge;
import com.webauthn4j.data.extension.client.AuthenticationExtensionClientOutput;
import com.webauthn4j.data.extension.client.RegistrationExtensionClientOutput;
import com.webauthn4j.test.EmulatorUtil;
import com.webauthn4j.test.client.ClientPlatform;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/**
 * Real WebAuthn / FIDO2 verification (RB-40 §4, EPIC-P1-webauthn-fido2). Drives the webauthn4j-test
 * authenticator emulator ({@code navigator.credentials.create/get} stand-in) through a full register
 * + assert round-trip against {@link WebAuthnFido2Verifier}, and proves it rejects a wrong origin, a
 * wrong challenge, a tampered signature, and signature-counter regression (clone detection).
 */
@Tag("unit")
class WebAuthnFido2VerifierTest {

    private static final String RP_ID = "localhost";
    private static final String ORIGIN = "http://localhost:5173";
    private static final SecureRandom RANDOM = new SecureRandom();

    private WebAuthnFido2Verifier verifier;
    private ClientPlatform client;

    @BeforeEach
    void setUp() {
        verifier = new WebAuthnFido2Verifier(settings(RP_ID, List.of(ORIGIN)));
        client = EmulatorUtil.createClientPlatform(EmulatorUtil.NONE_ATTESTATION_AUTHENTICATOR);
        client.setOrigin(new Origin(ORIGIN));
    }

    private static WebAuthnSettings settings(String rpId, List<String> origins) {
        WebAuthnSettings s = new WebAuthnSettings();
        s.setRpId(rpId);
        s.setRpName("bSmart Works");
        s.setAllowedOrigins(origins);
        s.setUserVerificationRequired(false);
        return s;
    }

    private static byte[] random(int len) {
        byte[] b = new byte[len];
        RANDOM.nextBytes(b);
        return b;
    }

    /** Run a registration ceremony on the emulator and return the raw browser credential response. */
    private PublicKeyCredential<AuthenticatorAttestationResponse, RegistrationExtensionClientOutput>
            createOnEmulator(byte[] challenge) {
        PublicKeyCredentialCreationOptions options = new PublicKeyCredentialCreationOptions(
                new PublicKeyCredentialRpEntity(RP_ID, "bSmart Works"),
                new PublicKeyCredentialUserEntity("USR-1".getBytes(StandardCharsets.UTF_8),
                        "user@bcits.com", "Test User"),
                new DefaultChallenge(challenge),
                List.of(new PublicKeyCredentialParameters(
                        PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.ES256)),
                null,
                null,
                new AuthenticatorSelectionCriteria(AuthenticatorAttachment.PLATFORM,
                        ResidentKeyRequirement.PREFERRED, UserVerificationRequirement.PREFERRED),
                AttestationConveyancePreference.NONE,
                null);
        return client.create(options);
    }

    /** Run a registration ceremony and verify it, returning the persistable result. */
    private RegistrationResult register(byte[] challenge) {
        var credential = createOnEmulator(challenge);
        return verifier.verifyRegistration(
                credential.getResponse().getAttestationObject(),
                credential.getResponse().getClientDataJSON(),
                challenge);
    }

    /** Run a single assertion ceremony for a registered credential against the emulator. */
    private PublicKeyCredential<AuthenticatorAssertionResponse, AuthenticationExtensionClientOutput>
            assertOnce(RegistrationResult reg, byte[] challenge) {
        PublicKeyCredentialRequestOptions options = new PublicKeyCredentialRequestOptions(
                new DefaultChallenge(challenge), null, RP_ID,
                List.of(new PublicKeyCredentialDescriptor(
                        PublicKeyCredentialType.PUBLIC_KEY, reg.credentialId(), null)),
                UserVerificationRequirement.PREFERRED, null);
        return client.get(options);
    }

    @Test
    void validRegistrationAndAssertionVerify() {
        RegistrationResult reg = register(random(32));

        assertThat(reg.credentialId()).isNotEmpty();
        assertThat(reg.coseCredential()).isNotEmpty();
        assertThat(reg.fmt()).isEqualTo("none");
        assertThat(reg.algorithm()).isEqualTo("ES256");

        byte[] authChallenge = random(32);
        var assertion = assertOnce(reg, authChallenge);
        AssertionResult result = verifier.verifyAssertion(
                assertion.getRawId(),
                assertion.getResponse().getUserHandle(),
                assertion.getResponse().getAuthenticatorData(),
                assertion.getResponse().getClientDataJSON(),
                assertion.getResponse().getSignature(),
                reg.coseCredential(), reg.signCount(), reg.uvInitialized(), authChallenge);

        assertThat(result.signCount()).isGreaterThanOrEqualTo(reg.signCount());
    }

    @Test
    void wrongOriginIsRejected() {
        byte[] challenge = random(32);
        var credential = createOnEmulator(challenge);

        // A verifier that only trusts a different origin must reject this clientDataJSON.
        WebAuthnFido2Verifier strict =
                new WebAuthnFido2Verifier(settings(RP_ID, List.of("https://app.bsmart.works")));
        assertThatThrownBy(() -> strict.verifyRegistration(
                credential.getResponse().getAttestationObject(),
                credential.getResponse().getClientDataJSON(), challenge))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void wrongChallengeIsRejected() {
        byte[] regChallenge = random(32);
        var credential = createOnEmulator(regChallenge);

        assertThatThrownBy(() -> verifier.verifyRegistration(
                credential.getResponse().getAttestationObject(),
                credential.getResponse().getClientDataJSON(), random(32)))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void tamperedSignatureIsRejected() {
        RegistrationResult reg = register(random(32));
        byte[] authChallenge = random(32);
        var assertion = assertOnce(reg, authChallenge);

        byte[] tampered = assertion.getResponse().getSignature().clone();
        tampered[tampered.length - 1] ^= 0x01;

        assertThatThrownBy(() -> verifier.verifyAssertion(
                assertion.getRawId(),
                assertion.getResponse().getUserHandle(),
                assertion.getResponse().getAuthenticatorData(),
                assertion.getResponse().getClientDataJSON(),
                tampered,
                reg.coseCredential(), reg.signCount(), reg.uvInitialized(), authChallenge))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void counterRegressionIsRejected() {
        RegistrationResult reg = register(random(32));
        byte[] authChallenge = random(32);
        var assertion = assertOnce(reg, authChallenge);

        // Same valid assertion, but the server already recorded a far higher counter → clone.
        // 4294967295 = max WebAuthn unsigned-32-bit counter (a realistic "already seen higher" value).
        assertThatThrownBy(() -> verifier.verifyAssertion(
                assertion.getRawId(),
                assertion.getResponse().getUserHandle(),
                assertion.getResponse().getAuthenticatorData(),
                assertion.getResponse().getClientDataJSON(),
                assertion.getResponse().getSignature(),
                reg.coseCredential(), 4294967295L, reg.uvInitialized(), authChallenge))
                .isInstanceOf(ApiException.class);
    }
}
