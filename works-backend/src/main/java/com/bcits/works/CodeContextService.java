package com.bcits.works;

import com.bcits.works.auth.User;
import com.bcits.works.auth.UserRepository;
import com.bcits.works.shared.RbacGate;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;
import com.bcits.works.workitems.WorkItem;
import com.bcits.works.workitems.WorkItemRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Code context on a work item (Cap U, iteration 14): commits, branches and pull requests linked to
 * an item, plus the pull-request store the code review queue reads from. The IDE extensions and the
 * {@code works} CLI write here via {@link #linkCode} ("inline commit linking"); the web work-item
 * panel reads via {@link #contextForWorkItem}. Workspace-scoped + RBAC-gated in the service (RB-10
 * §2, RB-40 §1); a cross-workspace work-item reference is rejected.
 */
@Service
public class CodeContextService {

    private final CodeLinkRepository codeLinks;
    private final PullRequestRepository pullRequests;
    private final PullRequestReviewerRepository reviewers;
    private final WorkItemRepository workItems;
    private final UserRepository users;
    private final RbacGate rbac;
    private final EventService events;

    public CodeContextService(CodeLinkRepository codeLinks, PullRequestRepository pullRequests,
                              PullRequestReviewerRepository reviewers, WorkItemRepository workItems,
                              UserRepository users, RbacGate rbac, EventService events) {
        this.codeLinks = codeLinks;
        this.pullRequests = pullRequests;
        this.reviewers = reviewers;
        this.workItems = workItems;
        this.users = users;
        this.rbac = rbac;
        this.events = events;
    }

    // ── Linking (IDE / CLI inline commit linking) ─────────────────────────────────

    /** Parse a work item id out of free text (commit message / branch name), e.g. "WRK-1247: fix".
     *  Pure + static so it is the shared, unit-tested linker used by the IDE, CLI and commit-summary
     *  AI fallback. */
    public static String extractWorkItemRef(String text) {
        if (text == null) return null;
        java.util.regex.Matcher m =
            java.util.regex.Pattern.compile("\\b([A-Z][A-Z0-9]+-\\d+)\\b").matcher(text.toUpperCase(Locale.ROOT));
        return m.find() ? m.group(1) : null;
    }

    @Transactional
    public CodeLink linkCode(String callerId, String workItemId, String kind, String ref, String message,
                             String url, String filesTouched) {
        WorkItem wi = workItems.findById(workItemId)
            .orElseThrow(() -> ApiException.notFound("Work item", workItemId));
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId == null) throw ApiException.notFound("Work item", workItemId);
        if (!rbac.canEdit(callerId, wsId, wi.getCreatedBy(), wi.getAssigneeId())) {
            throw ApiException.forbidden("You do not have permission to link code to this work item.");
        }
        String k = kind == null ? "COMMIT" : kind.toUpperCase(Locale.ROOT);
        if (!k.equals("COMMIT") && !k.equals("BRANCH") && !k.equals("PR")) {
            throw ApiException.badRequest("INVALID_KIND", "kind must be COMMIT, BRANCH or PR.");
        }
        if (ref == null || ref.isBlank()) {
            throw ApiException.badRequest("INVALID_REF", "ref is required.");
        }
        CodeLink cl = new CodeLink();
        cl.setWorkspaceId(wsId);
        cl.setWorkItemId(workItemId);
        cl.setKind(k);
        cl.setRef(ref.trim());
        cl.setMessage(message);
        cl.setAuthorId(callerId);
        cl.setUrl(url);
        cl.setFilesTouched(filesTouched);
        cl.setCreatedAt(OffsetDateTime.now());
        CodeLink saved = codeLinks.save(cl);
        events.recordInWorkspace(wsId, workItemId, "code.linked", callerId,
            Map.of("kind", k, "ref", ref.trim()));
        return saved;
    }

    /** Commits, branches and PRs attached to a work item, plus its PR review status. */
    public Map<String, Object> contextForWorkItem(String workItemId, String callerId) {
        workItems.findById(workItemId).orElseThrow(() -> ApiException.notFound("Work item", workItemId));
        String wsId = rbac.workspaceForWorkItem(workItemId);
        if (wsId != null) rbac.require(callerId, wsId, "view_items");
        List<CodeLink> links = codeLinks.findByWorkItemIdOrderByCreatedAtDesc(workItemId);
        List<PullRequest> prs = pullRequests.findByWorkItemIdOrderByCreatedAtDesc(workItemId);
        return Map.of(
            "workItemId", workItemId,
            "links", links.stream().map(this::linkRow).toList(),
            "pullRequests", prs.stream().map(this::prRow).toList()
        );
    }

    // ── Pull request store ────────────────────────────────────────────────────────

    public List<Map<String, Object>> listPullRequests(String workspaceId, String callerId, String status) {
        rbac.require(callerId, workspaceId, "view_items");
        List<PullRequest> prs = status == null || status.isBlank()
            ? pullRequests.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId)
            : pullRequests.findByWorkspaceIdAndStatusOrderByUpdatedAtDesc(workspaceId, status.toUpperCase(Locale.ROOT));
        return prs.stream().map(this::prRow).toList();
    }

    Map<String, Object> prRow(PullRequest pr) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", pr.getId());
        m.put("repo", pr.getRepo());
        m.put("number", pr.getNumber());
        m.put("title", pr.getTitle());
        m.put("authorId", pr.getAuthorId());
        m.put("authorName", name(pr.getAuthorId()));
        m.put("status", pr.getStatus());
        m.put("url", pr.getUrl());
        m.put("workItemId", pr.getWorkItemId());
        m.put("additions", pr.getAdditions());
        m.put("deletions", pr.getDeletions());
        m.put("filesChanged", pr.getFilesChanged());
        m.put("createdAt", pr.getCreatedAt());
        m.put("updatedAt", pr.getUpdatedAt());
        List<Map<String, Object>> revs = new ArrayList<>();
        for (PullRequestReviewer r : reviewers.findByPullRequestId(pr.getId())) {
            revs.add(Map.of("reviewerId", r.getReviewerId(), "reviewerName", name(r.getReviewerId()),
                "state", r.getState()));
        }
        m.put("reviewers", revs);
        return m;
    }

    private Map<String, Object> linkRow(CodeLink cl) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", cl.getId());
        m.put("kind", cl.getKind());
        m.put("ref", cl.getRef());
        m.put("message", cl.getMessage());
        m.put("authorId", cl.getAuthorId());
        m.put("authorName", name(cl.getAuthorId()));
        m.put("url", cl.getUrl());
        m.put("filesTouched", cl.getFilesTouched() == null ? List.of()
            : java.util.Arrays.stream(cl.getFilesTouched().split("[\\r\\n,]+"))
                .map(String::trim).filter(s -> !s.isEmpty()).toList());
        m.put("createdAt", cl.getCreatedAt());
        return m;
    }

    private String name(String userId) {
        if (userId == null) return null;
        return users.findById(userId).map(User::getFullName).orElse(userId);
    }
}
