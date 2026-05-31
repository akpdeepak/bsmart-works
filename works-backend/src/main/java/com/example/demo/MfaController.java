package com.example.demo;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

/**
 * MFA via TOTP (RFC 6238).
 *
 * Enroll:  POST /api/v1/auth/mfa/enroll     → { otpAuthUri, secret }
 * Confirm: POST /api/v1/auth/mfa/confirm     → { totp }   (activates MFA)
 * Disable: POST /api/v1/auth/mfa/disable     → { totp }
 * Verify:  POST /api/v1/auth/mfa/verify      → { userId, totp } (called from login challenge)
 */
@RestController
@RequestMapping("/api/v1/auth/mfa")
public class MfaController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    private static final TimeBasedOneTimePasswordGenerator TOTP;
    static {
        try { TOTP = new TimeBasedOneTimePasswordGenerator(Duration.ofSeconds(30)); }
        catch (NoSuchAlgorithmException e) { throw new RuntimeException(e); }
    }

    public MfaController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    /** Step 1 — generate a TOTP secret and return the otpauth:// URI for QR scanning. */
    @PostMapping("/enroll")
    public ResponseEntity<?> enroll(@RequestHeader("X-User-Id") String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate 20-byte HMAC-SHA1 key (standard TOTP)
        byte[] secretBytes;
        try {
            KeyGenerator kg = KeyGenerator.getInstance("HmacSHA1");
            kg.init(160); // 20 bytes
            secretBytes = kg.generateKey().getEncoded();
        } catch (NoSuchAlgorithmException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Key generation failed"));
        }

        String base32Secret = base32Encode(secretBytes);
        // Store secret temporarily (not enabled until confirmed)
        user.setMfaSecret(Base64.getEncoder().encodeToString(secretBytes));
        userRepository.save(user);

        String otpAuthUri = "otpauth://totp/bSmartWorks:" + user.getEmail()
                + "?secret=" + base32Secret
                + "&issuer=bSmartWorks"
                + "&algorithm=SHA1&digits=6&period=30";

        return ResponseEntity.ok(Map.of(
            "otpAuthUri", otpAuthUri,
            "secret", base32Secret,
            "message", "Scan the QR code with your authenticator app, then confirm with a TOTP code."
        ));
    }

    /** Step 2 — confirm TOTP code to activate MFA on this account. */
    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@RequestHeader("X-User-Id") String userId,
                                     @RequestBody Map<String, String> body) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getMfaSecret() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No MFA enrollment in progress. Call /enroll first."));
        }
        String code = body.get("totp");
        if (!validateTotp(user.getMfaSecret(), code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid TOTP code."));
        }
        user.setMfaEnabled(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "MFA enabled successfully. Your account is now protected with TOTP."));
    }

    /** Disable MFA (requires valid TOTP). */
    @PostMapping("/disable")
    public ResponseEntity<?> disable(@RequestHeader("X-User-Id") String userId,
                                     @RequestBody Map<String, String> body) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.isMfaEnabled()) {
            return ResponseEntity.badRequest().body(Map.of("error", "MFA is not enabled."));
        }
        if (!validateTotp(user.getMfaSecret(), body.get("totp"))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid TOTP code."));
        }
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "MFA disabled."));
    }

    /**
     * Called after password-correct login when mfaEnabled=true.
     * Returns a full JWT if the TOTP is valid.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyMfa(@RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        String code   = body.get("totp");
        if (userId == null || code == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId and totp are required."));
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!user.isMfaEnabled()) {
            return ResponseEntity.badRequest().body(Map.of("error", "MFA not enabled for this user."));
        }
        if (!validateTotp(user.getMfaSecret(), code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid TOTP code."));
        }
        String token = jwtUtil.generate(user.getId(), user.getEmail());
        return ResponseEntity.ok(Map.of(
            "token", token,
            "user", Map.of("id", user.getId(), "email", user.getEmail(), "fullName", user.getFullName())
        ));
    }

    // ---- helpers ----

    private boolean validateTotp(String base64Secret, String code) {
        if (base64Secret == null || code == null || code.length() != 6) return false;
        try {
            byte[] keyBytes = Base64.getDecoder().decode(base64Secret);
            SecretKey key   = new SecretKeySpec(keyBytes, "HmacSHA1");
            Instant now     = Instant.now();
            // Accept current window and one window back/forward for clock skew
            for (int drift = -1; drift <= 1; drift++) {
                Instant t = now.plus(Duration.ofSeconds(30L * drift));
                int expected = TOTP.generateOneTimePassword(key, t);
                if (String.format("%06d", expected).equals(code)) return true;
            }
            return false;
        } catch (InvalidKeyException e) { return false; }
    }

    /** Minimal Base32 encoder (RFC 4648, no padding). */
    private static String base32Encode(byte[] data) {
        final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        StringBuilder sb = new StringBuilder();
        int buffer = 0, bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                bitsLeft -= 5;
                sb.append(ALPHABET.charAt((buffer >> bitsLeft) & 31));
            }
        }
        if (bitsLeft > 0) sb.append(ALPHABET.charAt((buffer << (5 - bitsLeft)) & 31));
        return sb.toString();
    }
}
