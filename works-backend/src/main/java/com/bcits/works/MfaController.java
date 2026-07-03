package com.bcits.works;

import com.bcits.works.shared.TenantScope;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.dto.MfaCodeRequest;
import com.bcits.works.shared.dto.MfaVerifyRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

import java.time.Instant;
import java.util.Map;

/**
 * MFA via TOTP (RFC 6238).
 *
 * Enroll/confirm/disable operate on the *authenticated* user — the identity is taken from the JWT
 * principal, never from a client-supplied header, so a caller can only manage their own MFA.
 * Verify runs during the login challenge (pre-auth), so it carries the userId in the body.
 */
@RestController
@RequestMapping("/api/v1/auth/mfa")
public class MfaController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final MfaService mfaService;
    private final AuthenticatedUser authenticatedUser;

    public MfaController(UserRepository userRepository, JwtUtil jwtUtil,
                         MfaService mfaService, AuthenticatedUser authenticatedUser) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.mfaService = mfaService;
        this.authenticatedUser = authenticatedUser;
    }

    @PostMapping("/enroll")
    public ResponseEntity<?> enroll() {
        User user = currentUser();

        String base64Secret = mfaService.generateBase64Secret();
        user.setMfaSecret(base64Secret);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
            "otpAuthUri", mfaService.otpAuthUri(user.getEmail(), base64Secret),
            "secret", mfaService.base32FromBase64(base64Secret),
            "message", "Scan the QR code with your authenticator app, then confirm with a TOTP code."
        ));
    }

    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@Valid @RequestBody MfaCodeRequest body) {
        User user = currentUser();
        if (user.getMfaSecret() == null) {
            throw ApiException.badRequest("MFA_NOT_ENROLLED", "No MFA enrollment in progress. Call /enroll first.");
        }
        if (!mfaService.validateTotp(user.getMfaSecret(), body.totp(), Instant.now())) {
            throw ApiException.unauthorized("Invalid TOTP code.");
        }
        user.setMfaEnabled(true);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "MFA enabled successfully. Your account is now protected with TOTP."));
    }

    @PostMapping("/disable")
    public ResponseEntity<?> disable(@Valid @RequestBody MfaCodeRequest body) {
        User user = currentUser();
        if (!user.isMfaEnabled()) {
            throw ApiException.badRequest("MFA_NOT_ENABLED", "MFA is not enabled.");
        }
        if (!mfaService.validateTotp(user.getMfaSecret(), body.totp(), Instant.now())) {
            throw ApiException.unauthorized("Invalid TOTP code.");
        }
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "MFA disabled."));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyMfa(@Valid @RequestBody MfaVerifyRequest body) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): the login-time MFA verify is a
        // pre-session step (permitAll) that completes the handshake by GLOBAL user id before any
        // workspace is selected — the central tenant filter must be off so a stale binding on this
        // pooled thread can never narrow the lookup. Enroll/confirm/disable above are authenticated,
        // post-workspace operations and are intentionally NOT wrapped.
        return TenantScope.callAsSystem(() -> {
            User user = userRepository.findById(body.userId())
                    .orElseThrow(() -> ApiException.notFound("User", body.userId()));
            if (!user.isMfaEnabled()) {
                throw ApiException.badRequest("MFA_NOT_ENABLED", "MFA not enabled for this user.");
            }
            if (!mfaService.validateTotp(user.getMfaSecret(), body.totp(), Instant.now())) {
                throw ApiException.unauthorized("Invalid TOTP code.");
            }
            String token = jwtUtil.generate(user.getId(), user.getEmail());
            return ResponseEntity.ok(Map.of(
                "token", token,
                "user", Map.of("id", user.getId(), "email", user.getEmail(), "fullName", user.getFullName())
            ));
        });
    }

    private User currentUser() {
        String userId = authenticatedUser.id();
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User", userId));
    }
}
