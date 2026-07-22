package com.bcits.works.messaging;

import com.bcits.works.Decision;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * EPIC-9 message→artifact conversion: a slash-command message creates a real, workspace-scoped
 * artifact and the returned ref is the created entity's id (the former stub returned a random UUID
 * pointing at nothing).
 */
@Tag("unit")
class MessageArtifactServiceTest {

    private final ActionItemRepository actionItems = mock(ActionItemRepository.class);
    private final DecisionRepository decisions = mock(DecisionRepository.class);
    private final MessageArtifactService service = new MessageArtifactService(actionItems, decisions);

    @Test
    void task_createsRealActionItem_scopedToWorkspace_refIsItsId() {
        when(actionItems.save(org.mockito.ArgumentMatchers.any(ActionItem.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        MessageArtifactService.Artifact a = service.convert("WS-1", "USR-1", "/task ship the release notes");

        assertThat(a).isNotNull();
        assertThat(a.type()).isEqualTo("TASK");
        ArgumentCaptor<ActionItem> captor = ArgumentCaptor.forClass(ActionItem.class);
        verify(actionItems).save(captor.capture());
        ActionItem saved = captor.getValue();
        assertThat(saved.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(saved.getTitle()).isEqualTo("ship the release notes");
        assertThat(saved.getCreatedBy()).isEqualTo("USR-1");
        assertThat(a.ref()).isEqualTo(saved.getId());   // ref points at the row that was created
        verifyNoInteractions(decisions);
    }

    @Test
    void decision_createsRealDecision_scopedToWorkspace() {
        when(decisions.save(org.mockito.ArgumentMatchers.any(Decision.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        MessageArtifactService.Artifact a = service.convert("WS-2", "USR-9", "/decision adopt trunk-based dev");

        assertThat(a).isNotNull();
        assertThat(a.type()).isEqualTo("DECISION");
        ArgumentCaptor<Decision> captor = ArgumentCaptor.forClass(Decision.class);
        verify(decisions).save(captor.capture());
        assertThat(captor.getValue().getWorkspaceId()).isEqualTo("WS-2");
        assertThat(captor.getValue().getTitle()).isEqualTo("adopt trunk-based dev");
        assertThat(a.ref()).isEqualTo(captor.getValue().getId());
    }

    @Test
    void plainMessage_createsNothing() {
        assertThat(service.convert("WS-1", "USR-1", "just a normal message")).isNull();
        verifyNoInteractions(actionItems);
        verifyNoInteractions(decisions);
    }

    @Test
    void emptyCommandBody_createsNothing() {
        assertThat(service.convert("WS-1", "USR-1", "/task   ")).isNull();
        verifyNoInteractions(actionItems);
    }
}
