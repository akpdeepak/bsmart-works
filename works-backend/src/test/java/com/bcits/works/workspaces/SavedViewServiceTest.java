package com.bcits.works.workspaces;
import com.bcits.works.workspaces.api.SavedView;
import com.bcits.works.workspaces.api.SavedViewRepository;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlContextFactory;
import com.bcits.works.shared.BqlExecutionService;
import com.bcits.works.security.api.BqlRunAuditService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Saved views behaviour (iteration 17, Cap R): workspace isolation and basic lifecycle
 * (RB-10 §7, RB-40 §1).
 */
@Tag("unit")
class SavedViewServiceTest {

    private static final String WS = "ws-1";
    private static final String CALLER = "user-1";

    private final SavedViewRepository repo = mock(SavedViewRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final SavedViewService svc = new SavedViewService(repo, rbac,
        mock(BqlExecutionService.class), mock(BqlContextFactory.class), mock(BqlRunAuditService.class));

    @Test
    void create_stampsIdWorkspaceAndDefaultColumnKeys() {
        when(repo.save(any(SavedView.class))).thenAnswer(i -> i.getArgument(0));

        SavedView input = new SavedView();
        input.setName("My Open Bugs");
        input.setBqlFilter("type = Bug AND status != Done");

        SavedView result = svc.create(CALLER, WS, input);

        assertThat(result.getId()).startsWith("VIEW-");
        assertThat(result.getWorkspaceId()).isEqualTo(WS);
        assertThat(result.getCreatedBy()).isEqualTo(CALLER);
        assertThat(result.getColumnKeys()).isEqualTo("[]");
        assertThat(result.getIsShared()).isFalse();
    }

    @Test
    void create_rejectsBlankName() {
        SavedView input = new SavedView();
        input.setName("  ");
        assertThatThrownBy(() -> svc.create(CALLER, WS, input))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void require_rejectsCrossWorkspace() {
        SavedView v = new SavedView();
        v.setId("VIEW-1");
        v.setWorkspaceId("other-ws");
        when(repo.findById("VIEW-1")).thenReturn(Optional.of(v));

        assertThatThrownBy(() -> svc.require(WS, "VIEW-1"))
            .isInstanceOf(ApiException.class);
    }

    @Test
    void require_rejectsSoftDeleted() {
        SavedView v = new SavedView();
        v.setId("VIEW-2");
        v.setWorkspaceId(WS);
        v.setDeletedAt(java.time.OffsetDateTime.now());
        when(repo.findById("VIEW-2")).thenReturn(Optional.of(v));

        assertThatThrownBy(() -> svc.require(WS, "VIEW-2"))
            .isInstanceOf(ApiException.class);
    }
}
