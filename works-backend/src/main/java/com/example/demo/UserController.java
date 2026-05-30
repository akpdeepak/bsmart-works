package com.example.demo;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;

    public UserController(UserRepository userRepository, WorkspaceRepository workspaceRepository) {
        this.userRepository = userRepository;
        this.workspaceRepository = workspaceRepository;
    }

    // This endpoint acts as our temporary "Login Context"
    @GetMapping("/me")
    public Map<String, Object> getCurrentUser() {
        // Fetch the user and workspace we inserted in the V3 SQL file
        User me = userRepository.findById("USR-001").orElse(null);
        Workspace myWorkspace = workspaceRepository.findById("WS-001").orElse(null);

        // Bundle them together into one clean package to send to React
        return Map.of(
            "user", me,
            "workspace", myWorkspace
        );
    }
}