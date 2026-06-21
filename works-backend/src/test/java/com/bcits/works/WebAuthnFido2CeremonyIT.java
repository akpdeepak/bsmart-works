package com.bcits.works;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bcits.works.dto.PasskeyAuthFinishRequest;
import com.bcits.works.dto.PasskeyRegisterRequest;
import com.webauthn4j.data.AttestationConveyancePreference;
import com.webauthn4j.data.AuthenticatorAttachment;
import com.webauthn4j.data.AuthenticatorSelectionCriteria;
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
import com.webauthn4j.test.EmulatorUtil;
import com.webauthn4j.test.client.ClientPlatform;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * End-to-end WebAuthn/FIDO2 ceremony coverage (RB-40 §4, EPIC-P1-webauthn-fido2 WA2) with
 * {@code app.webauthn.fido2-enabled=true}, against a real Postgres. Drives the webauthn4j-test
 * authenticator emulator through {@link WebAuthnService#finishRegistration}/{@code finishAuthentication}
 * so the whole wired path is exercised: a real attestation is verified and a COSE credential is
 * persisted, then a real assertion against that stored credential signs the user in and advances the
 * counter. Also proves the FIDO2 path rejects a legacy (non-COSE) credential.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
@TestPropertySource(properties = {
        "app.webauthn.rp-id=localhost",
        "app.webauthn.allowed-origins=http://localhost:5173"
})
class WebAuthnFido2CeremonyIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    private static final String USER_ID = "USR-FIDO-IT";
    private static final String RP_ID = "localhost";
    private static final String ORIGIN = "http://localhost:5173";
    private static final Base64.Decoder B64URL_DEC = Base64.getUrlDecoder();
    private static final Base64.Encoder B64URL_ENC = Base64.getUrlEncoder().withoutPadding();

    @Autowired
    WebAuthnService webAuthn;

    @Autowired
    WebAuthnCredentialRepository credentials;

    private ClientPlatform emulator() {
        ClientPlatform client = EmulatorUtil.createClientPlatform(EmulatorUtil.NONE_ATTESTATION_AUTHENTICATOR);
        client.setOrigin(new Origin(ORIGIN));
        return client;
    }

    @Test
    void registersAndAuthenticatesViaFido2() {
        ClientPlatform client = emulator();

        // ── Registration ──────────────────────────────────────────────────────────────────────
        WebAuthnChallenge regChallenge = webAuthn.begin(USER_ID, "REGISTER");
        var creationOptions = new PublicKeyCredentialCreationOptions(
                new PublicKeyCredentialRpEntity(RP_ID, "bSmart Works"),
                new PublicKeyCredentialUserEntity(USER_ID.getBytes(StandardCharsets.UTF_8),
                        "fido-it@bcits.com", "FIDO IT"),
                new DefaultChallenge(B64URL_DEC.decode(regChallenge.getChallenge())),
                List.of(new PublicKeyCredentialParameters(
                        PublicKeyCredentialType.PUBLIC_KEY, COSEAlgorithmIdentifier.ES256)),
                null, null,
                new AuthenticatorSelectionCriteria(AuthenticatorAttachment.PLATFORM,
                        ResidentKeyRequirement.PREFERRED, UserVerificationRequirement.PREFERRED),
                AttestationConveyancePreference.NONE, null);
        var created = client.create(creationOptions);

        PasskeyRegisterRequest registerReq = new PasskeyRegisterRequest(
                B64URL_ENC.encodeToString(created.getResponse().getAttestationObject()),
                B64URL_ENC.encodeToString(created.getResponse().getClientDataJSON()),
                "My Laptop", "internal", null);
        WebAuthnCredential saved = webAuthn.finishRegistration(USER_ID, registerReq);

        assertThat(saved.getCoseCredential()).isNotEmpty();
        assertThat(saved.getPublicKeyPem()).isNull();
        assertThat(saved.getFmt()).isEqualTo("none");
        assertThat(credentials.findByCredentialId(saved.getCredentialId())).isPresent();
        long counterAfterRegister = saved.getSignCount();

        // ── Authentication ────────────────────────────────────────────────────────────────────
        WebAuthnChallenge authChallenge = webAuthn.begin(USER_ID, "AUTHENTICATE");
        var requestOptions = new PublicKeyCredentialRequestOptions(
                new DefaultChallenge(B64URL_DEC.decode(authChallenge.getChallenge())), null, RP_ID,
                List.of(new PublicKeyCredentialDescriptor(PublicKeyCredentialType.PUBLIC_KEY,
                        B64URL_DEC.decode(saved.getCredentialId()), null)),
                UserVerificationRequirement.PREFERRED, null);
        var assertion = client.get(requestOptions);

        byte[] userHandle = assertion.getResponse().getUserHandle();
        PasskeyAuthFinishRequest authReq = new PasskeyAuthFinishRequest(
                USER_ID,
                B64URL_ENC.encodeToString(assertion.getRawId()),
                B64URL_ENC.encodeToString(assertion.getResponse().getSignature()),
                B64URL_ENC.encodeToString(assertion.getResponse().getAuthenticatorData()),
                B64URL_ENC.encodeToString(assertion.getResponse().getClientDataJSON()),
                userHandle == null ? null : B64URL_ENC.encodeToString(userHandle));
        WebAuthnCredential authed = webAuthn.finishAuthentication(authReq);

        assertThat(authed.getId()).isEqualTo(saved.getId());
        assertThat(authed.getLastUsedAt()).isNotNull();
        assertThat(authed.getSignCount()).isGreaterThanOrEqualTo(counterAfterRegister);
    }

    @Test
    void fido2AssertionRejectsLegacyCredential() {
        // A legacy (signed-nonce) credential has no COSE key, so the FIDO2 assertion path must refuse it.
        WebAuthnCredential legacy = new WebAuthnCredential();
        legacy.setId("PK-legacy-it");
        legacy.setUserId(USER_ID);
        legacy.setCredentialId("legacy-cred-" + System.nanoTime());
        legacy.setPublicKeyPem("-----BEGIN PUBLIC KEY-----\nstub\n-----END PUBLIC KEY-----");
        legacy.setAlgorithm("ES256");
        legacy.setSignCount(0);
        legacy.setLabel("Legacy");
        legacy.setCreatedAt(java.time.OffsetDateTime.now());
        credentials.save(legacy);

        webAuthn.begin(USER_ID, "AUTHENTICATE");
        PasskeyAuthFinishRequest req = new PasskeyAuthFinishRequest(
                USER_ID, legacy.getCredentialId(), "sig", "authData", "clientData", null);

        assertThatThrownBy(() -> webAuthn.finishAuthentication(req))
                .isInstanceOf(ApiException.class);
    }
}
