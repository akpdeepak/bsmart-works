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

    // Workspace branding
    @GetMapping("/{id}/branding")
    public Map<String, Object> getBranding(@PathVariable String id) {
        var rows = jdbc.queryForList("SELECT primary_color, logo_url, description FROM workspaces WHERE id = ?", id);
        if (rows.isEmpty()) return Map.of("primaryColor", "#E94E1B");
        var row = rows.get(0);
        return Map.of(
            "primaryColor", row.getOrDefault("primary_color", "#E94E1B") != null ? row.get("primary_color") : "#E94E1B",
            "logoUrl", row.getOrDefault("logo_url", "") != null ? row.get("logo_url") : "",
            "description", row.getOrDefault("description", "") != null ? row.get("description") : ""
        );
    }

    @PutMapping("/{id}/branding")
    public Map<String, Object> updateBranding(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String color = payload.getOrDefault("primaryColor", "#E94E1B");
        String logoUrl = payload.getOrDefault("logoUrl", "");
        String description = payload.getOrDefault("description", "");
        jdbc.update("UPDATE workspaces SET primary_color = ?, logo_url = ?, description = ? WHERE id = ?",
            color, logoUrl.isEmpty() ? null : logoUrl, description, id);
        return Map.of("primaryColor", color, "logoUrl", logoUrl, "description", description);
    }

    // Project members
    @GetMapping("/{wsId}/projects/{projectId}/members")
    public List<Map<String, Object>> getProjectMembers(@PathVariable String wsId, @PathVariable String projectId) {
        return jdbc.queryForList(
            "SELECT u.id, u.full_name, u.email, pm.role FROM project_members pm " +
            "JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?", projectId);
    }

    @PostMapping("/{wsId}/projects/{projectId}/members")
    public Map<String, String> addProjectMember(@PathVariable String wsId, @PathVariable String projectId,
                                                  @RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String role = payload.getOrDefault("role", "MEMBER");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        jdbc.update("INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,?) ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role",
            projectId, user.getId(), role);
        return Map.of("message", "Member added", "userId", user.getId());
    }

    @DeleteMapping("/{wsId}/projects/{projectId}/members/{userId}")
    public Map<String, String> removeProjectMember(@PathVariable String wsId, @PathVariable String projectId,
                                                     @PathVariable String userId) {
        jdbc.update("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", projectId, userId);
        return Map.of("message", "Member removed");
    }
}

