package com.bcits.works.auth;
import com.bcits.works.auth.api.JwtUtil;
import com.bcits.works.auth.api.TokenRevocationService;
import com.bcits.works.auth.api.User;
import com.bcits.works.auth.api.UserPiiService;
import com.bcits.works.auth.api.UserRepository;

import com.bcits.works.auth.api.EmailService;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.TenantScope;

import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RateLimiter;

import com.bcits.works.shared.dto.ChangePasswordRequest;
import com.bcits.works.shared.dto.ForgotPasswordRequest;
import com.bcits.works.shared.dto.LoginRequest;
import com.bcits.works.shared.dto.ResetPasswordRequest;
import com.bcits.works.shared.dto.SignupRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    // Rate-limit budgets (per email+IP / per IP) — fail-closed (RB-10 §8).
    private static final int  LOGIN_MAX        = 10;
    private static final long LOGIN_WINDOW_S   = 60;
    private static final int  FORGOT_MAX       = 5;
    private static final long FORGOT_WINDOW_S  = 300;

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final EventService eventService;
    private final EmailService emailService;
    private final PasswordResetService passwordResetService;
    private final RateLimiter rateLimiter;
    private final UserPiiService userPii;
    private final TokenRevocationService tokenRevocation;
    private final boolean exposeDevVerificationToken;
    private final String frontendBaseUrl;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil, EventService eventService,
                          EmailService emailService, PasswordResetService passwordResetService,
                          RateLimiter rateLimiter, UserPiiService userPii,
                          TokenRevocationService tokenRevocation,
                          @Value("${app.auth.expose-dev-verification-token:false}") boolean exposeDevVerificationToken,
                          @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
        this.emailService = emailService;
        this.passwordResetService = passwordResetService;
        this.rateLimiter = rateLimiter;
        this.userPii = userPii;
        this.tokenRevocation = tokenRevocation;
        this.exposeDevVerificationToken = exposeDevVerificationToken;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest req) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): registration runs before any
        // workspace exists and looks up / writes the GLOBAL users table by email. The central tenant
        // filter must be off so a stale binding on this pooled request thread can never narrow these
        // pre-workspace reads. Audited via TenantScope's log line.
        return TenantScope.callAsSystem(() -> {
            String email = req.email().toLowerCase().trim();

            if (userPii.resolveByEmail(email).isPresent()) {
                throw ApiException.conflict("Email already in use.");
            }

            String verificationToken = UUID.randomUUID().toString().replace("-", "");

            User newUser = new User();
            newUser.setId("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            newUser.setEmail(email);
            newUser.setEmailHmac(userPii.emailHmac(email)); // blind index for tokenized login lookups (RB-40 §3)
            newUser.setFullName(req.fullName().trim());
            newUser.setPasswordHash(passwordEncoder.encode(req.password()));
            newUser.setEmailVerified(false);
            newUser.setVerificationToken(verificationToken);
            userRepository.save(newUser);
            // Dual-write name + email into the PII vault (RB-40 §3). Token is minted by @PrePersist on
            // save; the legacy columns stay authoritative until the read flag flips + CONTRACT drops them.
            userPii.syncIdentity(newUser);

            // No raw PII in events (RB-40 §3 rule 1): the aggregate/actor id identifies the subject.
            eventService.record(newUser.getId(), "USER_SIGNED_UP", newUser.getId(), "{}");

            String verifyUrl = frontendBaseUrl + "/verify?token=" + verificationToken;
            emailService.sendVerificationEmail(newUser.getEmail(), newUser.getFullName(), verifyUrl);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("requiresVerification", true);
            response.put("message", "Account created! Please check your email to verify your account.");
            if (exposeDevVerificationToken) {
                response.put("devToken", verificationToken);
            }
            return ResponseEntity.ok(response);
        });
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): email verification resolves a
        // GLOBAL user by verification token before any workspace is bound — the central tenant filter
        // must be off so the pre-workspace lookup is never narrowed by a stale binding.
        return TenantScope.callAsSystem(() -> {
            Optional<User> userOpt = userRepository.findByVerificationToken(token);
            if (userOpt.isEmpty()) {
                throw ApiException.badRequest("INVALID_TOKEN", "Invalid or expired verification token.");
            }
            User user = userOpt.get();
            user.setEmailVerified(true);
            user.setVerificationToken(null);
            userRepository.save(user);
            // No raw PII in events (RB-40 §3 rule 1) — reference the subject by id, not email.
            eventService.record(user.getId(), "EMAIL_VERIFIED", user.getId(), "{}");

            String jwt = jwtUtil.generate(user.getId(), user.getEmail());
            return ResponseEntity.ok(Map.of(
                "message", "Email verified! You are now signed in.",
                "token", jwt,
                "user", userToMap(user)
            ));
        });
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): login authenticates against the
        // GLOBAL users table by email before any workspace is selected (a user may belong to several).
        // The central tenant filter must be off so this pre-workspace identity step is never narrowed
        // by a stale binding on the pooled request thread.
        return TenantScope.callAsSystem(() -> {
            String email = req.email().toLowerCase().trim();
            rateLimit(String.format("login:%s:%s", email, clientIp(http)), LOGIN_MAX, LOGIN_WINDOW_S);

            Optional<User> userOpt = userPii.resolveByEmail(email);
            if (userOpt.isEmpty()) {
                throw ApiException.unauthorized("Invalid email or password.");
            }
            User user = userOpt.get();

            // Support both BCrypt and legacy SHA-256 hashes during migration.
            boolean valid;
            if (user.getPasswordHash().startsWith("$2a$") || user.getPasswordHash().startsWith("$2b$")) {
                valid = passwordEncoder.matches(req.password(), user.getPasswordHash());
            } else {
                valid = legacySha256(req.password()).equals(user.getPasswordHash());
                if (valid) {
                    user.setPasswordHash(passwordEncoder.encode(req.password()));
                    userRepository.save(user);
                }
            }
            if (!valid) {
                throw ApiException.unauthorized("Invalid email or password.");
            }

            if (!user.isEmailVerified()) {
                throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED",
                        "Please verify your email before signing in.");
            }

            // MFA challenge — frontend completes via /auth/mfa/verify.
            if (user.isMfaEnabled()) {
                return ResponseEntity.ok(Map.of(
                    "requiresMfa", true,
                    "userId", user.getId(),
                    "message", "Enter your authenticator app code to complete sign in."
                ));
            }

            eventService.record(user.getId(), "USER_LOGGED_IN", user.getId(), "{}");
            String jwt = jwtUtil.generate(user.getId(), user.getEmail());
            return ResponseEntity.ok(Map.of("token", jwt, "user", userToMap(user)));
        });
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req, HttpServletRequest http) {
        rateLimit("forgot:" + clientIp(http), FORGOT_MAX, FORGOT_WINDOW_S);
        // Issues a token + emails the link only if the account exists; the response is identical
        // either way so it never reveals whether an email is registered.
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): the forgot-password flow looks up
        // the GLOBAL users table by email with no workspace bound. Wrapped once here at the controller
        // boundary (not again in PasswordResetService) so the pre-workspace lookup is never narrowed.
        TenantScope.runAsSystem(() -> passwordResetService.requestReset(req.email()));
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent."));
    }

    /** Public, token-based reset (forgot-password flow) — no current password required. */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): reset resolves the user from a
        // reset token (and the GLOBAL users table) before any workspace is bound — filter must be off.
        TenantScope.runAsSystem(() -> passwordResetService.performReset(req.token(), req.newPassword()));
        return ResponseEntity.ok(Map.of("message", "Password updated. You can now sign in with your new password."));
    }

    /** Authenticated password change — requires the current password. */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        String currentUserId = authenticatedUserId();
        if (currentUserId == null) {
            throw ApiException.unauthorized("Authentication required.");
        }
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> ApiException.notFound("User", currentUserId));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Current password is incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        // Token-version revocation (W1 rate-limit/JWT PR1): changing the password invalidates every
        // token minted before the change, so a leaked/old session cannot survive a password rotation.
        tokenRevocation.revokeUserTokens(user.getId());
        eventService.record(user.getId(), "PASSWORD_CHANGED", user.getId(), "{}");
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest http) {
        // Individual-token revocation (PR2): blocklist this session's token by jti so it cannot be
        // reused after logout. Other sessions for the same user are unaffected (unlike the per-subject
        // cutoff bumped on password change). Idempotent and best-effort: always returns OK — the client
        // discards the token regardless, and a malformed/expired token is already unusable.
        String header = http.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                tokenRevocation.blocklist(jwtUtil.extractJti(token), jwtUtil.extractUserId(token),
                        "internal", jwtUtil.extractExpiration(token));
            } catch (Exception ignored) {
                // unusable token → nothing to revoke
            }
        }
        return ResponseEntity.ok(Map.of("message", "Logged out."));
    }

    // ---- helpers ----

    private void rateLimit(String key, int max, long windowSeconds) {
        if (!rateLimiter.allow(key, max, windowSeconds)) {
            throw ApiException.tooManyRequests("Too many attempts. Please wait a moment and try again.");
        }
    }

    private String clientIp(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }

    private String authenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) return null; {
        return auth.getPrincipal().toString();
        }
    }

    private String legacySha256(String password) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) { return ""; }
    }

    private Map<String, Object> userToMap(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("email", userPii.displayEmail(u));
        m.put("fullName", userPii.displayName(u));
        m.put("emailVerified", u.isEmailVerified());
        return m;
    }
}
