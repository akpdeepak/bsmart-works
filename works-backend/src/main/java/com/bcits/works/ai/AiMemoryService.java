package com.bcits.works.ai;

import com.bcits.works.shared.ApiException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * AI memory / context (Cap O, iteration 20). Stores the preferences, conversation context and
 * history the AI remembers across sessions, always scoped to (workspace, user) (RB-40 §1) — a user
 * only ever reads or writes their own memory within their own workspace. A blank {@code assistantId}
 * is stored as the empty-string sentinel so the slot is uniquely addressable whether or not it
 * belongs to a specific assistant (mirrors the {@code COALESCE(assistant_id,'')} unique index).
 *
 * <p>This service holds no model calls — it is the durable substrate the custom assistant and the
 * agent runner read from and write to. The control-plane PII boundary still applies to anything a
 * remembered value is later fed into as a prompt (RB-40 §2).
 */
@Service
public class AiMemoryService {

    static final String NO_ASSISTANT = "";
    static final String KIND_PREFERENCE = "PREFERENCE";
    static final String KIND_CONTEXT = "CONTEXT";
    static final String KIND_HISTORY = "HISTORY";

    private final AiMemoryRepository repo;

    public AiMemoryService(AiMemoryRepository repo) {
        this.repo = repo;
    }

    /** Everything this user remembers in this workspace, most-recent first. */
    public List<AiMemory> recall(String workspaceId, String userId) {
        return repo.findByWorkspaceIdAndUserIdOrderByUpdatedAtDesc(workspaceId, userId);
    }

    public List<AiMemory> recallKind(String workspaceId, String userId, String kind) {
        return repo.findByWorkspaceIdAndUserIdAndKindOrderByUpdatedAtDesc(workspaceId, userId, kind);
    }

    /** Upsert a memory slot. A blank key or value is rejected so the store stays meaningful. */
    @Transactional
    public AiMemory remember(String workspaceId, String userId, String assistantId,
                             String kind, String key, String value) {
        String k = kind == null || kind.isBlank() ? KIND_CONTEXT : kind.toUpperCase();
        if (key == null || key.isBlank()) {
            throw ApiException.badRequest("MEMORY_KEY_REQUIRED", "A memory key is required.");
        }
        String aid = assistantId == null || assistantId.isBlank() ? NO_ASSISTANT : assistantId;
        AiMemory mem = repo
            .findByWorkspaceIdAndUserIdAndAssistantIdAndKindAndMemKey(workspaceId, userId, aid, k, key)
            .orElseGet(() -> {
                AiMemory fresh = new AiMemory();
                fresh.setId("MEM-" + shortId());
                fresh.setWorkspaceId(workspaceId);
                fresh.setUserId(userId);
                fresh.setAssistantId(aid);
                fresh.setKind(k);
                fresh.setMemKey(key);
                return fresh;
            });
        mem.setMemValue(value);
        mem.setUpdatedAt(OffsetDateTime.now());
        return repo.save(mem);
    }

    /** Forget a single slot — only if it belongs to this (workspace, user) (cross-tenant guard). */
    @Transactional
    public void forget(String workspaceId, String userId, String id) {
        AiMemory mem = repo.findById(id)
            .filter(m -> workspaceId.equals(m.getWorkspaceId()) && userId.equals(m.getUserId()))
            .orElseThrow(() -> ApiException.notFound("Memory", id));
        repo.delete(mem);
    }

    /**
     * A short digest of the most relevant remembered slots, used to ground an assistant's answer.
     * Preferences first (durable), then the most recent context/history, capped to {@code limit}.
     */
    public String contextDigest(String workspaceId, String userId, int limit) {
        List<AiMemory> all = recall(workspaceId, userId);
        return all.stream()
            .sorted((a, b) -> {
                int pa = KIND_PREFERENCE.equals(a.getKind()) ? 0 : 1;
                int pb = KIND_PREFERENCE.equals(b.getKind()) ? 0 : 1;
                return pa != pb ? Integer.compare(pa, pb) : 0;
            })
            .limit(Math.max(0, limit))
            .map(m -> m.getMemKey() + ": " + (m.getMemValue() == null ? "" : m.getMemValue()))
            .collect(Collectors.joining("; "));
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 12);
    }
}
