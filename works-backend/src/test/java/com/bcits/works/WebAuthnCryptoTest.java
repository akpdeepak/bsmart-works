package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The passkey challenge–response crypto (iteration 19 Cap T, RB-40 §4). Generates a real EC P-256
 * key pair, signs a server challenge with the private key, and proves the server verifies it with
 * only the public key — and rejects tampering, the wrong key, and malformed input.
 */
@Tag("unit")
class WebAuthnCryptoTest {

    private static final Base64.Encoder B64URL = Base64.getUrlEncoder().withoutPadding();

    private KeyPair ecKeyPair() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        return kpg.generateKeyPair();
    }

    private String pem(KeyPair kp) {
        return "-----BEGIN PUBLIC KEY-----\n"
                + Base64.getEncoder().encodeToString(kp.getPublic().getEncoded())
                + "\n-----END PUBLIC KEY-----";
    }

    private String sign(KeyPair kp, String challenge) throws Exception {
        Signature sig = Signature.getInstance("SHA256withECDSA");
        sig.initSign(kp.getPrivate());
        sig.update(challenge.getBytes(StandardCharsets.UTF_8));
        return B64URL.encodeToString(sig.sign());
    }

    @Test
    void newChallengeIsFreshAndDecodable() {
        String a = WebAuthnCrypto.newChallenge();
        String b = WebAuthnCrypto.newChallenge();
        assertThat(a).isNotEqualTo(b);
        assertThat(Base64.getUrlDecoder().decode(a)).hasSize(32);
    }

    @Test
    void validSignatureVerifies() throws Exception {
        KeyPair kp = ecKeyPair();
        String challenge = WebAuthnCrypto.newChallenge();
        String signature = sign(kp, challenge);

        assertThat(WebAuthnCrypto.verify(pem(kp), "ES256", challenge, signature)).isTrue();
    }

    @Test
    void wrongChallengeFailsVerification() throws Exception {
        KeyPair kp = ecKeyPair();
        String signature = sign(kp, WebAuthnCrypto.newChallenge());

        assertThat(WebAuthnCrypto.verify(pem(kp), "ES256", WebAuthnCrypto.newChallenge(), signature))
                .isFalse();
    }

    @Test
    void differentKeyFailsVerification() throws Exception {
        KeyPair signer = ecKeyPair();
        KeyPair other = ecKeyPair();
        String challenge = WebAuthnCrypto.newChallenge();
        String signature = sign(signer, challenge);

        assertThat(WebAuthnCrypto.verify(pem(other), "ES256", challenge, signature)).isFalse();
    }

    @Test
    void malformedInputsReturnFalseNotThrow() {
        assertThat(WebAuthnCrypto.verify(null, "ES256", "c", "s")).isFalse();
        assertThat(WebAuthnCrypto.verify("not-a-key", "ES256", "c", "s")).isFalse();
        assertThat(WebAuthnCrypto.verify("not-a-key", "ES256", "c", null)).isFalse();
    }

    @Test
    void algorithmMapping() {
        assertThat(WebAuthnCrypto.signatureAlgorithm("ES256")).isEqualTo("SHA256withECDSA");
        assertThat(WebAuthnCrypto.signatureAlgorithm("RS256")).isEqualTo("SHA256withRSA");
        assertThat(WebAuthnCrypto.signatureAlgorithm(null)).isEqualTo("SHA256withECDSA");
    }
}
