package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class AggregationServiceTest {

    private final AggregationService service = new AggregationService();

    @Test
    void parseProjectIds_handlesValidBlankAndInvalid() {
        assertThat(service.parseProjectIds("[\"PRJ-1\",\"PRJ-2\"]")).containsExactly("PRJ-1", "PRJ-2");
        assertThat(service.parseProjectIds("[]")).isEmpty();
        assertThat(service.parseProjectIds(null)).isEmpty();
        assertThat(service.parseProjectIds("")).isEmpty();
        assertThat(service.parseProjectIds("not json")).isEmpty();
    }

    @Test
    void resolve_personal_filtersByAssignee() {
        AggregationService.ScopeFilter f = service.resolve("PERSONAL", "USR-1", null, List.of());
        assertThat(f.sql()).isEqualTo("assignee_id = ?");
        assertThat(f.params()).containsExactly("USR-1");
    }

    @Test
    void resolve_project_filtersByProject() {
        AggregationService.ScopeFilter f = service.resolve("PROJECT", "USR-1", "PRJ-9", List.of());
        assertThat(f.sql()).isEqualTo("project_id = ?");
        assertThat(f.params()).containsExactly("PRJ-9");
    }

    @Test
    void resolve_team_buildsInClauseOverTheTeamsProjects() {
        AggregationService.ScopeFilter f = service.resolve("TEAM", "USR-1", null, List.of("PRJ-1", "PRJ-2", "PRJ-3"));
        assertThat(f.sql()).isEqualTo("project_id IN (?,?,?)");
        assertThat(f.params()).containsExactly("PRJ-1", "PRJ-2", "PRJ-3");
    }

    @Test
    void resolve_team_withNoProjects_matchesNothing() {
        AggregationService.ScopeFilter f = service.resolve("TEAM", "USR-1", null, List.of());
        assertThat(f.sql()).isEqualTo("1 = 0");
        assertThat(f.params()).isEmpty();
    }

    @Test
    void resolve_org_addsNoNarrowing_workspacePredicateIsTheScope() {
        // ORG narrowing is intentionally empty — the controller's mandatory workspace predicate
        // (project_id IN workspace projects) is the entire scope, so there is no cross-tenant 1=1.
        AggregationService.ScopeFilter org = service.resolve("ORG", "USR-1", null, List.of());
        assertThat(org.sql()).isEqualTo("1 = 1");
        assertThat(org.params()).isEmpty();
    }

    @Test
    void resolve_unknownScope_defaultsToOrgNarrowing() {
        AggregationService.ScopeFilter f = service.resolve(null, "USR-1", null, List.of());
        assertThat(f.sql()).isEqualTo("1 = 1");
    }
}
