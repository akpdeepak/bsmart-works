package com.bcits.works;

import com.bcits.works.dto.ChangePasswordRequest;
import com.bcits.works.dto.ForgotPasswordRequest;
import com.bcits.works.dto.LoginRequest;
import com.bcits.works.dto.ResetPasswordRequest;
import com.bcits.works.dto.SignupRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.*;

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
    private final boolean exposeDevVerificationToken;
    private final String frontendBaseUrl;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil, EventService eventService,
                          EmailService emailService, PasswordResetService passwordResetService,
                          RateLimiter rateLimiter,
                          @Value("${app.auth.expose-dev-verification-token:false}") boolean exposeDevVerificationToken,
                          @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
        this.emailService = emailService;
        this.passwordResetService = passwordResetService;
        this.rateLimiter = rateLimiter;
        this.exposeDevVerificationToken = exposeDevVerificationToken;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest req) {
        String email = req.email().toLowerCase().trim();

        if (userRepository.findByEmail(email).isPresent()) {
            throw ApiException.conflict("Email already in use.");
        }

        String verificationToken = UUID.randomUUID().toString().replace("-", "");

        User newUser = new User();
        newUser.setId("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        newUser.setEmail(email);
        newUser.setFullName(req.fullName().trim());
        newUser.setPasswordHash(passwordEncoder.encode(req.password()));
        newUser.setEmailVerified(false);
        newUser.setVerificationToken(verificationToken);
        userRepository.save(newUser);

        eventService.record(newUser.getId(), "USER_SIGNED_UP", newUser.getId(),
                "{\"email\":\"" + newUser.getEmail() + "\"}");

        String verifyUrl = frontendBaseUrl + "/verify?token=" + verificationToken;
        emailService.sendVerificationEmail(newUser.getEmail(), newUser.getFullName(), verifyUrl);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("requiresVerification", true);
        response.put("message", "Account created! Please check your email to verify your account.");
        if (exposeDevVerificationToken) {
            response.put("devToken", verificationToken);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        Optional<User> userOpt = userRepository.findByVerificationToken(token);
        if (userOpt.isEmpty()) {
            throw ApiException.badRequest("INVALID_TOKEN", "Invalid or expired verification token.");
        }
        User user = userOpt.get();
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);
        eventService.record(user.getId(), "EMAIL_VERIFIED", user.getId(),
                "{\"email\":\"" + user.getEmail() + "\"}");

        String jwt = jwtUtil.generate(user.getId(), user.getEmail());
        return ResponseEntity.ok(Map.of(
            "message", "Email verified! You are now signed in.",
            "token", jwt,
            "user", userToMap(user)
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        String email = req.email().toLowerCase().trim();
        rateLimit("login:" + email + ":" + clientIp(http), LOGIN_MAX, LOGIN_WINDOW_S);

        Optional<User> userOpt = userRepository.findByEmail(email);
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
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req, HttpServletRequest http) {
        rateLimit("forgot:" + clientIp(http), FORGOT_MAX, FORGOT_WINDOW_S);
        // Issues a token + emails the link only if the account exists; the response is identical
        // either way so it never reveals whether an email is registered.
        passwordResetService.requestReset(req.email());
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent."));
    }

    /** Public, token-based reset (forgot-password flow) — no current password required. */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        passwordResetService.performReset(req.token(), req.newPassword());
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
        eventService.record(user.getId(), "PASSWORD_CHANGED", user.getId(), "{}");
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
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
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) return null;
        return auth.getPrincipal().toString();
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
        m.put("email", u.getEmail());
        m.put("fullName", u.getFullName());
        m.put("emailVerified", u.isEmailVerified());
        return m;
    }
}
