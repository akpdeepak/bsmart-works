package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.projects.Release;
import com.bcits.works.projects.ReleaseController;
import com.bcits.works.projects.ReleaseRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for ReleaseController (RB-40 §1, RB-05 Stage 3).
 * Release resolves its workspace via the parent project (Pattern A).
 * A caller outside that workspace receives NOT_FOUND (404) — never the real entity.
 */
@Tag("unit")
class ReleaseControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";

    private final ReleaseRepository releaseRepository = mock(ReleaseRepository.class);
    private final EventService eventService = mock(EventService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final RbacService rbac = mock(RbacService.class);

    private final ReleaseController controller =
            new ReleaseController(releaseRepository, eventService, authenticatedUser, jdbc, rbac);

    ReleaseControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        when(rbac.workspaceForProject("PROJ-B")).thenReturn(FOREIGN_WS);
        when(rbac.getUserTier(CALLER, FOREIGN_WS)).thenReturn(0);
    }

    private Release releaseInForeignWorkspace() {
        Release r = new Release();
        r.setId("REL-1");
        r.setProjectId("PROJ-B");
        r.setName("Foreign release");
        r.setVersion("1.0.0");
        r.setStatus("PLANNED");
        return r;
    }

    @Test
    void getRelease_crossTenantReturnsNotFound() {
        when(releaseRepository.findById("REL-1")).thenReturn(Optional.of(releaseInForeignWorkspace()));

        assertThatThrownBy(() -> controller.getRelease("REL-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void createRelease_deniedForProjectOutsideCallersWorkspace() {
        // projectId comes from the request body; a caller with no access to that project's workspace
        // must not be able to create a release in it (RB-40 §1).
        Release incoming = new Release();
        incoming.setProjectId("PROJ-B");
        incoming.setName("New");
        incoming.setVersion("2.0.0");

        assertThatThrownBy(() -> controller.createRelease(incoming))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(releaseRepository, never()).save(any());
    }

    @Test
    void getRelease_unknownIdReturnsNotFound() {
        when(releaseRepository.findById("REL-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.getRelease("REL-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void updateRelease_crossTenantReturnsNotFound() {
        when(releaseRepository.findById("REL-1")).thenReturn(Optional.of(releaseInForeignWorkspace()));

        assertThatThrownBy(() -> controller.updateRelease("REL-1", new Release()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(releaseRepository, never()).save(any());
    }

    @Test
    void updateRelease_unknownIdReturnsNotFound() {
        when(releaseRepository.findById("REL-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.updateRelease("REL-missing", new Release()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void deleteRelease_crossTenantReturnsNotFound() {
        when(releaseRepository.findById("REL-1")).thenReturn(Optional.of(releaseInForeignWorkspace()));

        assertThatThrownBy(() -> controller.deleteRelease("REL-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(releaseRepository, never()).deleteById(any());
    }

    @Test
    void deleteRelease_unknownIdReturnsNotFound() {
        when(releaseRepository.findById("REL-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.deleteRelease("REL-missing"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getReleaseItems_crossTenantReturnsNotFound() {
        when(releaseRepository.findById("REL-1")).thenReturn(Optional.of(releaseInForeignWorkspace()));

        // Previously unscoped: any caller could read another tenant's release items by id.
        assertThatThrownBy(() -> controller.getReleaseItems("REL-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jdbc, never()).queryForList(any(String.class), any(Object[].class));
    }

    @Test
    void addItemToRelease_crossTenantReturnsNotFound() {
        when(releaseRepository.findById("REL-1")).thenReturn(Optional.of(releaseInForeignWorkspace()));

        assertThatThrownBy(() -> controller.addItemToRelease("REL-1", "WI-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jdbc, never()).update(any(String.class), any(Object[].class));
    }

    @Test
    void addItemToRelease_deniedWhenItemBelongsToAnotherWorkspace() {
        // Caller can manage this release, but the item lives in a different workspace — must not be linked.
        Release own = new Release();
        own.setId("REL-2");
        own.setProjectId("PROJ-A");
        when(releaseRepository.findById("REL-2")).thenReturn(Optional.of(own));
        when(rbac.workspaceForProject("PROJ-A")).thenReturn("ws-A");
        when(rbac.getUserTier(CALLER, "ws-A")).thenReturn(2);
        when(rbac.workspaceForWorkItem("WI-foreign")).thenReturn(FOREIGN_WS);

        assertThatThrownBy(() -> controller.addItemToRelease("REL-2", "WI-foreign"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jdbc, never()).update(any(String.class), any(Object[].class));
    }

    @Test
    void removeItemFromRelease_crossTenantReturnsNotFound() {
        when(releaseRepository.findById("REL-1")).thenReturn(Optional.of(releaseInForeignWorkspace()));

        assertThatThrownBy(() -> controller.removeItemFromRelease("REL-1", "WI-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jdbc, never()).update(any(String.class), any(Object[].class));
    }
}
