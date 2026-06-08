package com.bcits.works;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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
    private final RbacService rbac;

    public TeamController(TeamRepository teamRepository, TeamService teamService,
                          EventService eventService, AuthenticatedUser authenticatedUser,
                          RbacService rbac) {
        this.teamRepository = teamRepository;
        this.teamService = teamService;
        this.eventService = eventService;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
    }

    @GetMapping
    public List<Team> list(@RequestParam String workspaceId) {
        if (rbac.getUserTier(authenticatedUser.id(), workspaceId) < 1) {
            throw ApiException.notFound("Workspace", workspaceId);
        }
        return teamRepository.findByWorkspaceIdOrderByNameAsc(workspaceId);
    }

    @GetMapping("/{id}")
    public Team get(@PathVariable String id) {
        Team team = teamRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), team.getWorkspaceId(), "view_items");
        return team;
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
        Team existing = teamRepository.findById(id).orElseThrow();
        rbac.require(authenticatedUser.id(), existing.getWorkspaceId(), "view_items");
        return teamRepository.findById(id)
            .map(t -> teamRepository.save(teamService.applyUpdate(t, updated)))
            .orElseThrow();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        String userId = authenticatedUser.id();
        Team existing = teamRepository.findById(id).orElseThrow();
        rbac.require(userId, existing.getWorkspaceId(), "view_items");
        teamRepository.deleteById(id);
        eventService.record(id, "TEAM_DELETED", userId, "{}");
        return ResponseEntity.noContent().build();
    }
}
