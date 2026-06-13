package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the impediment SLA-breach notifier (RB-05 Stage 3). Covers the pure
 * recipient/message helpers and the sweep's three gates: only CRITICAL breaches notify,
 * an already-notified breach is skipped (dedupe via the events ledger), and a fresh
 * breach escalates to recipients + records the dedupe event exactly once.
 */
@Tag("unit")
class ImpedimentSlaServiceTest {

    private final ImpedimentRepository impediments = mock(ImpedimentRepository.class);
    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final ProjectTeamMemberRepository teamMembers = mock(ProjectTeamMemberRepository.class);
    private final EventRepository events = mock(EventRepository.class);
    private final EventService eventService = mock(EventService.class);

    private final ImpedimentSlaService service =
            new ImpedimentSlaService(impediments, notifications, teamMembers, events, eventService, null);

    private static Impediment critical(String id, String status, LocalDate raisedAt) {
        Impediment i = new Impediment();
        i.setId(id);
        i.setWorkspaceId("WS-1");
        i.setProjectId("PROJ-1");
        i.setTitle("Payments gateway down");
        i.setSeverity("CRITICAL");
        i.setStatus(status);
        i.setRaisedAt(raisedAt);
        return i;
    }

    private static ProjectTeamMember member(String userId, String roleKey) {
        ProjectTeamMember m = new ProjectTeamMember();
        m.setUserId(userId);
        m.setRoleKey(roleKey);
        return m;
    }

    @Test
    void posAndScrumMasters_keepsOnlyThoseRoles() {
        Set<String> ids = ImpedimentSlaService.posAndScrumMasters(List.of(
                member("u-dev", "developer"),
                member("u-po", "product-owner"),
                member("u-sm", "scrum-master"),
                member("u-exec", "executive")));
        assertThat(ids).containsExactly("u-po", "u-sm");
    }

    @Test
    void breachMessage_includesTitleAndAge() {
        Impediment i = critical("IMP-1", "OPEN", LocalDate.parse("2026-06-01"));
        String msg = ImpedimentSlaService.breachMessage(i, LocalDate.parse("2026-06-05"));
        assertThat(msg).contains("Payments gateway down").contains("4 day(s)");
    }

    @Test
    void sweep_freshBreach_notifiesRecipientsAndRecordsEventOnce() {
        Impediment breached = critical("IMP-1", "OPEN", LocalDate.now().minusDays(3));
        when(impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED"))
                .thenReturn(List.of(breached));
        when(events.existsByAggregateIdAndEventType("IMP-1", ImpedimentSlaService.NOTIFIED_EVENT))
                .thenReturn(false);
        when(teamMembers.findByProjectIdOrderByCreatedAtAsc("PROJ-1"))
                .thenReturn(List.of(member("u-po", "product-owner"), member("u-sm", "scrum-master")));

        int n = service.sweep();

        assertThat(n).isEqualTo(1);
        verify(notifications, times(2)).save(any());
        verify(eventService).recordInWorkspace(eq("WS-1"), eq("IMP-1"),
                eq(ImpedimentSlaService.NOTIFIED_EVENT), eq("system"), any());
    }

    @Test
    void sweep_alreadyNotified_isSkipped() {
        Impediment breached = critical("IMP-1", "OPEN", LocalDate.now().minusDays(5));
        when(impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED"))
                .thenReturn(List.of(breached));
        when(events.existsByAggregateIdAndEventType("IMP-1", ImpedimentSlaService.NOTIFIED_EVENT))
                .thenReturn(true);

        int n = service.sweep();

        assertThat(n).isZero();
        verify(notifications, never()).save(any());
        verify(eventService, never()).recordInWorkspace(anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void sweep_withinSla_doesNotNotify() {
        Impediment fresh = critical("IMP-1", "OPEN", LocalDate.now()); // age 0, within 1-day SLA
        when(impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED"))
                .thenReturn(List.of(fresh));

        int n = service.sweep();

        assertThat(n).isZero();
        verify(notifications, never()).save(any());
        verify(events, never()).existsByAggregateIdAndEventType(anyString(), anyString());
    }
}
