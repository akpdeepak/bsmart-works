package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Cap V · Proactive SLA-breach notifier for impediments. A CRITICAL raise left unresolved past
 * its one-day SLA ({@link ImpedimentService#slaBreached}) is escalated <em>once</em> to the
 * people who can act on it — the project's product owner / scrum master, falling back to the
 * workspace admins when no project roles are assigned.
 *
 * <p><b>Dedupe without a schema change:</b> the append-only {@code events} log is the ledger.
 * Before notifying we check for an existing {@code IMPEDIMENT_SLA_NOTIFIED} event on the
 * impediment; after notifying we record one. So each breach is escalated exactly once, the
 * audit trail comes for free, and no migration is needed (RB-10 §3, event-sourced).
 *
 * <p>This is a system job (actor {@code "system"}) that legitimately scans every tenant; the
 * notifications it raises are confined to each impediment's own project/workspace members, so
 * there is no cross-tenant leak (RB-40 §1). The {@link #posAndScrumMasters} helper is pure.
 */
@Service
public class ImpedimentSlaService {

    private static final Logger log = LoggerFactory.getLogger(ImpedimentSlaService.class);
    static final String NOTIFIED_EVENT = "IMPEDIMENT_SLA_NOTIFIED";
    static final String NOTIFICATION_TYPE = "SLA_BREACH_IMPEDIMENT";
    private static final Set<String> NOTIFY_ROLES = Set.of("product-owner", "scrum-master");

    private final ImpedimentRepository impediments;
    private final NotificationRepository notifications;
    private final ProjectTeamMemberRepository teamMembers;
    private final EventRepository events;
    private final EventService eventService;
    private final JdbcTemplate jdbc;

    public ImpedimentSlaService(ImpedimentRepository impediments, NotificationRepository notifications,
                                ProjectTeamMemberRepository teamMembers, EventRepository events,
                                EventService eventService, JdbcTemplate jdbc) {
        this.impediments = impediments;
        this.notifications = notifications;
        this.teamMembers = teamMembers;
        this.events = events;
        this.eventService = eventService;
        this.jdbc = jdbc;
    }

    // ── Pure helpers (unit-testable) ──────────────────────────────────────────
    /** The project members who should be escalated to: product owners and scrum masters. Pure. */
    static Set<String> posAndScrumMasters(List<ProjectTeamMember> members) {
        Set<String> ids = new LinkedHashSet<>();
        for (ProjectTeamMember m : members) {
            if (NOTIFY_ROLES.contains(m.getRoleKey()) && m.getUserId() != null) {
                ids.add(m.getUserId());
            }
        }
        return ids;
    }

    /** The escalation message for a breached impediment. Pure. */
    static String breachMessage(Impediment i, LocalDate today) {
        return "SLA breach: critical impediment \"" + i.getTitle() + "\" has been open "
            + ImpedimentService.ageDays(i, today) + " day(s) unresolved — assign an owner or escalate.";
    }

    // ── The sweep ─────────────────────────────────────────────────────────────
    /** Notify on every newly-breached impediment; returns how many were escalated this run. */
    @Transactional
    public int sweep() {
        LocalDate today = LocalDate.now();
        int notified = 0;
        for (Impediment i : impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED")) {
            if (!ImpedimentService.slaBreached(i, today)) {
                continue;
            }
            if (events.existsByAggregateIdAndEventType(i.getId(), NOTIFIED_EVENT)) {
                continue; // already escalated — notify once per breach
            }
            Set<String> recipients = resolveRecipients(i.getProjectId(), i.getWorkspaceId());
            String message = breachMessage(i, today);
            String link = "/impediments/" + i.getId();
            for (String userId : recipients) {
                inApp(userId, message, link);
            }
            eventService.recordInWorkspace(i.getWorkspaceId(), i.getId(), NOTIFIED_EVENT, "system",
                Map.of("severity", i.getSeverity(),
                       "ageDays", ImpedimentService.ageDays(i, today),
                       "recipients", recipients.size()));
            notified++;
        }
        if (notified > 0) {
            log.info("[IMPEDIMENT-SLA] Escalated {} breached impediment(s)", notified);
        }
        return notified;
    }

    /** Project PO/scrum-master, falling back to workspace admins (tier >= 4) when none are set. */
    private Set<String> resolveRecipients(String projectId, String workspaceId) {
        Set<String> ids = posAndScrumMasters(teamMembers.findByProjectIdOrderByCreatedAtAsc(projectId));
        if (ids.isEmpty() && workspaceId != null) {
            try {
                ids.addAll(jdbc.queryForList(
                    "SELECT wm.user_id FROM workspace_members wm JOIN roles r ON r.id = wm.role_id "
                    + "WHERE wm.workspace_id = ? AND r.tier >= 4", String.class, workspaceId));
            } catch (RuntimeException ex) {
                log.warn("[IMPEDIMENT-SLA] Admin fallback lookup failed for workspace {}", workspaceId, ex);
            }
        }
        return ids;
    }

    private void inApp(String userId, String message, String link) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(NOTIFICATION_TYPE);
        n.setMessage(message);
        n.setLink(link);
        n.setRead(false);
        n.setCreatedAt(OffsetDateTime.now());
        notifications.save(n);
    }
}
