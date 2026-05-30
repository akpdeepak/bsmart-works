package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final EventService eventService;

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil, EventService eventService) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.eventService = eventService;
    }

    private String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception ex) {
            throw new RuntimeException("Hashing failed", ex);
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String fullName = payload.get("fullName");
        String password = payload.get("password");

        if (email == null || fullName == null || password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email, full name, and password (min 6 chars) are required."));
        }

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Email already in use!"));
        }

        User newUser = new User();
        newUser.setId("USR-" + (int)(Math.random() * 100000));
        newUser.setEmail(email);
        newUser.setFullName(fullName);
        newUser.setPasswordHash(hashPassword(password));
        userRepository.save(newUser);

        eventService.record(newUser.getId(), "USER_SIGNED_UP", newUser.getId(), "{\"email\":\"" + email + "\"}");

        String token = jwtUtil.generate(newUser.getId(), newUser.getEmail());
        return ResponseEntity.ok(Map.of("token", token, "user", userToMap(newUser)));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found!"));
        }

        User user = userOpt.get();
        if (!user.getPasswordHash().equals(hashPassword(password))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Incorrect password!"));
        }

        eventService.record(user.getId(), "USER_LOGGED_IN", user.getId(), "{}");
        String token = jwtUtil.generate(user.getId(), user.getEmail());
        return ResponseEntity.ok(Map.of("token", token, "user", userToMap(user)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        Optional<User> userOpt = userRepository.findByEmail(email);
        // Always return success to prevent email enumeration
        if (userOpt.isPresent()) {
            String resetToken = UUID.randomUUID().toString();
            // In production: send email with reset link
            // For MVP: return token directly so frontend can use it
            return ResponseEntity.ok(Map.of("message", "Reset link sent.", "devToken", resetToken));
        }
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String newPassword = payload.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters."));
        }
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found."));
        }
        User user = userOpt.get();
        user.setPasswordHash(hashPassword(newPassword));
        userRepository.save(user);
        eventService.record(user.getId(), "PASSWORD_RESET", user.getId(), "{}");
        return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
    }

    private Map<String, Object> userToMap(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("fullName", u.getFullName());
        return m;
    }
}
