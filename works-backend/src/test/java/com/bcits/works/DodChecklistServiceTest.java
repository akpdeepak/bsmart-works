package com.bcits.works;

import com.bcits.works.auth.RbacService;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.workitems.DodChecklist;
import com.bcits.works.workitems.DodChecklistItem;
import com.bcits.works.workitems.DodChecklistItemRepository;
import com.bcits.works.workitems.DodChecklistRepository;
import com.bcits.works.workitems.DodChecklistService;
import com.bcits.works.workitems.DodChecklistState;
import com.bcits.works.workitems.DodChecklistStateRepository;
import com.bcits.works.workitems.api.WorkItem;
import com.bcits.works.workitems.api.WorkItemRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Definition-of-Done checklists (Cap U, iteration 14): the done-status rule, the resolution gate,
 * and the cross-tenant guard on delete (RB-40 §1). Pure mocks, no DB.
 */
@Tag("unit")
class DodChecklistServiceTest {

    private final DodChecklistRepository checklists = mock(DodChecklistRepository.class);
    private final DodChecklistItemRepository items = mock(DodChecklistItemRepository.class);
    private final DodChecklistStateRepository states = mock(DodChecklistStateRepository.class);
    private final WorkItemRepository workItems = mock(WorkItemRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService events = mock(EventService.class);
    private final DodChecklistService service =
        new DodChecklistService(checklists, items, states, workItems, rbac, events);

    @Test
    void isDoneStatus_matchesDoneCategoryNames() {
        assertThat(DodChecklistService.isDoneStatus("Done")).isTrue();
        assertThat(DodChecklistService.isDoneStatus("Resolved")).isTrue();
        assertThat(DodChecklistService.isDoneStatus("Closed")).isTrue();
        assertThat(DodChecklistService.isDoneStatus("In Progress")).isFalse();
        assertThat(DodChecklistService.isDoneStatus(null)).isFalse();
    }

    private void wireWorkItem(String type) {
        WorkItem wi = new WorkItem();
        wi.setId("WRK-1");
        wi.setType(type);
        when(workItems.findById("WRK-1")).thenReturn(Optional.of(wi));
        when(rbac.workspaceForWorkItem("WRK-1")).thenReturn("WS-001");
    }

    private DodChecklistItem item(long id, boolean required) {
        DodChecklistItem it = new DodChecklistItem();
        it.setId(id);
        it.setLabel("item " + id);
        it.setRequired(required);
        it.setPosition((int) id);
        return it;
    }

    @Test
    void assertResolvable_throwsConflict_whenRequiredItemUnchecked() {
        wireWorkItem("Story");
        DodChecklist c = new DodChecklist();
        c.setId("DOD-1");
        when(checklists.findByWorkspaceIdAndScopeTypeAndScopeRef("WS-001", "TYPE", "Story"))
            .thenReturn(Optional.of(c));
        when(items.findByChecklistIdOrderByPosition("DOD-1")).thenReturn(List.of(item(1, true)));
        when(states.findByWorkItemId("WRK-1")).thenReturn(List.of());   // nothing checked

        assertThatThrownBy(() -> service.assertResolvable("WRK-1", "u"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void assertResolvable_passes_whenAllRequiredChecked() {
        wireWorkItem("Story");
        DodChecklist c = new DodChecklist();
        c.setId("DOD-1");
        when(checklists.findByWorkspaceIdAndScopeTypeAndScopeRef("WS-001", "TYPE", "Story"))
            .thenReturn(Optional.of(c));
        when(items.findByChecklistIdOrderByPosition("DOD-1")).thenReturn(List.of(item(1, true), item(2, false)));
        DodChecklistState checked = new DodChecklistState();
        checked.setChecklistItemId(1L);
        checked.setChecked(true);
        when(states.findByWorkItemId("WRK-1")).thenReturn(List.of(checked));

        assertThatCode(() -> service.assertResolvable("WRK-1", "u")).doesNotThrowAnyException();
    }

    @Test
    void assertResolvable_passes_whenNoChecklistConfigured() {
        wireWorkItem("Bug");
        when(checklists.findByWorkspaceIdAndScopeTypeAndScopeRef(anyString(), anyString(), anyString()))
            .thenReturn(Optional.empty());
        assertThatCode(() -> service.assertResolvable("WRK-1", "u")).doesNotThrowAnyException();
    }

    @Test
    void delete_crossWorkspaceChecklist_is404() {
        // Caller is admin in WS-001 but the checklist belongs to WS-002 — must 404, never delete.
        DodChecklist other = new DodChecklist();
        other.setId("DOD-X");
        other.setWorkspaceId("WS-002");
        when(checklists.findById("DOD-X")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> service.delete("WS-001", "admin", "DOD-X"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(checklists, never()).delete(any());
    }

    @Test
    void create_requiresManageProjects() {
        doThrow(ApiException.forbidden("nope")).when(rbac).require("u", "WS-001", "manage_projects");
        assertThatThrownBy(() -> service.create("WS-001", "u", "TYPE", "Story", "DoD", List.of()))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
