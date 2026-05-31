package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final AuthenticatedUser authenticatedUser;

    public UserController(UserRepository userRepository, AuthenticatedUser authenticatedUser) {
        this.userRepository = userRepository;
        this.authenticatedUser = authenticatedUser;
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
    public Map<String, String> getCurrentUser() {
        String userId = authenticatedUser.id();
        final String uid = userId;
        return userRepository.findById(uid).map(u -> Map.of(
                "id", u.getId(), "fullName", u.getFullName(), "email", u.getEmail()
        )).orElse(Map.of("id", uid, "fullName", "Unknown", "email", ""));
    }
}
