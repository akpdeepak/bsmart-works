package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.FieldVisibilityService;
import com.bcits.works.security.CustomerAttributionPiiService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cross-tenant access tests for FieldDefController (RB-40 §1, RB-05 Stage 3).
 * FieldDef carries workspaceId directly (Pattern B).
 * A caller whose workspace differs is denied with FORBIDDEN (403) before any mutation runs.
 */
@Tag("unit")
class FieldDefControllerAccessTest {

    private static final String CALLER = "user-A";
    private static final String FOREIGN_WS = "ws-B";
    private static final String PERM = "view_items";

    private final FieldDefRepository fieldDefRepo = mock(FieldDefRepository.class);
    private final WorkItemFieldValueRepository valueRepo = mock(WorkItemFieldValueRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final FieldVisibilityService fieldVisibility = mock(FieldVisibilityService.class);
    private final CustomerAttributionPiiService fieldValuePii = mock(CustomerAttributionPiiService.class);

    private final FieldDefController controller =
            new FieldDefController(fieldDefRepo, valueRepo, authenticatedUser, rbac, fieldVisibility, fieldValuePii);

    FieldDefControllerAccessTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(CALLER), eq(FOREIGN_WS), eq(PERM));
    }

    private FieldDef fieldDefInForeignWorkspace() {
        FieldDef fd = new FieldDef();
        fd.setId("FD-1");
        fd.setWorkspaceId(FOREIGN_WS);
        fd.setName("Foreign field");
        fd.setFieldType("TEXT");
        return fd;
    }

    @Test
    void get_crossTenantReturnsForbidden() {
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(fieldDefInForeignWorkspace()));

        assertThatThrownBy(() -> controller.get("FD-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void get_unknownIdReturnsNotFound() {
        when(fieldDefRepo.findById("FD-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.get("FD-missing"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void update_crossTenantReturnsForbidden() {
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(fieldDefInForeignWorkspace()));

        assertThatThrownBy(() -> controller.update("FD-1", new FieldDef()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(fieldDefRepo, never()).save(any());
    }

    @Test
    void update_unknownIdReturnsNotFound() {
        when(fieldDefRepo.findById("FD-missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.update("FD-missing", new FieldDef()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void delete_crossTenantReturnsForbidden() {
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(fieldDefInForeignWorkspace()));

        assertThatThrownBy(() -> controller.delete("FD-1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(fieldDefRepo, never()).deleteById(any());
    }

    // ── create ──────────────────────────────────────────────────────────────────
    // create() previously ran with NO RBAC and NO workspace check, so any authenticated caller
    // could create a field def in any workspace. It now scopes by the workspaceId on the new record.

    @Test
    void create_crossTenantReturnsForbiddenAndPersistsNothing() {
        assertThatThrownBy(() -> controller.create(fieldDefInForeignWorkspace()))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(fieldDefRepo, never()).save(any());
    }

    @Test
    void create_inOwnWorkspacePersists() {
        FieldDef fd = new FieldDef();
        fd.setWorkspaceId("ws-A");           // caller's own workspace — require() is a no-op on the mock
        fd.setName("New field");
        fd.setFieldType("TEXT");
        when(fieldDefRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FieldDef saved = controller.create(fd);

        assertThat(saved.getId()).startsWith("FD-");
        assertThat(saved.getWorkspaceId()).isEqualTo("ws-A");
        verify(fieldDefRepo).save(any());
    }

    // ── Write-path field-level security (RB-40 §1, EPIC P1 §5) ────────────────────
    // setValue / deleteValue are the create/update/delete points for the unified
    // work_item_field_value store. A tier with a READ_ONLY or HIDDEN rule for the field must be
    // rejected with FORBIDDEN before any persistence; an EDITABLE field (the default) must NOT be
    // blocked — legitimate edits keep working.

    private static final String OWN_WS = "ws-A";
    private static final String ITEM = "WI-1";
    private static final String FIELD = "FD-7";
    private static final int TIER = 2; // MEMBER

    private void stubWritableContext(String visibility) {
        when(rbac.workspaceForWorkItem(ITEM)).thenReturn(OWN_WS);
        when(rbac.getUserTier(CALLER, OWN_WS)).thenReturn(TIER);
        when(fieldVisibility.resolveFieldVisibility(FIELD, OWN_WS, TIER)).thenReturn(visibility);
    }

    @Test
    void setValue_readOnlyFieldRejectedWithForbiddenAndPersistsNothing() {
        stubWritableContext("READ_ONLY");

        assertThatThrownBy(() -> controller.setValue(ITEM, FIELD, Map.of("valueText", "x")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getMessage()).isEqualTo("This field is read-only for your role.");
                });

        verify(valueRepo, never()).save(any());
    }

    @Test
    void setValue_hiddenFieldRejectedWithForbiddenAndPersistsNothing() {
        stubWritableContext("HIDDEN");

        assertThatThrownBy(() -> controller.setValue(ITEM, FIELD, Map.of("valueText", "x")))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(valueRepo, never()).save(any());
    }

    @Test
    void setValue_editableFieldNotBlocked() {
        stubWritableContext("EDITABLE");
        when(valueRepo.findByWorkItemIdAndFieldDefId(ITEM, FIELD)).thenReturn(Optional.empty());
        when(fieldDefRepo.findById(FIELD)).thenReturn(Optional.empty());
        when(valueRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WorkItemFieldValue saved = controller.setValue(ITEM, FIELD, Map.of("valueText", "x"));

        assertThat(saved.getValueText()).isEqualTo("x");
        verify(valueRepo).save(any());
    }

    @Test
    void deleteValue_readOnlyFieldRejectedWithForbiddenAndDeletesNothing() {
        stubWritableContext("READ_ONLY");

        assertThatThrownBy(() -> controller.deleteValue(ITEM, FIELD))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(ex.getMessage()).isEqualTo("This field is read-only for your role.");
                });

        verify(valueRepo, never()).delete(any());
    }

    @Test
    void deleteValue_hiddenFieldRejectedWithForbiddenAndDeletesNothing() {
        stubWritableContext("HIDDEN");

        assertThatThrownBy(() -> controller.deleteValue(ITEM, FIELD))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        verify(valueRepo, never()).delete(any());
    }

    @Test
    void deleteValue_editableFieldNotBlocked() {
        stubWritableContext("EDITABLE");
        when(valueRepo.findByWorkItemIdAndFieldDefId(ITEM, FIELD)).thenReturn(Optional.empty());

        controller.deleteValue(ITEM, FIELD);

        verify(valueRepo, never()).delete(any()); // nothing to delete, but no FORBIDDEN thrown
    }
}
