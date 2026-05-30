package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil, EventService eventService) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
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

        User newUser = new User();
        newUser.setId("USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        newUser.setEmail(email.toLowerCase().trim());
        newUser.setFullName(fullName.trim());
        newUser.setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(newUser);

        eventService.record(newUser.getId(), "USER_SIGNED_UP", newUser.getId(),
                "{\"email\":\"" + newUser.getEmail() + "\"}");

        String token = jwtUtil.generate(newUser.getId(), newUser.getEmail());
        return ResponseEntity.ok(Map.of("token", token, "user", userToMap(newUser)));
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
            // Legacy SHA-256 — migrate to BCrypt on first login
            valid = legacySha256(password).equals(user.getPasswordHash());
            if (valid) {
                user.setPasswordHash(passwordEncoder.encode(password));
                userRepository.save(user);
            }
        }

        if (!valid) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password."));
        }

        eventService.record(user.getId(), "USER_LOGGED_IN", user.getId(), "{}");
        String token = jwtUtil.generate(user.getId(), user.getEmail());
        return ResponseEntity.ok(Map.of("token", token, "user", userToMap(user)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        userRepository.findByEmail(email.toLowerCase().trim()).ifPresent(u -> {
            // In production: send email. For now we log.
            System.out.println("[DEV] Password reset requested for: " + u.getEmail());
        });
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email       = payload.get("email");
        String newPassword = payload.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters."));
        }
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found."));
        }
        User user = userOpt.get();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        eventService.record(user.getId(), "PASSWORD_RESET", user.getId(), "{}");
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }

    private String legacySha256(String password) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            return "";
        }
    }

    private Map<String, Object> userToMap(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("fullName", u.getFullName());
        return m;
    }
}
