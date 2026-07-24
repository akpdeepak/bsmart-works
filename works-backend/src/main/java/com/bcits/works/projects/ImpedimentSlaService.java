package com.bcits.works.projects;
import com.bcits.works.projects.api.Project;
import com.bcits.works.projects.api.ProjectTeamMember;
import com.bcits.works.projects.api.ProjectTeamMemberRepository;

import com.bcits.works.auth.api.EmailService;
import com.bcits.works.ImpedimentService;
import com.bcits.works.messaging.api.Notification;
import com.bcits.works.messaging.api.NotificationRepository;
import com.bcits.works.shared.AppEvent;
import com.bcits.works.shared.EventRepository;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.TenantScope;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Cap V · Proactive SLA-breach notifier for impediments. A CRITICAL raise left unresolved past
 * its one-day SLA ({@link ImpedimentService#slaBreached}) is escalated to the people who can act
 * on it — the project's product owner / scrum master, falling back to the workspace admins when
 * no project roles are assigned — and then <em>re-escalated on a recurring cadence</em> while it
 * stays unresolved (a single notification is easy to miss).
 *
 * <p><b>Cadence + dedupe without a schema change:</b> the append-only {@code events} log is the
 * ledger. We look at the most recent {@code IMPEDIMENT_SLA_NOTIFIED} event for the impediment and
 * only (re)escalate when none exists yet or the last one is older than the reminder window
 * ({@code app.cockpit.sla-reminder-hours}, default 24h). The hourly sweep therefore reminds at
 * most once per window — no spam — and the audit trail comes for free (RB-10 §3, event-sourced).
 *
 * <p>This is a system job (actor {@code "system"}) that legitimately scans every tenant; the
 * notifications it raises are confined to each impediment's own project/workspace members, so
 * there is no cross-tenant leak (RB-40 §1). {@link #posAndScrumMasters} and {@link #reminderDue}
 * are pure.
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
    private final EmailService emailService;
    private final JdbcTemplate jdbc;
    private final long reminderHours;

    public ImpedimentSlaService(ImpedimentRepository impediments, NotificationRepository notifications,
                                ProjectTeamMemberRepository teamMembers, EventRepository events,
                                EventService eventService, EmailService emailService, JdbcTemplate jdbc,
                                @Value("${app.cockpit.sla-reminder-hours:24}") long reminderHours) {
        this.impediments = impediments;
        this.notifications = notifications;
        this.teamMembers = teamMembers;
        this.events = events;
        this.eventService = eventService;
        this.emailService = emailService;
        this.jdbc = jdbc;
        this.reminderHours = reminderHours;
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

    /**
     * Whether a breach is due for (re)escalation: never escalated yet, or the last escalation is
     * older than the reminder window. Pure. {@code lastNotifiedAt} is null when none exists. */
    static boolean reminderDue(OffsetDateTime lastNotifiedAt, OffsetDateTime now, long reminderHours) {
        return lastNotifiedAt == null || !lastNotifiedAt.isAfter(now.minusHours(reminderHours));
    }

    /** The escalation message for a breached impediment. Pure. */
    static String breachMessage(Impediment i, LocalDate today) {
        return "SLA breach: critical impediment \"" + i.getTitle() + "\" has been open "
            + ImpedimentService.ageDays(i, today) + " day(s) unresolved — assign an owner or escalate.";
    }

    // ── The sweep ─────────────────────────────────────────────────────────────
    /** (Re)escalate every breached impediment that is due this run; returns how many. */
    @Transactional
    public int sweep() {
        // System / unscoped escape hatch (RB-40 §1, EPIC #243 §3.4): cross-tenant background job
        // (ImpedimentSlaScheduler thread, plus tests). It scans CRITICAL impediments across ALL
        // workspaces and reads the events log / project team members per item. The central tenant
        // filter must be off so the all-workspace read is the explicit, audited unscoped path; the
        // notifications it raises stay confined to each impediment's own project/workspace members.
        return TenantScope.callAsSystem(() -> {
            LocalDate today = LocalDate.now();
            OffsetDateTime now = OffsetDateTime.now();
            int notified = 0;
            for (Impediment i : impediments.findBySeverityAndStatusNotAndDeletedAtIsNull("CRITICAL", "RESOLVED")) {
                if (!ImpedimentService.slaBreached(i, today)) {
                    continue;
                }
                Optional<AppEvent> last =
                    events.findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc(i.getId(), NOTIFIED_EVENT);
                boolean firstEscalation = last.isEmpty();
                if (!reminderDue(last.map(AppEvent::getOccurredAt).orElse(null), now, reminderHours)) {
                    continue; // escalated recently — wait for the next reminder window
                }
                Set<String> recipients = resolveRecipients(i.getProjectId(), i.getWorkspaceId());
                String message = breachMessage(i, today);
                String link = "/impediments/" + i.getId();
                long age = ImpedimentService.ageDays(i, today);
                for (String userId : recipients) {
                    inApp(i.getWorkspaceId(), userId, message, link);
                    // Email is best-effort and preference-gated (notify_sla_breach); @Async + its own
                    // try/catch mean a mail outage never blocks the in-app escalation or the sweep.
                    emailService.sendSlaBreachEmail(userId, i.getTitle(), age, link);
                }
                eventService.recordInWorkspace(i.getWorkspaceId(), i.getId(), NOTIFIED_EVENT, "system",
                    Map.of("severity", i.getSeverity(),
                           "ageDays", age,
                           "recipients", recipients.size(),
                           "reminder", !firstEscalation));
                notified++;
            }
            if (notified > 0) {
                log.info("[IMPEDIMENT-SLA] Escalated {} breached impediment(s)", notified);
            }
            return notified;
        });
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

    private void inApp(String workspaceId, String userId, String message, String link) {
        Notification n = new Notification();
        n.setWorkspaceId(workspaceId);
        n.setUserId(userId);
        n.setType(NOTIFICATION_TYPE);
        n.setMessage(message);
        n.setLink(link);
        n.setRead(false);
        n.setCreatedAt(OffsetDateTime.now());
        notifications.save(n);
    }
}
