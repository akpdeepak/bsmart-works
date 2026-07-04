package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Forgot-password flow: issue a single-use, time-boxed token and consume it to set a new password
 * without requiring the (forgotten) current password. Backed by the password_reset_tokens table
 * (V4). The pure helpers (token generation, expiry, usability) are unit-tested; orchestration wires
 * the repositories + email.
 */
@Service
public class PasswordResetService {

    /** Reset links are valid for 60 minutes. */
    public static final Duration TOKEN_TTL = Duration.ofMinutes(60);

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final EventService eventService;
    private final TokenRevocationService tokenRevocation;
    private final String frontendBaseUrl;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                EmailService emailService,
                                EventService eventService,
                                TokenRevocationService tokenRevocation,
                                @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.eventService = eventService;
        this.tokenRevocation = tokenRevocation;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    // ---- pure, unit-tested helpers ----

    public String newToken() {
        return UUID.randomUUID().toString().replace("-", "")
             + UUID.randomUUID().toString().replace("-", "");
    }

    public OffsetDateTime expiryFrom(OffsetDateTime now) {
        return now.plus(TOKEN_TTL);
    }

    /** A token can be consumed iff it exists, is unused, and has not expired. */
    public boolean isUsable(PasswordResetToken token, OffsetDateTime now) {
        return token != null && !token.isUsed() && token.getExpiresAt().isAfter(now);
    }

    // ---- orchestration ----

    /**
     * Issue a reset token and email the link. Silent no-op when the email is unknown — the caller
     * always returns the same neutral response, so this never reveals whether an account exists.
     */
    public void requestReset(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.toLowerCase().trim();
        userRepository.findByEmail(email).ifPresent(user -> {
            tokenRepository.invalidateActiveForUser(user.getId());

            PasswordResetToken prt = new PasswordResetToken();
            prt.setToken(newToken());
            prt.setUserId(user.getId());
            prt.setExpiresAt(expiryFrom(OffsetDateTime.now()));
            prt.setUsed(false);
            tokenRepository.save(prt);

            String resetUrl = frontendBaseUrl + "/reset-password?token=" + prt.getToken();
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetUrl);
            eventService.record(user.getId(), "PASSWORD_RESET_REQUESTED", user.getId(), "{}");
        });
    }

    /** Consume a token and set the new password. Throws ApiException on an unusable token. */
    public void performReset(String token, String newPassword) {
        PasswordResetToken prt = tokenRepository.findById(token).orElse(null);
        if (!isUsable(prt, OffsetDateTime.now())) {
            throw ApiException.badRequest("INVALID_TOKEN",
                    "This reset link is invalid or has expired. Please request a new one.");
        }
        User user = userRepository.findById(prt.getUserId())
                .orElseThrow(() -> ApiException.badRequest("INVALID_TOKEN",
                        "This reset link is no longer valid."));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        // Token-version revocation (W1 rate-limit/JWT PR1): a forgotten-password reset must invalidate
        // any token an attacker may hold — the whole point of resetting a compromised credential.
        tokenRevocation.revokeUserTokens(user.getId());

        prt.setUsed(true);
        tokenRepository.save(prt);

        eventService.record(user.getId(), "PASSWORD_RESET", user.getId(), "{}");
    }
}
