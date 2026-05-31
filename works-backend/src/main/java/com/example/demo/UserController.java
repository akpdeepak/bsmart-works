package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Map<String, String>> getAllUsers() {
        return userRepository.findAll().stream().map(u -> Map.of(
                "id", u.getId(),
                "fullName", u.getFullName(),
                "email", u.getEmail()
        )).collect(Collectors.toList());
    }

    @GetMapping("/me")
    public Map<String, String> getCurrentUser(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null) userId = "USR-001";
        final String uid = userId;
        return userRepository.findById(uid).map(u -> Map.of(
                "id", u.getId(), "fullName", u.getFullName(), "email", u.getEmail()
        )).orElse(Map.of("id", uid, "fullName", "Unknown", "email", ""));
    }
}

