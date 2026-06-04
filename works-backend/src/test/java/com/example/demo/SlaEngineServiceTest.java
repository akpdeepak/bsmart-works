package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link SlaEngineService} — tenant-isolation guards on the read surface
 * (RB-40 §1: 404 for non-members), and the clock lifecycle (apply → start, breach, met).
 * Uses the real pure {@link BusinessHoursCalculator} and {@link SlaPolicyService}; everything
 * with I/O is mocked. No calendar is stubbed, so the engine falls back to the always-on model.
 */
@Tag("unit")
class SlaEngineServiceTest {

    private final SlaPolicyRepository policyRepo = mock(SlaPolicyRepository.class);
    private final SlaTargetRepository targetRepo = mock(SlaTargetRepository.class);
    private final SlaEscalationRepository escalationRepo = mock(SlaEscalationRepository.class);
    private final SlaInstanceRepository instanceRepo = mock(SlaInstanceRepository.class);
    private final BusinessCalendarRepository calendarRepo = mock(BusinessCalendarRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService eventService = mock(EventService.class);
    private final NotificationBatchService notifications = mock(NotificationBatchService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    private final SlaEngineService engine = new SlaEngineService(
            policyRepo, targetRepo, escalationRepo, instanceRepo, calendarRepo,
            new BusinessHoursCalculator(), new SlaPolicyService(), rbac, eventService, notifications, jdbc);

    private SlaPolicy policy() {
        SlaPolicy p = new SlaPolicy();
        p.setId("P1");
        p.setWorkspaceId("WS-1");
        p.setPauseStatuses("[\"Waiting on customer\"]");
        return p;
    }

    private SlaTarget target(String stop, String start) {
        SlaTarget t = new SlaTarget();
        t.setId("T1");
        t.setPolicyId("P1");
        t.setMetric("RESOLUTION");
        t.setTargetMinutes(240);
        t.setStartStatus(start);
        t.setStopStatus(stop);
        return t;
    }

    // ── Tenant isolation on the read surface (RB-40 §1) ───────────────────────

    @Test
    void instancesForItem_nonMember_is404() {
        when(rbac.workspaceForWorkItem("WI-1")).thenReturn("WS-1");
        when(rbac.getUserTier("USR-OUT", "WS-1")).thenReturn(0);

        assertThatThrownBy(() -> engine.instancesForItem("USR-OUT", "WI-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(instanceRepo, never()).findByWorkItemIdOrderByMetricAsc(anyString());
    }

    @Test
    void audit_nonMember_is404() {
        when(rbac.workspaceForWorkItem("WI-1")).thenReturn("WS-1");
        when(rbac.getUserTier("USR-OUT", "WS-1")).thenReturn(0);

        assertThatThrownBy(() -> engine.audit("USR-OUT", "WI-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void report_nonMember_is404() {
        when(rbac.getUserTier("USR-OUT", "WS-1")).thenReturn(0);

        assertThatThrownBy(() -> engine.report("USR-OUT", "WS-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── Clock lifecycle ───────────────────────────────────────────────────────

    @Test
    void applyPolicyToItem_createsRunningClockAndRecordsStartEvent() {
        when(targetRepo.findByPolicyIdOrderBySortOrderAsc("P1")).thenReturn(List.of(target("Done", null)));
        when(instanceRepo.findByWorkItemIdAndTargetId("WI-1", "T1")).thenReturn(Optional.empty());
        when(instanceRepo.save(any(SlaInstance.class))).thenAnswer(i -> i.getArgument(0));

        int created = engine.applyPolicyToItem(policy(), "WI-1", "Todo", "USR-1");

        assertThat(created).isEqualTo(1);
        ArgumentCaptor<SlaInstance> cap = ArgumentCaptor.forClass(SlaInstance.class);
        verify(instanceRepo).save(cap.capture());
        SlaInstance inst = cap.getValue();
        assertThat(inst.getStatus()).isEqualTo("RUNNING");
        assertThat(inst.getDueAt()).isNotNull();
        assertThat(inst.getWorkspaceId()).isEqualTo("WS-1");
        verify(eventService).record(eq("WI-1"), eq("SLA_STARTED"), eq("USR-1"), any(java.util.Map.class));
    }

    @Test
    void applyPolicyToItem_pendingWhenStartStatusNotYetReached() {
        when(targetRepo.findByPolicyIdOrderBySortOrderAsc("P1")).thenReturn(List.of(target("Done", "In Progress")));
        when(instanceRepo.findByWorkItemIdAndTargetId("WI-1", "T1")).thenReturn(Optional.empty());
        when(instanceRepo.save(any(SlaInstance.class))).thenAnswer(i -> i.getArgument(0));

        engine.applyPolicyToItem(policy(), "WI-1", "Todo", "USR-1");

        ArgumentCaptor<SlaInstance> cap = ArgumentCaptor.forClass(SlaInstance.class);
        verify(instanceRepo).save(cap.capture());
        assertThat(cap.getValue().getStatus()).isEqualTo("PENDING");
        verify(eventService).record(eq("WI-1"), eq("SLA_APPLIED"), eq("USR-1"), any(java.util.Map.class));
    }

    @Test
    void applyPolicyToItem_skipsWhenInstanceAlreadyExists() {
        when(targetRepo.findByPolicyIdOrderBySortOrderAsc("P1")).thenReturn(List.of(target("Done", null)));
        when(instanceRepo.findByWorkItemIdAndTargetId("WI-1", "T1")).thenReturn(Optional.of(new SlaInstance()));

        int created = engine.applyPolicyToItem(policy(), "WI-1", "Todo", "USR-1");

        assertThat(created).isZero();
        verify(instanceRepo, never()).save(any());
    }

    @Test
    void onStatusChange_toStopStatus_marksMet() {
        SlaInstance running = new SlaInstance();
        running.setId("SLI-1");
        running.setWorkItemId("WI-1");
        running.setPolicyId("P1");
        running.setTargetId("T1");
        running.setStatus("RUNNING");
        running.setTargetMinutes(240);
        running.setRunningSince(OffsetDateTime.now().minusHours(1));
        running.setConsumedSeconds(0L);

        when(rbac.workspaceForProject("PROJ-1")).thenReturn("WS-1");
        when(policyRepo.findByWorkspaceIdAndActiveTrue("WS-1")).thenReturn(List.of()); // no new applies
        when(instanceRepo.findByWorkItemIdOrderByMetricAsc("WI-1")).thenReturn(List.of(running));
        when(policyRepo.findById("P1")).thenReturn(Optional.of(policy()));
        when(targetRepo.findById("T1")).thenReturn(Optional.of(target("Done,Resolved", null)));
        when(instanceRepo.save(any(SlaInstance.class))).thenAnswer(i -> i.getArgument(0));

        engine.onStatusChange("WI-1", "PROJ-1", "In Progress", "Done", "USR-1");

        assertThat(running.getStatus()).isEqualTo("MET");
        assertThat(running.getCompletedAt()).isNotNull();
        verify(eventService).record(eq("WI-1"), eq("SLA_MET"), eq("USR-1"), any(java.util.Map.class));
    }

    @Test
    void onStatusChange_toPauseStatus_pausesRunningClock() {
        SlaInstance running = new SlaInstance();
        running.setId("SLI-1");
        running.setWorkItemId("WI-1");
        running.setPolicyId("P1");
        running.setTargetId("T1");
        running.setStatus("RUNNING");
        running.setTargetMinutes(240);
        running.setRunningSince(OffsetDateTime.now().minusHours(1));
        running.setConsumedSeconds(0L);

        when(rbac.workspaceForProject("PROJ-1")).thenReturn("WS-1");
        when(policyRepo.findByWorkspaceIdAndActiveTrue("WS-1")).thenReturn(List.of());
        when(instanceRepo.findByWorkItemIdOrderByMetricAsc("WI-1")).thenReturn(List.of(running));
        when(policyRepo.findById("P1")).thenReturn(Optional.of(policy()));
        when(targetRepo.findById("T1")).thenReturn(Optional.of(target("Done", null)));
        when(instanceRepo.save(any(SlaInstance.class))).thenAnswer(i -> i.getArgument(0));

        engine.onStatusChange("WI-1", "PROJ-1", "In Progress", "Waiting on customer", "USR-1");

        assertThat(running.getStatus()).isEqualTo("PAUSED");
        assertThat(running.getPausedAt()).isNotNull();
        verify(eventService).record(eq("WI-1"), eq("SLA_PAUSED"), eq("USR-1"), any(java.util.Map.class));
    }

    @Test
    void evaluateActiveClocks_marksBreachWhenPastDue() {
        SlaInstance overdue = new SlaInstance();
        overdue.setId("SLI-1");
        overdue.setWorkItemId("WI-1");
        overdue.setPolicyId("P1");
        overdue.setTargetId("T1");
        overdue.setStatus("RUNNING");
        overdue.setTargetMinutes(240);
        overdue.setRunningSince(OffsetDateTime.now().minusHours(5));
        overdue.setConsumedSeconds(0L);
        overdue.setLastEscalationPct(0);
        overdue.setDueAt(OffsetDateTime.now().minusMinutes(10)); // already past

        when(instanceRepo.findByStatusIn(List.of("RUNNING"))).thenReturn(List.of(overdue));
        when(policyRepo.findById("P1")).thenReturn(Optional.of(policy()));
        when(escalationRepo.findByPolicyIdOrderByThresholdPctAscSortOrderAsc("P1")).thenReturn(List.of());
        when(instanceRepo.save(any(SlaInstance.class))).thenAnswer(i -> i.getArgument(0));

        int actions = engine.evaluateActiveClocks();

        assertThat(actions).isGreaterThanOrEqualTo(1);
        assertThat(overdue.getStatus()).isEqualTo("BREACHED");
        assertThat(overdue.getBreachedAt()).isNotNull();
        verify(eventService).record(eq("WI-1"), eq("SLA_BREACHED"), eq("system"), any(java.util.Map.class));
    }

    @Test
    void matchesScope_projectMismatch_returnsFalse() {
        SlaPolicy p = policy();
        p.setProjectId("PROJ-OTHER");
        assertThat(engine.matchesScope(p, "WI-1", "PROJ-1", "USR-1")).isFalse();
    }

    @Test
    void matchesScope_blankScopeAndProjectMatch_returnsTrue() {
        SlaPolicy p = policy();
        p.setProjectId(null);
        p.setScopeBql("");
        assertThat(engine.matchesScope(p, "WI-1", "PROJ-1", "USR-1")).isTrue();
    }
}
