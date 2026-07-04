package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.AuthenticatedUser;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the PII-flagged custom-field routing (RB-40 §3, EPIC-P1-pii-vault Slice 4b):
 * setValue tokenizes a PII field's text value into the vault, and getValues resolves it at render.
 */
@Tag("unit")
class FieldDefControllerPiiTest {

    private static final String CALLER = "user-A";
    private static final String WS = "WS-1";

    private final FieldDefRepository fieldDefRepo = mock(FieldDefRepository.class);
    private final WorkItemFieldValueRepository valueRepo = mock(WorkItemFieldValueRepository.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final RbacService rbac = mock(RbacService.class);
    private final FieldVisibilityService fieldVisibility = mock(FieldVisibilityService.class);
    private final CustomerAttributionPiiService fieldValuePii = mock(CustomerAttributionPiiService.class);

    private final FieldDefController controller =
        new FieldDefController(fieldDefRepo, valueRepo, authenticatedUser, rbac, fieldVisibility, fieldValuePii);

    FieldDefControllerPiiTest() {
        when(authenticatedUser.id()).thenReturn(CALLER);
    }

    private static FieldDef piiField() {
        FieldDef fd = new FieldDef();
        fd.setId("FD-1");
        fd.setWorkspaceId(WS);
        fd.setName("SSN");
        fd.setFieldType("TEXT");
        fd.setPii(true);
        return fd;
    }

    @Test
    void setValue_tokenizesPiiFieldTextValueIntoTheVault() {
        when(rbac.workspaceForWorkItem("WI-1")).thenReturn(WS);
        when(rbac.getUserTier(CALLER, WS)).thenReturn(2);
        when(fieldVisibility.resolveFieldVisibility("FD-1", WS, 2)).thenReturn("EDITABLE");
        when(valueRepo.findByWorkItemIdAndFieldDefId("WI-1", "FD-1")).thenReturn(Optional.empty());
        when(fieldDefRepo.findById("FD-1")).thenReturn(Optional.of(piiField()));
        when(fieldValuePii.ensureVaulted(WS, null, "123-45-6789")).thenReturn("subj-fv");
        when(valueRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        WorkItemFieldValue out = controller.setValue("WI-1", "FD-1", Map.of("valueText", "123-45-6789"));

        verify(fieldValuePii).ensureVaulted(WS, null, "123-45-6789");
        assertThat(out.getSubjectToken()).isEqualTo("subj-fv");
        assertThat(out.getValueText()).isEqualTo("123-45-6789"); // legacy dual-write retained until CONTRACT
    }

    @Test
    void getValues_resolvesPiiFieldValueFromTheVaultAtRender() {
        WorkItemFieldValue fv = new WorkItemFieldValue();
        fv.setId("FV-1");
        fv.setWorkItemId("WI-1");
        fv.setFieldDefId("FD-1");
        fv.setValueText("legacy");
        fv.setSubjectToken("subj-fv");

        when(valueRepo.findByWorkItemId("WI-1")).thenReturn(List.of(fv));
        when(rbac.workspaceForWorkItem("WI-1")).thenReturn(WS);
        when(fieldVisibility.resolveForUser(CALLER, WS))
            .thenReturn(new FieldVisibilityService.FieldVisibilitySets(Set.of(), Set.of()));
        when(fieldDefRepo.findAllById(anySet())).thenReturn(List.of(piiField()));
        when(fieldValuePii.resolve(WS, "subj-fv", "legacy")).thenReturn("123-45-6789");

        List<WorkItemFieldValue> out = controller.getValues("WI-1");

        assertThat(out).hasSize(1);
        assertThat(out.get(0).getValueText()).isEqualTo("123-45-6789");
    }
}
