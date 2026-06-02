package com.example.demo;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

/**
 * Teams (iteration 6) — workspace-scoped sets of projects. Thin controller mirroring
 * the report/dashboard pattern; field logic delegated to {@link TeamService}.
 */
@RestController
@RequestMapping("/api/v1/teams")
public class TeamController {

    private final TeamRepository teamRepository;
    private final TeamService teamService;
    private final EventService eventService;
    private final AuthenticatedUser authenticatedUser;

    public TeamController(TeamRepository teamRepository, TeamService teamService,
                          EventService eventService, AuthenticatedUser authenticatedUser) {
        this.teamRepository = teamRepository;
        this.teamService = teamService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
    }

    @GetMapping
    public List<Team> list(@RequestParam(required = false) String workspaceId) {
        return workspaceId != null
            ? teamRepository.findByWorkspaceIdOrderByNameAsc(workspaceId)
            : teamRepository.findAll();
    }

    @GetMapping("/{id}")
    public Team get(@PathVariable String id) {
        return teamRepository.findById(id).orElseThrow();
    }

    @PostMapping
    public Team create(@Valid @RequestBody Team team) {
        String userId = authenticatedUser.id();
        Team saved = teamRepository.save(teamService.prepareNew(team));
        eventService.record(saved.getId(), "TEAM_CREATED", userId, "{}");
        return saved;
    }

    @PutMapping("/{id}")
    public Team update(@PathVariable String id, @Valid @RequestBody Team updated) {
        return teamRepository.findById(id)
            .map(existing -> teamRepository.save(teamService.applyUpdate(existing, updated)))
            .orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        teamRepository.deleteById(id);
        eventService.record(id, "TEAM_DELETED", userId, "{}");
        return ResponseEntity.noContent().build();
    }
}
