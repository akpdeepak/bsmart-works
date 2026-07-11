package com.bcits.works.projects;

import com.bcits.works.EmailService;
import com.bcits.works.NotificationRepository;
import com.bcits.works.shared.AppEvent;
import com.bcits.works.shared.EventRepository;
import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the impediment SLA-breach notifier (RB-05 Stage 3). Covers the pure
 * recipient/message/reminder helpers and the sweep's gates: only CRITICAL breaches escalate,
 * a recently-escalated breach is skipped, a breach past the reminder window re-escalates, and a
 * fresh breach notifies recipients (in-app + email) + records the ledger event once per window.
 */
@Tag("unit")
class ImpedimentSlaServiceTest {

    private static final long REMINDER_HOURS = 24;
    private final ImpedimentRepository impediments = mock(ImpedimentRepository.class);
    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final ProjectTeamMemberRepository teamMembers = mock(ProjectTeamMemberRepository.class);
    private final EventRepository events = mock(EventRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final EmailService emailService = mock(EmailService.class);

    private final ImpedimentSlaService service =
            new ImpedimentSlaService(impediments, notifications, teamMembers, events, eventService,
                    emailService, null, REMINDER_HOURS);

    private static AppEvent notifiedAt(OffsetDateTime when) {
        AppEvent e = new AppEvent();
        e.setOccurredAt(when);
        return e;
    }

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
    void reminderDue_trueWhenNeverOrOlderThanWindow() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-13T12:00:00Z");
        assertThat(ImpedimentSlaService.reminderDue(null, now, 24)).isTrue();           // never escalated
        assertThat(ImpedimentSlaService.reminderDue(now.minusHours(25), now, 24)).isTrue();  // past window
        assertThat(ImpedimentSlaService.reminderDue(now.minusHours(2), now, 24)).isFalse();  // within window
    }

    @Test
    void sweep_freshBreach_notifiesRecipientsViaInAppAndEmailAndRecordsEvent() {
        Impediment breached = critical("IMP-1", "OPEN", LocalDate.now().minusDays(3));
        when(impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED"))
                .thenReturn(List.of(breached));
        when(events.findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc("IMP-1", ImpedimentSlaService.NOTIFIED_EVENT))
                .thenReturn(Optional.empty());
        when(teamMembers.findByProjectIdOrderByCreatedAtAsc("PROJ-1"))
                .thenReturn(List.of(member("u-po", "product-owner"), member("u-sm", "scrum-master")));

        int n = service.sweep();

        assertThat(n).isEqualTo(1);
        verify(notifications, times(2)).save(any());
        verify(emailService).sendSlaBreachEmail(eq("u-po"), eq("Payments gateway down"), eq(3L), anyString());
        verify(emailService).sendSlaBreachEmail(eq("u-sm"), eq("Payments gateway down"), eq(3L), anyString());
        verify(eventService).recordInWorkspace(eq("WS-1"), eq("IMP-1"),
                eq(ImpedimentSlaService.NOTIFIED_EVENT), eq("system"), any());
    }

    @Test
    void sweep_escalatedWithinWindow_isSkipped() {
        Impediment breached = critical("IMP-1", "OPEN", LocalDate.now().minusDays(5));
        when(impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED"))
                .thenReturn(List.of(breached));
        when(events.findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc("IMP-1", ImpedimentSlaService.NOTIFIED_EVENT))
                .thenReturn(Optional.of(notifiedAt(OffsetDateTime.now().minusHours(2)))); // recent

        int n = service.sweep();

        assertThat(n).isZero();
        verify(notifications, never()).save(any());
        verify(emailService, never()).sendSlaBreachEmail(anyString(), anyString(), anyLong(), anyString());
        verify(eventService, never()).recordInWorkspace(anyString(), anyString(), anyString(), anyString(), any());
    }

    @Test
    void sweep_pastReminderWindow_reEscalates() {
        Impediment breached = critical("IMP-1", "OPEN", LocalDate.now().minusDays(5));
        when(impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED"))
                .thenReturn(List.of(breached));
        when(events.findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc("IMP-1", ImpedimentSlaService.NOTIFIED_EVENT))
                .thenReturn(Optional.of(notifiedAt(OffsetDateTime.now().minusHours(30)))); // older than 24h window
        when(teamMembers.findByProjectIdOrderByCreatedAtAsc("PROJ-1"))
                .thenReturn(List.of(member("u-po", "product-owner")));

        int n = service.sweep();

        assertThat(n).isEqualTo(1);
        verify(notifications, times(1)).save(any());
        verify(emailService).sendSlaBreachEmail(eq("u-po"), anyString(), anyLong(), anyString());
        verify(eventService).recordInWorkspace(eq("WS-1"), eq("IMP-1"),
                eq(ImpedimentSlaService.NOTIFIED_EVENT), eq("system"), any());
    }

    @Test
    void sweep_withinSla_doesNotNotify() {
        Impediment fresh = critical("IMP-1", "OPEN", LocalDate.now()); // age 0, within 1-day SLA
        when(impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED"))
                .thenReturn(List.of(fresh));

        int n = service.sweep();

        assertThat(n).isZero();
        verify(notifications, never()).save(any());
        verify(events, never()).findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc(anyString(), anyString());
    }
}
