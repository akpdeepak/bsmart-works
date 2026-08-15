package com.bcits.works.messaging;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

/**
 * Messaging AI capabilities: conversation summarization and action-item extraction.
 * Both methods follow the EPIC-9 / RB-40 §2 AI Control Plane contract:
 * <ul>
 *   <li>Each method returns {@code null} when AI is off, over budget, or unavailable.
 *       The controller must provide a deterministic fallback for {@code null} results.</li>
 *   <li>Extracted action items are <b>review-only drafts</b> — they must never be
 *       persisted automatically; a human approval step is required (RB-40 §2.1).</li>
 *   <li>AI invocations would be logged via the AI Control Plane audit trail when a
 *       live LLM is wired in; the current implementation is the deterministic-only
 *       baseline that ships first.</li>
 * </ul>
 */
@Service
public class MessagingAiService {

    /**
     * Summarize the conversation using available messages.
     *
     * @param workspaceId workspace for scope and budget accounting
     * @param subject     conversation subject (used in fallback prose)
     * @param messages    body texts of the messages in the conversation
     * @return AI-generated summary, or {@code null} if AI is unavailable/over budget
     */
    public String summarize(String workspaceId, String subject, List<String> messages) {
        // Deterministic baseline — no LLM key configured yet.
        // Return null so the controller applies the deterministic fallback.
        // When AiControlPlaneService is injected in a future slice, this method
        // will call it under the "messaging_summary" capability and return the
        // LLM result (or null on budget/availability failure).
        return null;
    }

    /**
     * Extract action items from the conversation as review-only drafts.
     *
     * @param workspaceId workspace for scope and budget accounting
     * @param subject     conversation subject
     * @param messages    body texts of the messages in the conversation
     * @return list of draft maps ({@code title}, {@code assignee}, {@code dueHint}),
     *         or {@code null} if AI is unavailable/over budget
     */
    public List<Map<String, Object>> extractActionItems(String workspaceId, String subject, List<String> messages) {
        // Deterministic baseline — return null so the controller produces an empty
        // draft list rather than auto-creating records. LLM wiring in a future slice.
        return null;
    }
}
