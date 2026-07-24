package com.bcits.works.devsync;

import com.bcits.works.auth.RbacService;
import com.bcits.works.auth.api.UserRepository;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.workitems.api.WorkItem;
import com.bcits.works.workitems.api.WorkItemRepository;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Code context (Cap U, iteration 14): the shared work-item ref extractor, and the RBAC + tenant
 * guards on linking code to a work item (RB-10 §2, RB-40 §1). Pure mocks, no DB.
 */
@Tag("unit")
class CodeContextServiceTest {

    private final CodeLinkRepository codeLinks = mock(CodeLinkRepository.class);
    private final PullRequestRepository pullRequests = mock(PullRequestRepository.class);
    private final PullRequestReviewerRepository reviewers = mock(PullRequestReviewerRepository.class);
    private final WorkItemRepository workItems = mock(WorkItemRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final RbacService rbac = mock(RbacService.class);
    private final EventService events = mock(EventService.class);
    private final CodeContextService service =
        new CodeContextService(codeLinks, pullRequests, reviewers, workItems, users, rbac, events);

    @Test
    void extractWorkItemRef_findsKeyInCommitMessage() {
        assertThat(CodeContextService.extractWorkItemRef("WRK-1247: fix CSRF refresh")).isEqualTo("WRK-1247");
        assertThat(CodeContextService.extractWorkItemRef("fixes web-12 already")).isEqualTo("WEB-12");
        assertThat(CodeContextService.extractWorkItemRef("no ref here")).isNull();
        assertThat(CodeContextService.extractWorkItemRef(null)).isNull();
    }

    private void wireItem(String creator, String assignee) {
        WorkItem wi = new WorkItem();
        wi.setId("WRK-1");
        wi.setCreatedBy(creator);
        wi.setAssigneeId(assignee);
        when(workItems.findById("WRK-1")).thenReturn(Optional.of(wi));
        when(rbac.workspaceForWorkItem("WRK-1")).thenReturn("WS-001");
    }

    @Test
    void linkCode_forbidden_whenCallerCannotEditItem() {
        wireItem("someone", "another");
        when(rbac.canEdit("intruder", "WS-001", "someone", "another")).thenReturn(false);
        assertThatThrownBy(() -> service.linkCode("intruder", "WRK-1", "COMMIT", "abc123", "msg", null, null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(codeLinks, never()).save(any());
    }

    @Test
    void linkCode_rejectsUnknownKind() {
        wireItem("u", "u");
        when(rbac.canEdit("u", "WS-001", "u", "u")).thenReturn(true);
        assertThatThrownBy(() -> service.linkCode("u", "WRK-1", "MERGE", "abc", "m", null, null))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void linkCode_persists_whenAuthorized() {
        wireItem("u", "u");
        when(rbac.canEdit("u", "WS-001", "u", "u")).thenReturn(true);
        when(codeLinks.save(any(CodeLink.class))).thenAnswer(i -> i.getArgument(0));
        CodeLink saved = service.linkCode("u", "WRK-1", "commit", "abc123", "WRK-1: fix", "http://x", "a.java");
        assertThat(saved.getKind()).isEqualTo("COMMIT");
        assertThat(saved.getWorkspaceId()).isEqualTo("WS-001");
        verify(codeLinks).save(any(CodeLink.class));
    }
}
