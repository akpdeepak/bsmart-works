package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Built-in secure password hasher
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

        // 1. Check if email is already taken
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Email already in use!"));
        }

        // 2. Create the new user securely
        User newUser = new User();
        newUser.setId("USR-" + (int)(Math.random() * 100000)); // Generate random ID
        newUser.setEmail(email);
        newUser.setFullName(fullName);
        newUser.setPasswordHash(hashPassword(password));

        userRepository.save(newUser);

        return ResponseEntity.ok(newUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        // 1. Find the user
        Optional<User> userOpt = userRepository.findByEmail(email);
        
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found!"));
        }

        User user = userOpt.get();

        // 2. Verify the password matches
        String incomingHash = hashPassword(password);
        if (!user.getPasswordHash().equals(incomingHash)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Incorrect password!"));
        }

        // 3. Success! Return the user
        return ResponseEntity.ok(user);
    }
}