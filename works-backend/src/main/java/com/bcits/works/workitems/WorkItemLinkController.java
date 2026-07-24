package com.bcits.works.workitems;
import com.bcits.works.workitems.api.WorkItemRepository;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/work-items/{itemId}/links")
public class WorkItemLinkController {

    private final WorkItemLinkRepository linkRepository;
    private final WorkItemRepository workItemRepository;
    private final RbacGate rbac;
    private final AuthenticatedUser authenticatedUser;

    public WorkItemLinkController(WorkItemLinkRepository linkRepository,
                                  WorkItemRepository workItemRepository,
                                  RbacGate rbac,
                                  AuthenticatedUser authenticatedUser) {
        this.linkRepository = linkRepository;
        this.workItemRepository = workItemRepository;
        this.rbac = rbac;
        this.authenticatedUser = authenticatedUser;
    }

    /**
     * The caller must be a member of the work item's workspace (RB-40 §1, #243 Slice D). Work items are
     * loaded by PK here, which Hibernate's {@code @Filter} does not scope, so isolation must come from
     * this explicit re-check. Returns the resolved workspace id so callers can compare the other end.
     * 404 (not 403) on a foreign/unknown item so existence is not revealed.
     */
    private String requireItemAccess(String workItemId) {
        String ws = rbac.workspaceForWorkItem(workItemId);
        if (ws == null || rbac.getUserTier(authenticatedUser.id(), ws) < 1) {
            throw ApiException.notFound("WorkItem", workItemId);
        }
        return ws;
    }

    /** Hierarchy link types are surfaced through the parent/children UI, not the relation list. */
    private static final Set<String> HIERARCHY = Set.of("PARENT", "CHILD");

    /**
     * A link as seen from one work item's perspective: {@code targetId}/{@code targetTitle} is always
     * the <em>other</em> end, and {@code linkType} is the relationship from this item's point of view
     * (inverted for inbound links, so "X blocks me" reads as BLOCKED_BY). {@code direction} tells the
     * UI which side the row came from. Shaped to match what the detail panel already reads.
     */
    public record LinkView(Long id, String sourceId, String targetId, String linkType,
                           String targetTitle, String direction) {}

    private static String inverseType(String t) {
        if (t == null) return null;
        return switch (t) {
            case "BLOCKS" -> "BLOCKED_BY";
            case "BLOCKED_BY" -> "BLOCKS";
            case "PARENT" -> "CHILD";
            case "CHILD" -> "PARENT";
            default -> t; // RELATES_TO / DUPLICATES read the same from either side
        };
    }

    @GetMapping
    public List<LinkView> getLinks(@PathVariable String itemId) {
        requireItemAccess(itemId);
        List<WorkItemLink> outbound = linkRepository.findBySourceId(itemId);
        // Inbound links (this item is the target), excluding hierarchy which the parent/children
        // section already renders — surfacing them gives a complete "blocked by / relates to" view.
        List<WorkItemLink> inbound = linkRepository.findByTargetId(itemId).stream()
                .filter(l -> !HIERARCHY.contains(l.getLinkType())).toList();

        // Batch-load every "other end" title in one query (no N+1).
        Set<String> otherIds = new HashSet<>();
        outbound.forEach(l -> { if (l.getTargetId() != null) otherIds.add(l.getTargetId()); });
        inbound.forEach(l -> { if (l.getSourceId() != null) otherIds.add(l.getSourceId()); });
        Map<String, String> titleById = new HashMap<>();
        workItemRepository.findAllById(otherIds).forEach(t -> titleById.put(t.getId(), t.getTitle()));

        List<LinkView> out = new ArrayList<>();
        for (WorkItemLink l : outbound) {
            out.add(new LinkView(l.getId(), itemId, l.getTargetId(), l.getLinkType(),
                    titleById.get(l.getTargetId()), "OUTBOUND"));
        }
        for (WorkItemLink l : inbound) {
            out.add(new LinkView(l.getId(), itemId, l.getSourceId(), inverseType(l.getLinkType()),
                    titleById.get(l.getSourceId()), "INBOUND"));
        }
        return out;
    }

    @PostMapping
    public WorkItemLink createLink(@PathVariable String itemId, @Valid @RequestBody Map<String, String> payload) {
        String itemWs = requireItemAccess(itemId);
        String targetId = payload.get("targetId");
        String linkType = payload.get("linkType");
        if (targetId == null || targetId.isBlank()) {
            throw ApiException.badRequest("LINK_TARGET_REQUIRED", "A link target is required");
        }
        if (targetId.equals(itemId)) {
            throw ApiException.badRequest("LINK_SELF", "A work item cannot be linked to itself");
        }
        // The target must exist AND live in the same workspace — no cross-tenant linking (#243 Slice D).
        if (!itemWs.equals(rbac.workspaceForWorkItem(targetId))) {
            throw ApiException.notFound("WorkItem", targetId);
        }
        // Reject an exact duplicate of an existing link (same source, target and type).
        boolean duplicate = linkRepository.findBySourceId(itemId).stream()
                .anyMatch(l -> targetId.equals(l.getTargetId()) && Objects.equals(linkType, l.getLinkType()));
        if (duplicate) {
            throw ApiException.conflict("This link already exists");
        }
        WorkItemLink link = new WorkItemLink();
        link.setSourceId(itemId);
        link.setTargetId(targetId);
        link.setLinkType(linkType);
        link.setCreatedAt(OffsetDateTime.now());
        WorkItemLink saved = linkRepository.save(link);
        workItemRepository.findById(saved.getTargetId()).ifPresent(t -> saved.setTargetTitle(t.getTitle()));
        return saved;
    }

    @DeleteMapping("/{linkId}")
    public void deleteLink(@PathVariable String itemId, @PathVariable Long linkId) {
        requireItemAccess(itemId);
        // The link must actually belong to this (authorized) item — guessing a linkId from another
        // tenant under your own itemId path must not delete it (#243 Slice D).
        WorkItemLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> ApiException.notFound("WorkItemLink", String.valueOf(linkId)));
        if (!itemId.equals(link.getSourceId()) && !itemId.equals(link.getTargetId())) {
            throw ApiException.notFound("WorkItemLink", String.valueOf(linkId));
        }
        linkRepository.deleteById(linkId);
    }
}

