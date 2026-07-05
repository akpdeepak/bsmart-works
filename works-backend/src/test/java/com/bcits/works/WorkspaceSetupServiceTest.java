package com.bcits.works;

import com.bcits.works.workspaces.WorkspaceSetupService;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link WorkspaceSetupService} — verifies RBAC, completeness score, wizard-needed
 * flag, and WORKSPACE_CREATED funnel event emission. Uses mocks; no DB or Spring context needed.
 */
@Tag("unit")
class WorkspaceSetupServiceTest {

    private static final String WS     = "WS-001";
    private static final String CALLER = "USR-001";

    private final RbacService      rbac    = mock(RbacService.class);
    private final FunnelService    funnel  = mock(FunnelService.class);
    private final EventRepository  repo    = mock(EventRepository.class);
    private final JdbcTemplate     jdbc    = mock(JdbcTemplate.class);

    private final WorkspaceSetupService sut =
            new WorkspaceSetupService(rbac, funnel, repo, jdbc);

    @BeforeEach
    void defaults() {
        // member by default
        when(rbac.getUserTier(CALLER, WS)).thenReturn(2);
        // no funnel events emitted yet
        when(repo.existsByWorkspaceIdAndEventType(anyString(), anyString())).thenReturn(false);
        // workspace created today → it is "new"
        when(jdbc.queryForObject(contains("created_at FROM workspaces"), eq(OffsetDateTime.class), anyString()))
                .thenReturn(OffsetDateTime.now(ZoneOffset.UTC));
        // empty template list from DB
        when(jdbc.queryForList(anyString(), (Object[]) any())).thenReturn(List.of());
    }

    @Test
    void nonMember_getStatus_is404() {
        when(rbac.getUserTier(CALLER, WS)).thenReturn(0);
        assertThrows(ApiException.class, () -> sut.getSetupStatus(CALLER, WS));
    }

    @Test
    void nullWorkspace_getStatus_is404() {
        assertThrows(ApiException.class, () -> sut.getSetupStatus(CALLER, null));
    }

    @Test
    void member_getStatus_emitsWorkspaceCreated() {
        sut.getSetupStatus(CALLER, WS);
        verify(funnel).onWorkspaceCreated(WS, CALLER);
    }

    @Test
    void noStepsDone_scoreIsZero_needsWizardTrue() {
        Map<String, Object> result = sut.getSetupStatus(CALLER, WS);

        assertEquals(0, result.get("score"));
        assertTrue((Boolean) result.get("needsWizard"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> steps = (List<Map<String, Object>>) result.get("steps");
        assertTrue(steps.stream().noneMatch(s -> Boolean.TRUE.equals(s.get("done"))));
    }

    @Test
    void allStepsDone_scoreIs100_needsWizardFalse() {
        when(repo.existsByWorkspaceIdAndEventType(WS, "WORKSPACE_TEMPLATE_APPLIED")).thenReturn(true);
        when(repo.existsByWorkspaceIdAndEventType(WS, "WORKSPACE_FIRST_VALUE")).thenReturn(true);
        when(repo.existsByWorkspaceIdAndEventType(WS, "WORKSPACE_TEAMMATE_INVITED")).thenReturn(true);

        Map<String, Object> result = sut.getSetupStatus(CALLER, WS);

        assertEquals(100, result.get("score"));
        assertFalse((Boolean) result.get("needsWizard"));
    }

    @Test
    void oldWorkspace_needsWizardFalse_evenIfStepsIncomplete() {
        // workspace created 60 days ago — outside the wizard window
        when(jdbc.queryForObject(contains("created_at FROM workspaces"), eq(OffsetDateTime.class), anyString()))
                .thenReturn(OffsetDateTime.now(ZoneOffset.UTC).minusDays(60));

        Map<String, Object> result = sut.getSetupStatus(CALLER, WS);

        assertFalse((Boolean) result.get("needsWizard"));
    }

    @Test
    void partiallyDone_scoreReflectsCompletedSteps() {
        // one of three steps done
        when(repo.existsByWorkspaceIdAndEventType(WS, "WORKSPACE_TEMPLATE_APPLIED")).thenReturn(true);

        Map<String, Object> result = sut.getSetupStatus(CALLER, WS);

        // score = 1/3 rounded = 33
        assertEquals(33, result.get("score"));
        assertTrue((Boolean) result.get("needsWizard"));
    }
}
