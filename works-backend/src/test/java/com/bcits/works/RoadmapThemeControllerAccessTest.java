package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for RoadmapThemeController (RB-40 §1, RB-05 Stage 3).
 * A caller outside the theme's workspace receives NOT_FOUND (404) — never the real data.
 */
@Tag("unit")
class RoadmapThemeControllerAccessTest {

    private static final String CALLER  = "user-A";
    private static final String OWN_WS  = "ws-A";
    private static final String OTHER_WS = "ws-B";

    private final RoadmapThemeRepository   repo              = mock(RoadmapThemeRepository.class);
    private final RbacService              rbac              = mock(RbacService.class);
    private final EventService             events            = mock(EventService.class);
    private final AuthenticatedUser        authenticatedUser = mock(AuthenticatedUser.class);

    private final RoadmapThemeService    service    = new RoadmapThemeService(repo, rbac, events);
    private final RoadmapThemeController controller = new RoadmapThemeController(service, authenticatedUser);

    RoadmapThemeControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.getUserTier(CALLER, OWN_WS)).thenReturn(1);
        when(rbac.getUserTier(CALLER, OTHER_WS)).thenReturn(0);
    }

    private RoadmapTheme themeInOtherWorkspace() {
        RoadmapTheme t = new RoadmapTheme();
        t.setId("THM-FOREIGN");
        t.setWorkspaceId(OTHER_WS);
        t.setName("Foreign theme");
        t.setStatus("PLANNED");
        return t;
    }

    @Test
    void list_outsideWorkspaceReturnsNotFound() {
        assertThatThrownBy(() -> controller.list(OTHER_WS))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(repo, never()).findByWorkspaceIdAndDeletedAtIsNullOrderByDisplayOrderAscCreatedAtAsc(anyString());
    }

    @Test
    void list_insideWorkspaceReturnsList() {
        when(rbac.getUserTier(CALLER, OWN_WS)).thenReturn(1);
        when(repo.findByWorkspaceIdAndDeletedAtIsNullOrderByDisplayOrderAscCreatedAtAsc(OWN_WS)).thenReturn(List.of());
        List<RoadmapTheme> result = controller.list(OWN_WS);
        assertThat(result).isEmpty();
    }

    @Test
    void update_crossTenantReturnsNotFound() {
        when(repo.findById("THM-FOREIGN")).thenReturn(java.util.Optional.of(themeInOtherWorkspace()));

        assertThatThrownBy(() -> controller.update("THM-FOREIGN", themeInOtherWorkspace()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(repo, never()).save(any());
    }

    @Test
    void delete_crossTenantReturnsNotFound() {
        when(repo.findById("THM-FOREIGN")).thenReturn(java.util.Optional.of(themeInOtherWorkspace()));

        assertThatThrownBy(() -> controller.delete("THM-FOREIGN"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(repo, never()).save(any());
    }

    @Test
    void create_outsideWorkspaceReturnsNotFound() {
        RoadmapTheme newTheme = new RoadmapTheme();
        newTheme.setWorkspaceId(OTHER_WS);
        newTheme.setName("Sneaky theme");

        assertThatThrownBy(() -> controller.create(newTheme))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(repo, never()).save(any());
    }
}
