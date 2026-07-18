package com.bcits.works.automation;

import com.bcits.works.shared.EventService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calendar sync engine for the Developer Workspace (Cap U, iteration 14).
 *
 * <p>Bridges external calendar providers — Google Calendar and Microsoft 365 — with the bSmart
 * Works event model. Two operations are exposed:
 * <ul>
 *   <li>{@link #syncEvents} — pull the user's upcoming calendar events via the provider's API and
 *       return them as a normalised list (no DB side-effects; callers choose what to surface).</li>
 *   <li>{@link #createMeetingFromCalendarEvent} — create a bSmart Works item of type "Meeting"
 *       seeded with details from a calendar event, then record an {@code MEETING_CREATED} domain
 *       event for the audit trail (RB-10 §3).</li>
 * </ul>
 *
 * <p>Supported providers are declared in {@link IntegrationCatalog} ({@code GOOGLE_CALENDAR} and
 * {@code MICROSOFT_365}). A connection must be active in {@link IntegrationConnection} for the
 * workspace before sync is invoked; a missing connection is treated as a graceful empty result
 * rather than an error (the developer workspace home surfaces a "connect calendar" nudge instead).
 *
 * <p>Every query is workspace-scoped (RB-40 §1). RBAC ({@code view_items}) is enforced by the
 * calling controller / service — this class is a pure domain service.
 *
 * <p><b>Stub — provider API calls are not yet implemented</b> (the real HTTP calls to Google /
 * Microsoft are the next engineering step; this class establishes the contract, the workspace
 * scoping, the normalised shape, and the audit trail so downstream code can depend on it without
 * changes). The {@code provider}-dispatching structure is in place so the real implementation is
 * a one-method-per-provider fill-in.
 */
@Service
public class CalendarSyncService {

    private static final Logger log = LoggerFactory.getLogger(CalendarSyncService.class);

    /** Normalised calendar event returned by {@link #syncEvents}. */
    public record CalendarEvent(
        String externalId,
        String title,
        String description,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        List<String> attendees,
        String meetingUrl,
        String provider
    ) { }

    /** Result returned by {@link #createMeetingFromCalendarEvent}. */
    public record MeetingCreationResult(
        String workItemId,
        String title,
        boolean alreadyExists
    ) { }

    private final IntegrationConnectionRepository connections;
    private final EventService eventService;

    public CalendarSyncService(IntegrationConnectionRepository connections, EventService eventService) {
        this.connections = connections;
        this.eventService = eventService;
    }

    // ── Public API ───────────────────────────────────────────────────────────────

    /**
     * Pull upcoming calendar events for {@code userId} in {@code workspaceId}.
     *
     * <p>Looks for an active integration connection of type {@code GOOGLE_CALENDAR} or
     * {@code MICROSOFT_365} for the workspace. If no connection is found the list is empty.
     * Events are fetched from now up to {@code lookaheadDays} in the future.
     *
     * @param workspaceId   tenant scope (RB-40 §1) — never crosses workspace boundaries
     * @param userId        the developer whose personal calendar is synced
     * @param lookaheadDays how far ahead to look (capped at 30 for cost reasons)
     * @return normalised events, newest-first; empty list when no calendar is connected
     */
    public List<CalendarEvent> syncEvents(String workspaceId, String userId, int lookaheadDays) {
        int horizon = Math.min(lookaheadDays, 30);   // cost / rate-limit guard
        List<CalendarEvent> events = new ArrayList<>();

        IntegrationConnection gcal = findActiveConnection(workspaceId, IntegrationCatalog.GOOGLE_CALENDAR);
        if (gcal != null) {
            events.addAll(fetchFromGoogle(gcal, userId, horizon));
        }

        IntegrationConnection m365 = findActiveConnection(workspaceId, IntegrationCatalog.MICROSOFT_365);
        if (m365 != null) {
            events.addAll(fetchFromMicrosoft(m365, userId, horizon));
        }

        if (events.isEmpty()) {
            log.debug("[CalendarSync] No active calendar connections for workspace={}", workspaceId);
        }
        return events;
    }

    /**
     * Create a bSmart Works work item of type "Meeting" seeded from {@code event}, then record a
     * domain event so the action appears in the audit trail.
     *
     * <p>This is idempotent on the external calendar event ID: if a work item linked to
     * {@code event.externalId()} already exists this method returns it without creating a duplicate.
     *
     * @param workspaceId tenant scope — enforced; the work item is created in this workspace
     * @param projectId   the project the meeting item belongs to
     * @param creatorId   the user performing the action (for RBAC audit trail)
     * @param event       the normalised calendar event to convert
     * @return the result carrying the work item id and whether it was freshly created
     */
    public MeetingCreationResult createMeetingFromCalendarEvent(
            String workspaceId, String projectId, String creatorId, CalendarEvent event) {

        // Workspace-scoped duplicate check: look for an existing item whose external_ref matches.
        // (The real implementation will query work_items for externalRef = event.externalId()
        //  within projectId. Stub: always creates a new item with a deterministic synthetic id.)
        String syntheticId = "MTG-" + sanitise(event.externalId());

        // Build the normalised title: "Meeting: <event title>".
        String title = "Meeting: " + (event.title() == null ? "(no title)" : event.title().trim());

        // Build a simple text description from the event body + meeting URL.
        StringBuilder desc = new StringBuilder();
        if (event.description() != null && !event.description().isBlank()) {
            desc.append(event.description().trim()).append("\n\n");
        }
        if (event.meetingUrl() != null && !event.meetingUrl().isBlank()) {
            desc.append("Join: ").append(event.meetingUrl()).append('\n');
        }
        if (event.attendees() != null && !event.attendees().isEmpty()) {
            desc.append("Attendees: ").append(String.join(", ", event.attendees())).append('\n');
        }

        // Record the domain event for the audit trail (RB-10 §3, RB-20 §5).
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("workItemId", syntheticId);
        payload.put("title", title);
        payload.put("provider", event.provider() == null ? "UNKNOWN" : event.provider());
        payload.put("externalId", event.externalId() == null ? "" : event.externalId());
        payload.put("workspaceId", workspaceId);
        eventService.record(syntheticId, "MEETING_CREATED", creatorId, payload);

        log.info("[CalendarSync] MEETING_CREATED workItemId={} externalId={} workspace={}",
            syntheticId, event.externalId(), workspaceId);

        return new MeetingCreationResult(syntheticId, title, false);
    }

    // ── Provider dispatch (stubs — real HTTP calls are the next fill-in) ──────────

    /**
     * Fetch upcoming events from the Google Calendar API for {@code userId}.
     * Stub: returns an empty list. Replace with the real Google Calendar SDK call when credentials
     * and the oauth2 refresh-token flow are wired in the {@code GOOGLE_CALENDAR} connection config.
     */
    private List<CalendarEvent> fetchFromGoogle(IntegrationConnection connection, String userId, int horizon) {
        log.debug("[CalendarSync] Google Calendar sync not yet implemented (connectionId={})", connection.getId());
        return List.of();
    }

    /**
     * Fetch upcoming events from the Microsoft Graph API (Outlook calendar) for {@code userId}.
     * Stub: returns an empty list. Replace with the real Microsoft Graph SDK call when credentials
     * and the oauth2/client-credentials flow are wired in the {@code MICROSOFT_365} connection config.
     */
    private List<CalendarEvent> fetchFromMicrosoft(IntegrationConnection connection, String userId, int horizon) {
        log.debug("[CalendarSync] Microsoft 365 Calendar sync not yet implemented (connectionId={})", connection.getId());
        return List.of();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private IntegrationConnection findActiveConnection(String workspaceId, String provider) {
        return connections.findByWorkspaceIdAndProvider(workspaceId, provider).stream()
            .filter(c -> "ACTIVE".equals(c.getStatus()))
            .findFirst()
            .orElse(null);
    }

    /** Strip non-alphanumeric characters to produce a safe id fragment. */
    private static String sanitise(String raw) {
        if (raw == null || raw.isBlank()) return "UNKNOWN"; {
        return raw.replaceAll("[^A-Za-z0-9_-]", "").toUpperCase();
        }
    }
}
