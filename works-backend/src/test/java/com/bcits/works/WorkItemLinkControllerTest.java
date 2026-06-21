package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the work-item link list — bidirectional surfacing and perspective inversion.
 * Pure Mockito (no DB): proves that inbound links appear from the current item's point of view
 * with the relationship inverted, and that hierarchy links are excluded (the parent/children UI
 * owns those). RB-10 §7 (behaviour demonstrated).
 */
@Tag("unit")
class WorkItemLinkControllerTest {

    private final WorkItemLinkRepository linkRepository = mock(WorkItemLinkRepository.class);
    private final WorkItemRepository workItemRepository = mock(WorkItemRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final AuthenticatedUser authenticatedUser = mock(AuthenticatedUser.class);
    private final WorkItemLinkController controller =
            new WorkItemLinkController(linkRepository, workItemRepository, rbac, authenticatedUser);

    private static WorkItemLink link(long id, String source, String target, String type) {
        WorkItemLink l = new WorkItemLink();
        l.setSourceId(source);
        l.setTargetId(target);
        l.setLinkType(type);
        // id is generated; tests that need it use the row's identity through the repository mock.
        return l;
    }

    private static WorkItem item(String id, String title) {
        WorkItem w = new WorkItem();
        w.setId(id);
        w.setTitle(title);
        return w;
    }

    @Test
    void getLinks_surfacesInboundLinksInvertedAndExcludesHierarchy() {
        // Caller is a member of item A's workspace (requireItemAccess passes — #243 Slice D).
        when(authenticatedUser.id()).thenReturn("U");
        when(rbac.workspaceForWorkItem("A")).thenReturn("WS");
        when(rbac.getUserTier("U", "WS")).thenReturn(2);
        // A blocks B (outbound). C blocks A and P is A's parent (both inbound).
        when(linkRepository.findBySourceId("A")).thenReturn(List.of(link(1, "A", "B", "BLOCKS")));
        when(linkRepository.findByTargetId("A")).thenReturn(List.of(
                link(2, "C", "A", "BLOCKS"),
                link(3, "P", "A", "CHILD")));
        when(workItemRepository.findAllById(any())).thenReturn(List.of(
                item("B", "Item B"), item("C", "Item C")));

        List<WorkItemLinkController.LinkView> out = controller.getLinks("A");

        // The hierarchy (CHILD) inbound link is excluded; outbound + the blocking inbound remain.
        assertThat(out).hasSize(2);
        assertThat(out).anySatisfy(v -> {
            assertThat(v.direction()).isEqualTo("OUTBOUND");
            assertThat(v.targetId()).isEqualTo("B");
            assertThat(v.linkType()).isEqualTo("BLOCKS");
            assertThat(v.targetTitle()).isEqualTo("Item B");
        });
        assertThat(out).anySatisfy(v -> {
            assertThat(v.direction()).isEqualTo("INBOUND");
            assertThat(v.targetId()).isEqualTo("C");           // the other end
            assertThat(v.linkType()).isEqualTo("BLOCKED_BY");  // inverted from C's BLOCKS
            assertThat(v.targetTitle()).isEqualTo("Item C");
        });
    }
}
