package com.bcits.works;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Cap W · Customer feedback aggregation business logic (I15-S11). Workspace-scoped CRUD; the AI
 * clustering surface lives in {@link Iteration15AiService}. {@link #lexiconSentiment} is the
 * deterministic sentiment default (and the fallback the clustering feature reuses). Pure helpers are
 * DB-free for unit testing.
 */
@Service
public class CustomerFeedbackService {

    private final CustomerFeedbackRepository repo;
    private final RbacService rbac;
    private final EventService events;

    public CustomerFeedbackService(CustomerFeedbackRepository repo, RbacService rbac, EventService events) {
        this.repo = repo;
        this.rbac = rbac;
        this.events = events;
    }

    private void requireWs(String callerId, String wsId, String permission) {
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Workspace", wsId);
        }
        rbac.require(callerId, wsId, permission);
    }

    private CustomerFeedback loadForMember(String callerId, String id) {
        CustomerFeedback f = repo.findById(id).orElseThrow(() -> ApiException.notFound("Feedback", id));
        if (f.getWorkspaceId() == null || rbac.getUserTier(callerId, f.getWorkspaceId()) < 1) {
            throw ApiException.notFound("Feedback", id);
        }
        return f;
    }

    /** Naive lexicon sentiment — the deterministic default and the clustering fallback. Pure. */
    static String lexiconSentiment(String content) {
        String t = content == null ? "" : content.toLowerCase(Locale.ROOT);
        int pos = count(t, "love", "great", "excellent", "good", "easy", "fast", "helpful", "thanks", "perfect");
        int neg = count(t, "hate", "bad", "slow", "broken", "bug", "confusing", "crash", "terrible", "frustrat", "wrong");
        if (neg > pos) return "NEGATIVE";
        if (pos > neg) return "POSITIVE";
        return "NEUTRAL";
    }

    private static int count(String text, String... keys) {
        int n = 0;
        for (String k : keys) {
            if (text.contains(k)) n++;
        }
        return n;
    }

    CustomerFeedback prepareNew(CustomerFeedback f, String callerId) {
        f.setId("FBK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        f.setCreatedBy(callerId);
        if (f.getSource() == null) f.setSource("PORTAL");
        if (f.getStatus() == null) f.setStatus("NEW");
        if (f.getSentiment() == null || f.getSentiment().isBlank()) {
            f.setSentiment(lexiconSentiment(f.getContent()));
        }
        f.setCreatedAt(OffsetDateTime.now());
        f.setUpdatedAt(OffsetDateTime.now());
        return f;
    }

    void applyUpdate(CustomerFeedback existing, CustomerFeedback updated) {
        existing.setSource(updated.getSource());
        existing.setCustomer(updated.getCustomer());
        existing.setContent(updated.getContent());
        existing.setSentiment(updated.getSentiment());
        existing.setTheme(updated.getTheme());
        existing.setStatus(updated.getStatus());
        existing.setLinkedWorkItemId(updated.getLinkedWorkItemId());
        existing.setProjectId(updated.getProjectId());
        existing.setUpdatedAt(OffsetDateTime.now());
    }

    // ── Reads ──────────────────────────────────────────────────────────────────
    public List<CustomerFeedback> list(String callerId, String workspaceId) {
        requireWs(callerId, workspaceId, "view_items");
        return repo.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId);
    }

    // ── Writes ──────────────────────────────────────────────────────────────────
    @Transactional
    public CustomerFeedback create(String callerId, CustomerFeedback in) {
        requireWs(callerId, in.getWorkspaceId(), "create_items");
        CustomerFeedback saved = repo.save(prepareNew(in, callerId));
        events.recordInWorkspace(saved.getWorkspaceId(), saved.getId(), "FEEDBACK_CAPTURED", callerId,
                Map.of("source", saved.getSource(), "sentiment", saved.getSentiment()));
        return saved;
    }

    @Transactional
    public CustomerFeedback update(String callerId, String id, CustomerFeedback updated) {
        CustomerFeedback existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "create_items");
        applyUpdate(existing, updated);
        return repo.save(existing);
    }

    @Transactional
    public void delete(String callerId, String id) {
        CustomerFeedback existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "delete_items");
        existing.setDeletedAt(OffsetDateTime.now());
        repo.save(existing);
    }
}
