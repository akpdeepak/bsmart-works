package com.bcits.works;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * The asymmetric challenge–response at the heart of passkeys / WebAuthn (RB-40 §4; iteration 19
 * Cap T). The authenticator holds a private key that never leaves the device; the server stores
 * only the public key and verifies that a fresh, single-use server challenge was signed by it.
 * Because the signature is bound to a server nonce (and, in a full FIDO2 stack, to the origin via
 * clientDataJSON), credentials can't be phished or replayed.
 *
 * <p>This is a deliberately bounded, dependency-free implementation: it verifies an ES256
 * (SHA256withECDSA) or RS256 (SHA256withRSA) signature over the server challenge, with the public
 * key supplied as SPKI/PEM. A production hardening pass swaps this for a full WebAuthn library that
 * also parses CBOR attestation objects and authenticatorData (TECH-DEBT) — the stored-credential
 * model and ceremony API stay the same. Pure (no Spring/DB), so it is unit-testable (RB-10 §2).
 */
public final class WebAuthnCrypto {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder B64URL = Base64.getUrlEncoder().withoutPadding();

    private WebAuthnCrypto() {}

    /** A fresh 32-byte, single-use challenge, base64url-encoded for the client. */
    public static String newChallenge() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return B64URL.encodeToString(bytes);
    }

    /** Map a COSE/JOSE algorithm name to its JCA Signature algorithm. */
    static String signatureAlgorithm(String algorithm) {
        String a = algorithm == null ? "ES256" : algorithm.trim().toUpperCase();
        return switch (a) {
            case "RS256" -> "SHA256withRSA";
            case "ES256" -> "SHA256withECDSA";
            default -> throw ApiException.badRequest("UNSUPPORTED_ALG",
                    "Unsupported passkey algorithm: " + algorithm + " (expected ES256 or RS256).");
        };
    }

    static String keyFactoryAlgorithm(String algorithm) {
        String a = algorithm == null ? "ES256" : algorithm.trim().toUpperCase();
        return a.equals("RS256") ? "RSA" : "EC";
    }

    /** Parse an SPKI/PEM public key (strips the PEM armour if present). */
    public static PublicKey parsePublicKey(String pem, String algorithm) {
        try {
            String base64 = pem
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] der = Base64.getDecoder().decode(base64);
            KeyFactory kf = KeyFactory.getInstance(keyFactoryAlgorithm(algorithm));
            return kf.generatePublic(new X509EncodedKeySpec(der));
        } catch (Exception e) {
            throw ApiException.badRequest("INVALID_PUBLIC_KEY",
                    "Could not parse the passkey public key.");
        }
    }

    /**
     * Verify that {@code signatureB64Url} is a valid signature, by the key in {@code publicKeyPem},
     * over the UTF-8 bytes of {@code challenge}. Returns false on any malformed input rather than
     * throwing, so a bad assertion is an auth failure, not a 500.
     */
    public static boolean verify(String publicKeyPem, String algorithm, String challenge,
                                 String signatureB64Url) {
        if (publicKeyPem == null || challenge == null || signatureB64Url == null) {
            return false;
        }
        try {
            PublicKey key = parsePublicKey(publicKeyPem, algorithm);
            Signature sig = Signature.getInstance(signatureAlgorithm(algorithm));
            sig.initVerify(key);
            sig.update(challenge.getBytes(StandardCharsets.UTF_8));
            byte[] signature = Base64.getUrlDecoder().decode(padToBase64Url(signatureB64Url));
            return sig.verify(signature);
        } catch (ApiException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private static String padToBase64Url(String s) {
        int rem = s.length() % 4;
        return rem == 0 ? s : s + "====".substring(rem);
    }
}
