package com.bcits.works.projects;

import com.bcits.works.shared.AuthenticatedUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Cap V · Ceremony sessions + attendance HTTP surface. Thin; delegates to {@link CeremonyService}.
 */
@RestController
@RequestMapping("/api/v1/ceremonies")
public class CeremonyController {

    private final CeremonyService service;
    private final AuthenticatedUser authenticatedUser;

    public CeremonyController(CeremonyService service, AuthenticatedUser authenticatedUser) {
        this.service = service;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam String projectId) {
        return service.listByProject(authenticatedUser.id(), projectId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        return service.getWithAttendance(authenticatedUser.id(), id);
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public Map<String, Object> schedule(@RequestBody Map<String, Object> body) {
        CeremonySession s = new CeremonySession();
        s.setProjectId((String) body.get("projectId"));
        s.setSprintId((String) body.get("sprintId"));
        s.setCeremonyType((String) body.get("ceremonyType"));
        String scheduledAt = (String) body.get("scheduledAt");
        if (scheduledAt != null && !scheduledAt.isBlank()) {
            s.setScheduledAt(OffsetDateTime.parse(scheduledAt));
        }
        List<String> memberIds = (List<String>) body.getOrDefault("memberIds", List.of());
        return service.schedule(authenticatedUser.id(), s, memberIds);
    }

    @PostMapping("/{id}/start")
    public Map<String, Object> start(@PathVariable String id) {
        return service.start(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/join")
    public Map<String, Object> join(@PathVariable String id) {
        return service.join(authenticatedUser.id(), id);
    }

    @PostMapping("/{id}/excuse")
    public Map<String, Object> excuse(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.excuse(authenticatedUser.id(), id, body.get("userId"));
    }

    @PostMapping("/{id}/complete")
    public Map<String, Object> complete(@PathVariable String id) {
        return service.complete(authenticatedUser.id(), id);
    }
}
