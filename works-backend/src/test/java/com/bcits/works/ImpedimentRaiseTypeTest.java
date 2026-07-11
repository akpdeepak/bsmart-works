package com.bcits.works;

import com.bcits.works.workspaces.TeamRoleService;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.projects.Impediment;
import com.bcits.works.projects.ImpedimentRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Role-filtered raise types (V80) + SLA breach flag. The type a caller may raise follows their
 * team role; a disallowed type is FORBIDDEN even when the caller has create_items (RB-40 §1 —
 * enforced server-side, not hidden in the UI).
 */
@Tag("unit")
class ImpedimentRaiseTypeTest {

    @Test
    void allowedRaiseTypes_followTheRoleMatrix() {
        assertThat(ImpedimentService.allowedRaiseTypes("developer"))
                .containsExactlyInAnyOrder("IMPEDIMENT", "RISK", "DEPENDENCY");
        assertThat(ImpedimentService.allowedRaiseTypes("product-owner"))
                .contains("SCOPE_CHANGE", "DECISION_NEEDED").doesNotContain("ESCALATION");
        assertThat(ImpedimentService.allowedRaiseTypes("scrum-master")).contains("ESCALATION");
        assertThat(ImpedimentService.allowedRaiseTypes("admin")).contains("ESCALATION");
        assertThat(ImpedimentService.allowedRaiseTypes("executive")).containsExactly("DECISION_NEEDED");
        assertThat(ImpedimentService.allowedRaiseTypes("unknown")).isEmpty();
    }

    @Test
    void slaBreached_onlyForCriticalUnresolvedOlderThanOneDay() {
        LocalDate today = LocalDate.parse("2026-06-12");
        assertThat(ImpedimentService.slaBreached(imp("CRITICAL", "OPEN", "2026-06-10"), today)).isTrue();
        assertThat(ImpedimentService.slaBreached(imp("CRITICAL", "OPEN", "2026-06-11"), today)).isFalse();
        assertThat(ImpedimentService.slaBreached(imp("CRITICAL", "RESOLVED", "2026-06-01"), today)).isFalse();
        assertThat(ImpedimentService.slaBreached(imp("HIGH", "OPEN", "2026-06-01"), today)).isFalse();
    }

    @Test
    void create_disallowedRaiseTypeForRoleIsForbidden() {
        ImpedimentRepository repo = mock(ImpedimentRepository.class);
        RbacService rbac = mock(RbacService.class);
        EventService events = mock(EventService.class);
        TeamRoleService teamRoles = mock(TeamRoleService.class);
        ImpedimentService service = new ImpedimentService(repo, rbac, events, teamRoles);

        when(rbac.workspaceForProject("PROJ-1")).thenReturn("ws-A");
        when(rbac.getUserTier("dev", "ws-A")).thenReturn(2);
        when(teamRoles.roleFor("dev", "PROJ-1", "ws-A")).thenReturn("developer");

        Impediment in = new Impediment();
        in.setProjectId("PROJ-1");
        in.setTitle("Cut the reporting epic");
        in.setRaiseType("SCOPE_CHANGE");

        assertThatThrownBy(() -> service.create("dev", in))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(repo, never()).save(any());
    }

    @Test
    void create_defaultsToImpedimentAndAllowsIt() {
        ImpedimentRepository repo = mock(ImpedimentRepository.class);
        RbacService rbac = mock(RbacService.class);
        EventService events = mock(EventService.class);
        TeamRoleService teamRoles = mock(TeamRoleService.class);
        ImpedimentService service = new ImpedimentService(repo, rbac, events, teamRoles);

        when(rbac.workspaceForProject("PROJ-1")).thenReturn("ws-A");
        when(rbac.getUserTier("dev", "ws-A")).thenReturn(2);
        when(teamRoles.roleFor("dev", "PROJ-1", "ws-A")).thenReturn("developer");
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Impediment in = new Impediment();
        in.setProjectId("PROJ-1");
        in.setTitle("Staging environment down");

        Impediment saved = service.create("dev", in);

        assertThat(saved.getRaiseType()).isEqualTo("IMPEDIMENT");
        assertThat(saved.getStatus()).isEqualTo("OPEN");
    }

    private static Impediment imp(String severity, String status, String raisedAt) {
        Impediment i = new Impediment();
        i.setSeverity(severity);
        i.setStatus(status);
        i.setRaisedAt(LocalDate.parse(raisedAt));
        return i;
    }
}
