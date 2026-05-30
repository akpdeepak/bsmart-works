package com.example.demo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/workspaces")
public class WorkspaceController {

    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbc;

    public WorkspaceController(WorkspaceRepository workspaceRepository,
                               UserRepository userRepository, JdbcTemplate jdbc) {
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.jdbc = jdbc;
    }

    @GetMapping("/{id}")
    public Workspace getWorkspace(@PathVariable String id) {
        return workspaceRepository.findById(id).orElseThrow();
    }

    @GetMapping("/{id}/members")
    public List<Map<String, String>> getMembers(@PathVariable String id) {
        return jdbc.query(
            "SELECT u.id, u.full_name, u.email, wm.system_role FROM workspace_members wm " +
            "JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = ?",
            (rs, row) -> Map.of(
                "id", rs.getString("id"),
                "fullName", rs.getString("full_name"),
                "email", rs.getString("email"),
                "role", rs.getString("system_role")
            ), id);
    }

    @PostMapping("/{id}/members")
    public Map<String, String> addMember(@PathVariable String id,
                                          @RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String role = payload.getOrDefault("role", "MEMBER");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        jdbc.update("INSERT INTO workspace_members (workspace_id, user_id, system_role) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                id, user.getId(), role);
        return Map.of("message", "Member added", "userId", user.getId());
    }

    @DeleteMapping("/{id}/members/{userId}")
    public Map<String, String> removeMember(@PathVariable String id, @PathVariable String userId) {
        jdbc.update("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?", id, userId);
        return Map.of("message", "Member removed");
    }

    @PutMapping("/{id}")
    public Workspace updateWorkspace(@PathVariable String id, @RequestBody Workspace updated) {
        return workspaceRepository.findById(id).map(w -> {
            w.setName(updated.getName());
            return workspaceRepository.save(w);
        }).orElseThrow();
    }
}

