package com.bcits.works;

import com.bcits.works.shared.ApiException;

import com.bcits.works.shared.EventService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Custom AI assistants (Cap O, iteration 20). A workspace defines named personas; users chat with
 * them. Every chat routes through {@link AiControlPlaneService#invoke} (RB-40 §2: scope, budget,
 * cache, audit and the deterministic fallback apply centrally) conditioned on the assistant's
 * persona and the user's {@link AiMemoryService remembered context}. The deterministic fallback is a
 * grounded answer assembled from that context — so AI-on and AI-off differ in narrative richness,
 * never in tenant safety. Every method is workspace-scoped (RB-40 §1); RBAC is the controller's job.
 */
@Service
public class AiAssistantService {

    private final AiAssistantRepository assistants;
    private final AiControlPlaneService controlPlane;
    private final AiMemoryService memory;
    private final EventService events;

    public AiAssistantService(AiAssistantRepository assistants, AiControlPlaneService controlPlane,
                              AiMemoryService memory, EventService events) {
        this.assistants = assistants;
        this.controlPlane = controlPlane;
        this.memory = memory;
        this.events = events;
    }

    public record ChatReply(String assistantId, String assistantName, String answer, boolean usedAi,
                            boolean fallback, String policyState, String tier, String rememberedContext) { }

    // ── CRUD ──────────────────────────────────────────────────────────────────────

    public List<AiAssistant> list(String workspaceId) {
        return assistants.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    public List<AiAssistant> listEnabled(String workspaceId) {
        return assistants.findByWorkspaceIdAndEnabledTrueOrderByName(workspaceId);
    }

    public AiAssistant get(String workspaceId, String id) {
        return assistants.findByWorkspaceIdAndId(workspaceId, id)
            .orElseThrow(() -> ApiException.notFound("AiAssistant", id));
    }

    @Transactional
    public AiAssistant create(String workspaceId, String userId, String name, String description, String persona) {
        if (name == null || name.isBlank()) {
            throw ApiException.badRequest("NAME_REQUIRED", "An assistant name is required.");
        }
        if (persona == null || persona.isBlank()) {
            throw ApiException.badRequest("PERSONA_REQUIRED", "A persona (system prompt) is required.");
        }
        OffsetDateTime now = OffsetDateTime.now();
        AiAssistant a = new AiAssistant();
        a.setId("AST-" + shortId());
        a.setWorkspaceId(workspaceId);
        a.setName(name.trim());
        a.setDescription(description);
        a.setPersona(persona);
        a.setEnabled(true);
        a.setCreatedBy(userId);
        a.setCreatedAt(now);
        a.setUpdatedAt(now);
        AiAssistant saved = assistants.save(a);
        events.recordInWorkspace(workspaceId, saved.getId(), "AI_ASSISTANT_CREATED", userId,
            java.util.Map.of("name", saved.getName()));
        return saved;
    }

    @Transactional
    public AiAssistant update(String workspaceId, String userId, String id, String name,
                              String description, String persona, Boolean enabled) {
        AiAssistant a = get(workspaceId, id);
        if (name != null && !name.isBlank()) {
            a.setName(name.trim());
        }
        if (description != null) {
            a.setDescription(description);
        }
        if (persona != null && !persona.isBlank()) {
            a.setPersona(persona);
        }
        if (enabled != null) {
            a.setEnabled(enabled);
        }
        a.setUpdatedAt(OffsetDateTime.now());
        AiAssistant saved = assistants.save(a);
        events.recordInWorkspace(workspaceId, saved.getId(), "AI_ASSISTANT_UPDATED", userId,
            java.util.Map.of("enabled", String.valueOf(saved.getEnabled())));
        return saved;
    }

    @Transactional
    public void delete(String workspaceId, String userId, String id) {
        AiAssistant a = get(workspaceId, id);
        assistants.delete(a);
        events.recordInWorkspace(workspaceId, id, "AI_ASSISTANT_DELETED", userId, java.util.Map.of());
    }

    // ── Chat ──────────────────────────────────────────────────────────────────────

    /** Ask an assistant a question. Persona + remembered context ground the answer; the exchange is
     *  written back to the user's memory so the assistant "remembers" across sessions. */
    @Transactional
    public ChatReply chat(String workspaceId, String userId, String assistantId, String message, boolean inContext) {
        AiAssistant a = get(workspaceId, assistantId);
        if (Boolean.FALSE.equals(a.getEnabled())) {
            throw ApiException.badRequest("ASSISTANT_DISABLED", "This assistant is turned off.");
        }
        if (message == null || message.isBlank()) {
            throw ApiException.badRequest("MESSAGE_REQUIRED", "A message is required.");
        }

        String remembered = memory.contextDigest(workspaceId, userId, 6);
        String draft = deterministicAnswer(a.getName(), remembered, message);
        String prompt = a.getPersona() + "\nRemembered context: " + remembered + "\nUser: " + message;

        AiControlPlaneService.AiOutcome out = controlPlane.invoke(new AiControlPlaneService.AiCall(
            workspaceId, userId, AiCapabilities.CUSTOM_ASSISTANT, prompt, draft, null, inContext));
        String answer = out.fallback() ? draft : out.text();

        // Remember the exchange (workspace+user scoped) so context survives across sessions.
        memory.remember(workspaceId, userId, assistantId, AiMemoryService.KIND_HISTORY,
            "turn:" + System.currentTimeMillis(), "Q: " + message + " | A: " + snippet(answer));
        memory.remember(workspaceId, userId, assistantId, AiMemoryService.KIND_CONTEXT,
            "last_question", message);

        events.recordInWorkspace(workspaceId, assistantId, "AI_ASSISTANT_CHAT", userId,
            java.util.Map.of("usedAi", String.valueOf(out.usedAi()), "policyState", out.policyState()));

        return new ChatReply(assistantId, a.getName(), answer, out.usedAi(), out.fallback(),
            out.policyState(), out.tier() == null ? "NONE" : out.tier().name(), remembered);
    }

    // ── Pure helpers (deterministic fallback) ───────────────────────────────────────

    /** The deterministic, grounded answer served when AI is off/over-budget — pure and testable. */
    static String deterministicAnswer(String assistantName, String remembered, String message) {
        StringBuilder sb = new StringBuilder();
        sb.append(assistantName == null ? "Assistant" : assistantName).append(": ");
        if (remembered != null && !remembered.isBlank()) {
            sb.append("Based on what I remember (").append(snippet(remembered)).append("), ");
        }
        sb.append("here is what I can tell you about \"").append(snippet(message))
          .append("\" from this workspace's data. (Offline mode — connect a model for a fuller answer.)");
        return sb.toString();
    }

    static String snippet(String s) {
        if (s == null) {
            return "";
        }
        String t = s.strip();
        return t.length() <= 160 ? t : t.substring(0, 157) + "…";
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 12);
    }
}
