package com.bcits.works.auth;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import org.springframework.stereotype.Service;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * TOTP (RFC 6238) logic for MFA, extracted from the controller so it is unit-testable in isolation
 * and the controller stays thin (CLAUDE.md §2 — one job per layer). 30-second window, 6 digits,
 * HMAC-SHA1, ±1 step drift tolerance.
 */
@Service
public class MfaService {

    private static final TimeBasedOneTimePasswordGenerator TOTP =
            new TimeBasedOneTimePasswordGenerator(Duration.ofSeconds(30));
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    /** Generate a fresh 160-bit secret, returned Base64-encoded for storage. */
    public String generateBase64Secret() {
        try {
            KeyGenerator kg = KeyGenerator.getInstance("HmacSHA1");
            kg.init(160);
            return Base64.getEncoder().encodeToString(kg.generateKey().getEncoded());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("TOTP key generation failed", e);
        }
    }

    /** otpauth:// URI for authenticator-app enrollment (QR code). */
    public String otpAuthUri(String email, String base64Secret) {
        return String.format("otpauth://totp/bSmartWorks:%s?secret=%s&issuer=bSmartWorks&algorithm=SHA1&digits=6&period=30",
                email, base32FromBase64(base64Secret));
    }

    /** The base32 secret a user types into their authenticator app. */
    public String base32FromBase64(String base64Secret) {
        return base32Encode(Base64.getDecoder().decode(base64Secret));
    }

    /** Validate a code against the secret, allowing ±1 time-step of clock drift. */
    public boolean validateTotp(String base64Secret, String code, Instant now) {
        if (base64Secret == null || code == null || code.length() != 6) return false;
        try {
            SecretKey key = new SecretKeySpec(Base64.getDecoder().decode(base64Secret), "HmacSHA1");
            for (int drift = -1; drift <= 1; drift++) {
                Instant t = now.plus(Duration.ofSeconds(30L * drift));
                if (codeAt(key, t).equals(code)) return true;
            }
            return false;
        } catch (InvalidKeyException | IllegalArgumentException e) {
            return false;
        }
    }

    /** The current valid code for a secret — used by tests and never exposed over HTTP. */
    public String currentCode(String base64Secret, Instant now) {
        try {
            SecretKey key = new SecretKeySpec(Base64.getDecoder().decode(base64Secret), "HmacSHA1");
            return codeAt(key, now);
        } catch (InvalidKeyException e) {
            throw new IllegalStateException("Invalid TOTP secret", e);
        }
    }

    private String codeAt(SecretKey key, Instant t) throws InvalidKeyException {
        return String.format("%06d", TOTP.generateOneTimePassword(key, t));
    }

    private static String base32Encode(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0, bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                bitsLeft -= 5;
                sb.append(BASE32_ALPHABET.charAt((buffer >> bitsLeft) & 31));
            }
        }
        if (bitsLeft > 0) sb.append(BASE32_ALPHABET.charAt((buffer << (5 - bitsLeft)) & 31)); {
        return sb.toString();
        }
    }
}
