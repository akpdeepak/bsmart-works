package com.bcits.works;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link FunnelService} — verifies idempotency, guard conditions, and
 * payload shape for all four funnel event types (steps 2–5, HEART-METRICS.md §4).
 * Uses mocks; no DB or Spring context needed.
 */
@Tag("unit")
class FunnelServiceTest {

    private static final String WS = "WS-001";
    private static final String ACTOR = "USR-001";

    private final EventService events = mock(EventService.class);
    private final EventRepository repo = mock(EventRepository.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final FunnelService sut = new FunnelService(events, repo, jdbc);

    @BeforeEach
    void defaultNotYetEmitted() {
        when(repo.existsByWorkspaceIdAndEventType(anyString(), anyString())).thenReturn(false);
    }

    // ── Step 2: onTemplateApplied ─────────────────────────────────────────────

    @Test
    void templateApplied_emitsWorkspaceScopedEvent() {
        sut.onTemplateApplied(WS, ACTOR, "TPL-001", "Scrum");

        verify(events).recordInWorkspace(
                eq(WS), eq(WS), eq("WORKSPACE_TEMPLATE_APPLIED"), eq(ACTOR),
                argThat(m -> "TPL-001".equals(m.get("templateId")) && "Scrum".equals(m.get("templateName"))));
    }

    @Test
    void templateApplied_nullWorkspace_noEmission() {
        sut.onTemplateApplied(null, ACTOR, "TPL-001", "Scrum");
        verifyNoInteractions(events);
    }

    @Test
    void templateApplied_nullTemplateFields_safeEmptyStrings() {
        sut.onTemplateApplied(WS, ACTOR, null, null);
        verify(events).recordInWorkspace(eq(WS), eq(WS), eq("WORKSPACE_TEMPLATE_APPLIED"), eq(ACTOR),
                argThat(m -> "".equals(m.get("templateId")) && "".equals(m.get("templateName"))));
    }

    // ── Step 3: onFirstValueCandidate ────────────────────────────────────────

    @Test
    void firstValue_emitsOnceWhenNotPreviouslyEmitted() {
        sut.onFirstValueCandidate(WS, ACTOR, "PROJ-001", "WI-001", "STORY");

        verify(events).recordInWorkspace(eq(WS), eq(WS), eq("WORKSPACE_FIRST_VALUE"), eq(ACTOR),
                argThat(m -> "PROJ-001".equals(m.get("projectId"))
                          && "WI-001".equals(m.get("workItemId"))
                          && "STORY".equals(m.get("workItemType"))));
    }

    @Test
    void firstValue_idempotent_skipsIfAlreadyEmitted() {
        when(repo.existsByWorkspaceIdAndEventType(WS, "WORKSPACE_FIRST_VALUE")).thenReturn(true);

        sut.onFirstValueCandidate(WS, ACTOR, "PROJ-001", "WI-002", "STORY");

        verify(events, never()).recordInWorkspace(any(), any(), eq("WORKSPACE_FIRST_VALUE"), any(), any());
    }

    @Test
    void firstValue_nullWorkspace_noEmission() {
        sut.onFirstValueCandidate(null, ACTOR, "PROJ-001", "WI-001", "STORY");
        verifyNoInteractions(events);
    }

    @Test
    void firstValue_nullProject_noEmission() {
        sut.onFirstValueCandidate(WS, ACTOR, null, "WI-001", "STORY");
        verifyNoInteractions(events);
    }

    // ── Step 4: onTeammateInvited ─────────────────────────────────────────────

    @Test
    void teammateInvited_emitsForEveryInvite() {
        sut.onTeammateInvited(WS, ACTOR, "USR-002");
        sut.onTeammateInvited(WS, ACTOR, "USR-003");

        verify(events, times(2)).recordInWorkspace(
                eq(WS), eq(WS), eq("WORKSPACE_TEAMMATE_INVITED"), eq(ACTOR), any());
    }

    @Test
    void teammateInvited_payloadContainsInvitedUserId() {
        sut.onTeammateInvited(WS, ACTOR, "USR-002");

        verify(events).recordInWorkspace(eq(WS), eq(WS), eq("WORKSPACE_TEAMMATE_INVITED"), eq(ACTOR),
                argThat(m -> "USR-002".equals(m.get("invitedUserId"))));
    }

    @Test
    void teammateInvited_nullWorkspace_noEmission() {
        sut.onTeammateInvited(null, ACTOR, "USR-002");
        verifyNoInteractions(events);
    }

    // ── Step 5: onMeaningfulAction (day-2 return) ─────────────────────────────

    @Test
    void meaningfulAction_emitsWhenInWindow() {
        OffsetDateTime yesterday = OffsetDateTime.now(ZoneOffset.UTC).minusDays(2);
        when(jdbc.queryForObject(anyString(), eq(OffsetDateTime.class), eq(WS))).thenReturn(yesterday);

        sut.onMeaningfulAction(WS, ACTOR);

        verify(events).recordInWorkspace(eq(WS), eq(WS), eq("WORKSPACE_DAY_2_RETURN"),
                eq(ACTOR), argThat(m -> ((Long) m.get("daysSinceCreation")) >= 1L));
    }

    @Test
    void meaningfulAction_noEmitWhenTooSoon() {
        // Created only hours ago — daysSince = 0
        when(jdbc.queryForObject(anyString(), eq(OffsetDateTime.class), eq(WS)))
                .thenReturn(OffsetDateTime.now(ZoneOffset.UTC).minusHours(3));

        sut.onMeaningfulAction(WS, ACTOR);

        verify(events, never()).recordInWorkspace(any(), any(), eq("WORKSPACE_DAY_2_RETURN"), any(), any());
    }

    @Test
    void meaningfulAction_noEmitWhenTooOld() {
        // Created 31 days ago — beyond the 30-day window
        when(jdbc.queryForObject(anyString(), eq(OffsetDateTime.class), eq(WS)))
                .thenReturn(OffsetDateTime.now(ZoneOffset.UTC).minusDays(31));

        sut.onMeaningfulAction(WS, ACTOR);

        verify(events, never()).recordInWorkspace(any(), any(), eq("WORKSPACE_DAY_2_RETURN"), any(), any());
    }

    @Test
    void meaningfulAction_idempotent_skipsIfAlreadyEmitted() {
        when(repo.existsByWorkspaceIdAndEventType(WS, "WORKSPACE_DAY_2_RETURN")).thenReturn(true);

        sut.onMeaningfulAction(WS, ACTOR);

        verify(events, never()).recordInWorkspace(any(), any(), eq("WORKSPACE_DAY_2_RETURN"), any(), any());
    }

    @Test
    void meaningfulAction_nullWorkspace_noEmission() {
        sut.onMeaningfulAction(null, ACTOR);
        verifyNoInteractions(events, repo, jdbc);
    }

    // ── Resilience: exception in EventService must not propagate ─────────────

    @Test
    void templateApplied_eventServiceThrows_doesNotPropagate() {
        doThrow(new RuntimeException("DB hiccup")).when(events)
                .recordInWorkspace(anyString(), anyString(), anyString(), anyString(), any());

        sut.onTemplateApplied(WS, ACTOR, "TPL-001", "Scrum"); // must not throw
    }

    @Test
    void firstValue_eventServiceThrows_doesNotPropagate() {
        doThrow(new RuntimeException("DB hiccup")).when(events)
                .recordInWorkspace(anyString(), anyString(), anyString(), anyString(), any());

        sut.onFirstValueCandidate(WS, ACTOR, "PROJ-001", "WI-001", "STORY"); // must not throw
    }
}
