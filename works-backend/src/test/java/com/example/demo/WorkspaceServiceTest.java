package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link WorkspaceService} — the tenant-isolation guard (RB-40 §1), RBAC-in-service
 * placement (RB-10 §2), and event recording (RB-10 §3). Pure mocks; no Spring context, no DB.
 */
@Tag("unit")
class WorkspaceServiceTest {

    private final WorkspaceRepository workspaceRepository = mock(WorkspaceRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService eventService = mock(EventService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    private final WorkspaceService service =
            new WorkspaceService(workspaceRepository, userRepository, rbac, eventService, jdbc);

    private Workspace ws(String id) {
        Workspace w = new Workspace();
        w.setId(id);
        w.setName("BCITS");
        return w;
    }

    // ── Tenant isolation on reads (RB-40 §1) ──────────────────────────────────

    @Test
    void getWorkspace_nonMember_is404_andNeverHitsRepository() {
        when(rbac.getUserTier("USR-OUT", "WS-001")).thenReturn(0); // not a member

        assertThatThrownBy(() -> service.getWorkspace("USR-OUT", "WS-001"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(workspaceRepository, never()).findById(anyString());
    }

    @Test
    void getWorkspace_member_returnsWorkspace() {
        when(rbac.getUserTier("USR-IN", "WS-001")).thenReturn(2);
        when(workspaceRepository.findById("WS-001")).thenReturn(Optional.of(ws("WS-001")));

        assertThat(service.getWorkspace("USR-IN", "WS-001").getId()).isEqualTo("WS-001");
    }

    @Test
    void getMembers_nonMember_is404() {
        when(rbac.getUserTier("USR-OUT", "WS-002")).thenReturn(0);

        assertThatThrownBy(() -> service.getMembers("USR-OUT", "WS-002"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getBranding_nonMember_is404() {
        when(rbac.getUserTier("USR-OUT", "WS-002")).thenReturn(0);

        assertThatThrownBy(() -> service.getBranding("USR-OUT", "WS-002"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getProjectMembers_foreignProject_is404() {
        when(rbac.getUserTier("USR-IN", "WS-001")).thenReturn(2);
        when(rbac.workspaceForProject("PROJ-X")).thenReturn("WS-OTHER"); // belongs to another tenant

        assertThatThrownBy(() -> service.getProjectMembers("USR-IN", "WS-001", "PROJ-X"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── RBAC-in-service on writes ─────────────────────────────────────────────

    @Test
    void addMember_withoutPermission_throwsForbidden_andDoesNotInsert() {
        doThrow(ApiException.forbidden("nope")).when(rbac).require("USR-LOW", "WS-001", "invite_members");

        assertThatThrownBy(() -> service.addMember("USR-LOW", "WS-001", "x@y.com", "MEMBER"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(jdbc, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(eventService);
    }

    @Test
    void addMember_permitted_insertsAndRecordsEvent() {
        User u = new User();
        u.setId("USR-NEW");
        u.setEmail("new@bcits.com");
        when(userRepository.findByEmail("new@bcits.com")).thenReturn(Optional.of(u));

        var result = service.addMember("USR-ADMIN", "WS-001", "new@bcits.com", null);

        assertThat(result.get("userId")).isEqualTo("USR-NEW");
        verify(rbac).require("USR-ADMIN", "WS-001", "invite_members");
        // role defaults to MEMBER when not supplied
        verify(jdbc).update(contains("INSERT INTO workspace_members"), eq("WS-001"), eq("USR-NEW"), eq("MEMBER"));
        verify(eventService).record(eq("WS-001"), eq("MEMBER_ADDED"), eq("USR-ADMIN"), any(java.util.Map.class));
    }

    @Test
    void removeMember_permitted_deletesAndRecordsEvent() {
        service.removeMember("USR-ADMIN", "WS-001", "USR-GONE");

        verify(rbac).require("USR-ADMIN", "WS-001", "remove_members");
        verify(jdbc).update(contains("DELETE FROM workspace_members"), eq("WS-001"), eq("USR-GONE"));
        verify(eventService).record(eq("WS-001"), eq("MEMBER_REMOVED"), eq("USR-ADMIN"), any(java.util.Map.class));
    }

    @Test
    void updateWorkspace_permitted_savesAndRecordsDiffEvent() {
        Workspace existing = ws("WS-001");
        existing.setName("Old Name");
        when(workspaceRepository.findById("WS-001")).thenReturn(Optional.of(existing));
        when(workspaceRepository.save(any(Workspace.class))).thenAnswer(i -> i.getArgument(0));

        Workspace saved = service.updateWorkspace("USR-ADMIN", "WS-001", "New Name");

        assertThat(saved.getName()).isEqualTo("New Name");
        verify(rbac).require("USR-ADMIN", "WS-001", "manage_workspace");
        verify(eventService).recordDiff("WS-001", "WORKSPACE_UPDATED", "USR-ADMIN", "name", "Old Name", "New Name");
    }

    @Test
    void updateBranding_defaultsBlankColorAndNullsBlankLogo_andRecordsEvent() {
        Workspace existing = ws("WS-001");
        when(workspaceRepository.findById("WS-001")).thenReturn(Optional.of(existing));
        when(workspaceRepository.save(any(Workspace.class))).thenAnswer(i -> i.getArgument(0));

        var branding = service.updateBranding("USR-ADMIN", "WS-001", "  ", "  ", "Support team");

        assertThat(branding.get("primaryColor")).isEqualTo("#E94E1B"); // blank → default
        assertThat(branding.get("logoUrl")).isEqualTo("");             // blank → null → ""
        assertThat(branding.get("description")).isEqualTo("Support team");
        verify(rbac).require("USR-ADMIN", "WS-001", "manage_workspace");
        verify(eventService).record(eq("WS-001"), eq("WORKSPACE_BRANDING_UPDATED"), eq("USR-ADMIN"), any(java.util.Map.class));
    }

    // ── Workspace context ─────────────────────────────────────────────────────

    @Test
    void myWorkspaces_queriesMembershipForCaller() {
        when(jdbc.queryForList(anyString(), eq("USR-1"))).thenReturn(java.util.List.of(
                java.util.Map.of("id", "WS-001", "name", "BCITS", "slug", "bcits", "role", "OWNER")));

        var list = service.myWorkspaces("USR-1");

        assertThat(list).hasSize(1);
        assertThat(list.get(0)).containsEntry("id", "WS-001").containsEntry("role", "OWNER");
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForList(sql.capture(), eq("USR-1"));
        assertThat(sql.getValue()).contains("workspace_members").contains("wm.user_id = ?");
    }
}
