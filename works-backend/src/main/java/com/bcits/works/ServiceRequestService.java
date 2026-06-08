package com.bcits.works;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Pure logic for service requests (iteration 9, Cap N + Cap M): id/defaults, the status lifecycle
 * and its allowed transitions, and the customer-facing SLA countdown derived from the customer's
 * tier targets. No I/O — RBAC, persistence and events live in the controller, so every rule here
 * is unit-testable in isolation (mirrors {@link ComplianceRuleService}).
 */
@Service
public class ServiceRequestService {

    static final Set<String> PRIORITIES = Set.of("CRITICAL", "HIGH", "MEDIUM", "LOW");
    static final String DEFAULT_PRIORITY = "MEDIUM";

    static final String NEW = "NEW";
    static final String OPEN = "OPEN";
    static final String IN_PROGRESS = "IN_PROGRESS";
    static final String WAITING_CUSTOMER = "WAITING_CUSTOMER";
    static final String RESOLVED = "RESOLVED";
    static final String CLOSED = "CLOSED";

    /** Statuses where the SLA clock is still running / the request still needs work. */
    static final List<String> OPEN_STATUSES = List.of(NEW, OPEN, IN_PROGRESS, WAITING_CUSTOMER);

    /** Allowed status transitions — anything not listed is rejected as an invalid transition. */
    static final Map<String, Set<String>> TRANSITIONS = Map.of(
            NEW,              Set.of(OPEN, IN_PROGRESS, RESOLVED),
            OPEN,             Set.of(IN_PROGRESS, WAITING_CUSTOMER, RESOLVED),
            IN_PROGRESS,      Set.of(WAITING_CUSTOMER, RESOLVED, OPEN),
            WAITING_CUSTOMER, Set.of(IN_PROGRESS, RESOLVED, OPEN),
            RESOLVED,         Set.of(CLOSED, OPEN),   // reopen if the fix didn't hold
            CLOSED,           Set.of(OPEN));

    /** Computed SLA snapshot for the countdown timer shown to customer and agent. */
    public record SlaSnapshot(String state, long minutesRemaining, boolean breached) { }

    public String normalizePriority(String priority) {
        if (priority == null) {
            return DEFAULT_PRIORITY;
        }
        String p = priority.trim().toUpperCase();
        return PRIORITIES.contains(p) ? p : DEFAULT_PRIORITY;
    }

    public String normalizeStatus(String status) {
        if (status == null) {
            return NEW;
        }
        String s = status.trim().toUpperCase();
        return TRANSITIONS.containsKey(s) ? s : NEW;
    }

    public boolean canTransition(String from, String to) {
        if (from == null || to == null) {
            return false;
        }
        return TRANSITIONS.getOrDefault(from.toUpperCase(), Set.of()).contains(to.toUpperCase());
    }

    public boolean isOpen(String status) {
        return status != null && OPEN_STATUSES.contains(status.toUpperCase());
    }

    /**
     * Stamp a newly submitted request: id, type snapshot, default priority, NEW status, and the
     * SLA targets/deadline from the customer's tier (null tier = no SLA). {@code formData} defaults
     * to an empty JSON object.
     */
    public ServiceRequest prepareNew(ServiceRequest req, RequestType type, CustomerSlaTier tier) {
        OffsetDateTime now = OffsetDateTime.now();
        req.setId("SR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        if (type != null) {
            req.setRequestTypeId(type.getId());
            req.setTypeKey(type.getTypeKey());
            if (req.getPriority() == null || req.getPriority().isBlank()) {
                req.setPriority(type.getDefaultPriority());
            }
        }
        req.setPriority(normalizePriority(req.getPriority()));
        req.setStatus(NEW);
        req.setFormData(req.getFormData() == null || req.getFormData().isBlank() ? "{}" : req.getFormData());
        req.setAssigneeId(null);
        req.setFirstRespondedAt(null);
        req.setResolvedAt(null);
        req.setClosedAt(null);
        if (tier != null) {
            req.setSlaTier(tier.getTier());
            req.setSlaResponseMinutes(tier.getResponseMinutes());
            req.setSlaResolutionMinutes(tier.getResolutionMinutes());
            if (tier.getResolutionMinutes() != null) {
                req.setSlaDueAt(now.plusMinutes(tier.getResolutionMinutes()));
            }
        }
        req.setCreatedAt(now);
        req.setUpdatedAt(now);
        return req;
    }

    /**
     * Apply an agent status transition. Throws {@link IllegalStateException} for an illegal
     * transition (mapped to 400 by the global handler). Stamps first-response, resolved and closed
     * timestamps as the request moves through its lifecycle.
     */
    public ServiceRequest applyTransition(ServiceRequest existing, String newStatus, String agentId) {
        String to = normalizeStatus(newStatus);
        String from = existing.getStatus() == null ? NEW : existing.getStatus();
        if (from.equals(to)) {
            return existing; // idempotent no-op
        }
        if (!canTransition(from, to)) {
            throw new IllegalStateException("Cannot move a request from " + from + " to " + to + ".");
        }
        OffsetDateTime now = OffsetDateTime.now();
        // First agent action off NEW counts as the first response.
        if (NEW.equals(from) && existing.getFirstRespondedAt() == null) {
            existing.setFirstRespondedAt(now);
        }
        if (RESOLVED.equals(to)) {
            existing.setResolvedAt(now);
        }
        if (CLOSED.equals(to)) {
            existing.setClosedAt(now);
        }
        if (OPEN.equals(to) && (RESOLVED.equals(from) || CLOSED.equals(from))) {
            existing.setResolvedAt(null); // reopened
            existing.setClosedAt(null);
        }
        existing.setStatus(to);
        existing.setUpdatedAt(now);
        return existing;
    }

    /** Assign (or reassign) the request to an agent; an unassigned NEW request becomes OPEN. */
    public ServiceRequest assign(ServiceRequest existing, String agentId) {
        OffsetDateTime now = OffsetDateTime.now();
        existing.setAssigneeId(agentId);
        if (NEW.equals(existing.getStatus())) {
            existing.setStatus(OPEN);
            if (existing.getFirstRespondedAt() == null) {
                existing.setFirstRespondedAt(now);
            }
        }
        existing.setUpdatedAt(now);
        return existing;
    }

    /** Update the agent-editable fields (priority) without changing the lifecycle. */
    public ServiceRequest applyAgentEdit(ServiceRequest existing, String priority) {
        if (priority != null) {
            existing.setPriority(normalizePriority(priority));
        }
        existing.setUpdatedAt(OffsetDateTime.now());
        return existing;
    }

    /**
     * Compute the SLA countdown. NONE when no target was set. Once resolved the state is frozen at
     * MET or BREACHED (judged at resolution time). While open: BREACHED past the deadline, AT_RISK
     * inside the last quarter of the resolution window, otherwise ON_TRACK. {@code minutesRemaining}
     * is signed (negative once overdue).
     */
    public SlaSnapshot computeSla(ServiceRequest r, OffsetDateTime now) {
        if (r.getSlaDueAt() == null) {
            return new SlaSnapshot("NONE", 0, false);
        }
        OffsetDateTime reference = r.getResolvedAt() != null ? r.getResolvedAt() : now;
        long minutesRemaining = ChronoUnit.MINUTES.between(reference, r.getSlaDueAt());
        if (r.getResolvedAt() != null) {
            boolean breached = minutesRemaining < 0;
            return new SlaSnapshot(breached ? "BREACHED" : "MET", minutesRemaining, breached);
        }
        if (minutesRemaining < 0) {
            return new SlaSnapshot("BREACHED", minutesRemaining, true);
        }
        Integer window = r.getSlaResolutionMinutes();
        if (window != null && window > 0 && minutesRemaining <= Math.max(1, window / 4)) {
            return new SlaSnapshot("AT_RISK", minutesRemaining, false);
        }
        return new SlaSnapshot("ON_TRACK", minutesRemaining, false);
    }

    public SlaSnapshot computeSla(ServiceRequest r) {
        return computeSla(r, OffsetDateTime.now());
    }
}
