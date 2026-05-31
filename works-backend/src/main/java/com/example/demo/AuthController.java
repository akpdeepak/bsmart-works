package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final EventService eventService;
    private final boolean exposeDevVerificationToken;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil, EventService eventService,
                          @Value("${app.auth.expose-dev-verification-token:false}") boolean exposeDevVerificationToken) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
        this.exposeDevVerificationToken = exposeDevVerificationToken;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> payload) {
        String email    = payload.get("email");
        String fullName = payload.get("fullName");
        String password = payload.get("password");

        if (email == null || email.isBlank() || fullName == null || fullName.isBlank()
                || password == null || password.length() < 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email, full name and password (min 6 chars) are required."));
        }

        if (userRepository.findByEmail(email.toLowerCase().trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Email already in use!"));
        }

        String verificationToken = UUID.randomUUID().toString().replace("-", "");

        User newUser = new User();
        newUser.setId("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        newUser.setEmail(email.toLowerCase().trim());
        newUser.setFullName(fullName.trim());
        newUser.setPasswordHash(passwordEncoder.encode(password));
        newUser.setEmailVerified(false);
        newUser.setVerificationToken(verificationToken);
        userRepository.save(newUser);

        eventService.record(newUser.getId(), "USER_SIGNED_UP", newUser.getId(),
                "{\"email\":\"" + newUser.getEmail() + "\"}");

        // In production: send email. For now log the verification link.
        System.out.println("[EMAIL] Verification link for " + newUser.getEmail()
                + ": http://localhost:5173/verify?token=" + verificationToken);

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
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired verification token."));
        }
        User user = userOpt.get();
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);
        eventService.record(user.getId(), "EMAIL_VERIFIED", user.getId(),
                "{\"email\":\"" + user.getEmail() + "\"}");

        String token2 = jwtUtil.generate(user.getId(), user.getEmail());
        return ResponseEntity.ok(Map.of(
            "message", "Email verified! You are now signed in.",
            "token", token2,
            "user", userToMap(user)
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email    = payload.get("email");
        String password = payload.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password required."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password."));
        }

        User user = userOpt.get();

        // Support both BCrypt and legacy SHA-256 hashes during migration
        boolean valid = false;
        if (user.getPasswordHash().startsWith("$2a$") || user.getPasswordHash().startsWith("$2b$")) {
            valid = passwordEncoder.matches(password, user.getPasswordHash());
        } else {
            valid = legacySha256(password).equals(user.getPasswordHash());
            if (valid) {
                user.setPasswordHash(passwordEncoder.encode(password));
                userRepository.save(user);
            }
        }

        if (!valid) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password."));
        }

        if (!user.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", "Please verify your email before signing in.",
                "requiresVerification", true
            ));
        }

        // MFA challenge — return userId for the frontend to call /auth/mfa/verify
        if (user.isMfaEnabled()) {
            return ResponseEntity.ok(Map.of(
                "requiresMfa", true,
                "userId", user.getId(),
                "message", "Enter your authenticator app code to complete sign in."
            ));
        }

        eventService.record(user.getId(), "USER_LOGGED_IN", user.getId(), "{}");
        String token2 = jwtUtil.generate(user.getId(), user.getEmail());
        return ResponseEntity.ok(Map.of("token", token2, "user", userToMap(user)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
        }
        userRepository.findByEmail(email.toLowerCase().trim()).ifPresent(u -> {
            System.out.println("[EMAIL] Password reset requested for: " + u.getEmail());
        });
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String currentUserId = authenticatedUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }

        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");
        if (currentPassword == null || currentPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Current password is required."));
        }
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters."));
        }
        Optional<User> userOpt = userRepository.findById(currentUserId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found."));
        }
        User user = userOpt.get();
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Current password is incorrect."));
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        eventService.record(user.getId(), "PASSWORD_RESET", user.getId(), "{}");
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
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
