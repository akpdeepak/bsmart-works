package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SlaConfigService} — tenant isolation (RB-40 §1: 404 for non-members),
 * RBAC-in-service on every mutation (RB-10 §2: {@code manage_sla}), and event recording
 * (RB-10 §3). Pure mocks; the pure {@link SlaPolicyService} is used for real.
 */
@Tag("unit")
class SlaConfigServiceTest {

    private final SlaPolicyRepository policyRepo = mock(SlaPolicyRepository.class);
    private final SlaTargetRepository targetRepo = mock(SlaTargetRepository.class);
    private final SlaEscalationRepository escalationRepo = mock(SlaEscalationRepository.class);
    private final BusinessCalendarRepository calendarRepo = mock(BusinessCalendarRepository.class);
    private final SlaEngineService engine = mock(SlaEngineService.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService eventService = mock(EventService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    private final SlaConfigService service = new SlaConfigService(
            policyRepo, targetRepo, escalationRepo, calendarRepo,
            new SlaPolicyService(), engine, rbac, eventService, jdbc);

    private SlaPolicy policy(String id, String ws) {
        SlaPolicy p = new SlaPolicy();
        p.setId(id);
        p.setWorkspaceId(ws);
        p.setName("P0");
        return p;
    }

    // ── Tenant isolation on reads (RB-40 §1) ──────────────────────────────────

    @Test
    void listPolicies_nonMember_is404() {
        when(rbac.getUserTier("USR-OUT", "WS-001")).thenReturn(0);

        assertThatThrownBy(() -> service.listPolicies("USR-OUT", "WS-001"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(policyRepo, never()).findByWorkspaceIdOrderByNameAsc(anyString());
    }

    @Test
    void getPolicy_memberOfAnotherWorkspace_is404() {
        when(policyRepo.findById("SLA-1")).thenReturn(Optional.of(policy("SLA-1", "WS-OWNER")));
        when(rbac.getUserTier("USR-OTHER", "WS-OWNER")).thenReturn(0); // member elsewhere, not here

        assertThatThrownBy(() -> service.getPolicy("USR-OTHER", "SLA-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getPolicy_member_returnsPolicyWithTargetsAndEscalations() {
        when(policyRepo.findById("SLA-1")).thenReturn(Optional.of(policy("SLA-1", "WS-001")));
        when(rbac.getUserTier("USR-IN", "WS-001")).thenReturn(2);
        when(targetRepo.findByPolicyIdOrderBySortOrderAsc("SLA-1")).thenReturn(java.util.List.of());
        when(escalationRepo.findByPolicyIdOrderByThresholdPctAscSortOrderAsc("SLA-1")).thenReturn(java.util.List.of());

        var out = service.getPolicy("USR-IN", "SLA-1");
        assertThat(out).containsKeys("policy", "targets", "escalations");
    }

    // ── RBAC-in-service on writes ─────────────────────────────────────────────

    @Test
    void createPolicy_withoutPermission_forbidden_andDoesNotSave() {
        doThrow(ApiException.forbidden("nope")).when(rbac).require("USR-LOW", "WS-001", "manage_sla");

        assertThatThrownBy(() -> service.createPolicy("USR-LOW", "WS-001", policy(null, null)))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(policyRepo, never()).save(any());
        verifyNoInteractions(eventService);
    }

    @Test
    void createPolicy_permitted_savesInactiveScopedAndRecordsEvent() {
        when(policyRepo.save(any(SlaPolicy.class))).thenAnswer(i -> i.getArgument(0));

        SlaPolicy created = service.createPolicy("USR-ADMIN", "WS-001", policy(null, null));

        verify(rbac).require("USR-ADMIN", "WS-001", "manage_sla");
        assertThat(created.getWorkspaceId()).isEqualTo("WS-001");
        assertThat(created.getActive()).isFalse();      // test-before-activate
        assertThat(created.getIsTemplate()).isFalse();  // workspace policies are never templates
        verify(eventService).record(anyString(), eq("SLA_POLICY_CREATED"), eq("USR-ADMIN"), any(java.util.Map.class));
    }

    @Test
    void setActive_permitted_flipsFlagAndRecordsEvent() {
        SlaPolicy p = policy("SLA-1", "WS-001");
        when(policyRepo.findById("SLA-1")).thenReturn(Optional.of(p));
        when(policyRepo.save(any(SlaPolicy.class))).thenAnswer(i -> i.getArgument(0));

        SlaPolicy saved = service.setActive("USR-ADMIN", "SLA-1", true);

        verify(rbac).require("USR-ADMIN", "WS-001", "manage_sla");
        assertThat(saved.getActive()).isTrue();
        verify(eventService).record(eq("SLA-1"), eq("SLA_POLICY_ACTIVATED"), eq("USR-ADMIN"), any(java.util.Map.class));
    }

    @Test
    void deletePolicy_withoutPermission_forbidden_andDoesNotDelete() {
        when(policyRepo.findById("SLA-1")).thenReturn(Optional.of(policy("SLA-1", "WS-001")));
        doThrow(ApiException.forbidden("nope")).when(rbac).require("USR-LOW", "WS-001", "manage_sla");

        assertThatThrownBy(() -> service.deletePolicy("USR-LOW", "SLA-1"))
                .isInstanceOf(ApiException.class);
        verify(policyRepo, never()).deleteById(anyString());
    }

    @Test
    void addTarget_permitted_normalizesAndRecordsEvent() {
        when(policyRepo.findById("SLA-1")).thenReturn(Optional.of(policy("SLA-1", "WS-001")));
        when(targetRepo.save(any(SlaTarget.class))).thenAnswer(i -> i.getArgument(0));
        SlaTarget t = new SlaTarget();
        t.setName("Resolve");
        t.setMetric("resolution");
        t.setTargetMinutes(240);

        SlaTarget saved = service.addTarget("USR-ADMIN", "SLA-1", t);

        verify(rbac).require("USR-ADMIN", "WS-001", "manage_sla");
        assertThat(saved.getId()).startsWith("SLT-");
        assertThat(saved.getWorkspaceId()).isEqualTo("WS-001");
        assertThat(saved.getMetric()).isEqualTo("RESOLUTION");
        verify(eventService).record(eq("SLA-1"), eq("SLA_TARGET_ADDED"), eq("USR-ADMIN"), any(java.util.Map.class));
    }

    @Test
    void cloneTemplate_rejectsNonTemplate() {
        SlaPolicy notTpl = policy("SLA-1", null);
        notTpl.setIsTemplate(false);
        when(policyRepo.findById("SLA-1")).thenReturn(Optional.of(notTpl));

        assertThatThrownBy(() -> service.cloneTemplate("USR-ADMIN", "WS-001", "SLA-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void createCalendar_withoutPermission_forbidden_andDoesNotSave() {
        doThrow(ApiException.forbidden("nope")).when(rbac).require("USR-LOW", "WS-001", "manage_sla");

        assertThatThrownBy(() -> service.createCalendar("USR-LOW", "WS-001", new BusinessCalendar()))
                .isInstanceOf(ApiException.class);
        verify(calendarRepo, never()).save(any());
    }

    @Test
    void createCalendar_permitted_defaultsAndRecordsEvent() {
        when(calendarRepo.save(any(BusinessCalendar.class))).thenAnswer(i -> i.getArgument(0));
        BusinessCalendar cal = new BusinessCalendar();
        cal.setName("Support hours");
        cal.setTimezone(null);

        BusinessCalendar saved = service.createCalendar("USR-ADMIN", "WS-001", cal);

        verify(rbac).require("USR-ADMIN", "WS-001", "manage_sla");
        assertThat(saved.getId()).startsWith("CAL-");
        assertThat(saved.getWorkspaceId()).isEqualTo("WS-001");
        assertThat(saved.getTimezone()).isEqualTo("Asia/Kolkata"); // blank → default
        verify(eventService).record(anyString(), eq("SLA_CALENDAR_CREATED"), eq("USR-ADMIN"), any(java.util.Map.class));
    }
}
