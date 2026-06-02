package com.example.demo;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Pure field-level helpers for teams — id generation, defaults, and update copying.
 * No I/O, so it is unit-testable in isolation (mirrors ReportService).
 */
@Service
public class TeamService {

    /** project_ids defaults to an empty JSON array when absent. */
    public String normalizeProjectIds(String projectIds) {
        return projectIds == null || projectIds.isBlank() ? "[]" : projectIds;
    }

    /** Stamp a new team with id, defaults and timestamps. Mutates and returns it. */
    public Team prepareNew(Team team) {
        team.setId("TEAM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        team.setProjectIds(normalizeProjectIds(team.getProjectIds()));
        OffsetDateTime now = OffsetDateTime.now();
        team.setCreatedAt(now);
        team.setUpdatedAt(now);
        return team;
    }

    /** Copy the editable fields from updated onto existing and bump updatedAt. */
    public Team applyUpdate(Team existing, Team updated) {
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        if (updated.getProjectIds() != null) existing.setProjectIds(normalizeProjectIds(updated.getProjectIds()));
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }
}
