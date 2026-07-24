package com.bcits.works.projects;
import com.bcits.works.projects.api.Project;

import com.bcits.works.messaging.api.ActionItem;
import com.bcits.works.messaging.api.ActionItemRepository;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;
import com.bcits.works.shared.RbacGate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cap V · Retro toolkit business logic (I15-S05). RBAC + tenant scoping live here (RB-10 §2). A note
 * can be converted into a tracked {@link ActionItem} so retro outcomes do not get lost (RB-20 §5).
 * The {@link #prepareNew}/{@link #applyUpdate} helpers are pure and DB-free for unit testing.
 */
@Service
public class RetroService {

    private final RetroSessionRepository sessions;
    private final RetroNoteRepository notes;
    private final ActionItemRepository actionItems;
    private final RbacGate rbac;
    private final EventService events;

    public RetroService(RetroSessionRepository sessions, RetroNoteRepository notes,
                        ActionItemRepository actionItems, RbacGate rbac, EventService events) {
        this.sessions = sessions;
        this.notes = notes;
        this.actionItems = actionItems;
        this.rbac = rbac;
        this.events = events;
    }

    private String requireWorkspaceForProject(String callerId, String projectId, String permission) {
        String wsId = rbac.workspaceForProject(projectId);
        if (wsId == null || rbac.getUserTier(callerId, wsId) < 1) {
            throw ApiException.notFound("Project", projectId);
        }
        rbac.require(callerId, wsId, permission);
        return wsId;
    }

    private RetroSession loadForMember(String callerId, String id) {
        RetroSession s = sessions.findById(id).orElseThrow(() -> ApiException.notFound("Retro", id));
        if (s.getWorkspaceId() == null || rbac.getUserTier(callerId, s.getWorkspaceId()) < 1) {
            throw ApiException.notFound("Retro", id);
        }
        return s;
    }

    // ── Pure helpers (unit-testable) ──────────────────────────────────────────
    RetroSession prepareNew(RetroSession s, String wsId, String callerId) {
        s.setId("RET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        s.setWorkspaceId(wsId);
        s.setCreatedBy(callerId);
        if (s.getFacilitatorId() == null) s.setFacilitatorId(callerId);
        if (s.getTemplate() == null) s.setTemplate("START_STOP_CONTINUE");
        if (s.getStatus() == null) s.setStatus("ACTIVE"); {
        s.setCreatedAt(OffsetDateTime.now());
        }
        s.setUpdatedAt(OffsetDateTime.now());
        return s;
    }

    void applyUpdate(RetroSession existing, RetroSession updated) {
        existing.setTitle(updated.getTitle());
        existing.setTemplate(updated.getTemplate());
        existing.setStatus(updated.getStatus());
        existing.setAnonymous(updated.isAnonymous());
        existing.setSprintId(updated.getSprintId());
        existing.setUpdatedAt(OffsetDateTime.now());
    }

    // ── Reads ──────────────────────────────────────────────────────────────────
    public List<RetroSession> listByProject(String callerId, String projectId) {
        requireWorkspaceForProject(callerId, projectId, "view_items");
        return sessions.findByProjectIdAndDeletedAtIsNullOrderByCreatedAtDesc(projectId);
    }

    public Map<String, Object> getWithNotes(String callerId, String id) {
        RetroSession s = loadForMember(callerId, id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("session", s);
        out.put("notes", notes.findBySessionIdOrderByCreatedAtAsc(id));
        return out;
    }

    // ── Session writes ──────────────────────────────────────────────────────────
    @Transactional
    public RetroSession create(String callerId, RetroSession in) {
        String wsId = requireWorkspaceForProject(callerId, in.getProjectId(), "create_items");
        RetroSession saved = sessions.save(prepareNew(in, wsId, callerId));
        events.recordInWorkspace(wsId, saved.getId(), "RETRO_CREATED", callerId,
                Map.of("title", saved.getTitle(), "template", saved.getTemplate()));
        return saved;
    }

    @Transactional
    public RetroSession update(String callerId, String id, RetroSession updated) {
        RetroSession existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "create_items");
        applyUpdate(existing, updated);
        return sessions.save(existing);
    }

    @Transactional
    public void delete(String callerId, String id) {
        RetroSession existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "delete_items");
        existing.setDeletedAt(OffsetDateTime.now());
        sessions.save(existing);
    }

    @Transactional
    public RetroSession complete(String callerId, String id) {
        RetroSession existing = loadForMember(callerId, id);
        rbac.require(callerId, existing.getWorkspaceId(), "create_items");
        existing.setStatus("COMPLETED");
        existing.setUpdatedAt(OffsetDateTime.now());
        return sessions.save(existing);
    }

    // ── Note writes ──────────────────────────────────────────────────────────────
    @Transactional
    public RetroNote addNote(String callerId, String sessionId, String columnKey, String content) {
        RetroSession s = loadForMember(callerId, sessionId);
        rbac.require(callerId, s.getWorkspaceId(), "create_items");
        RetroNote n = new RetroNote();
        n.setId("RTN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        n.setSessionId(sessionId);
        n.setColumnKey(columnKey);
        n.setContent(content);
        n.setAuthorId(s.isAnonymous() ? null : callerId);
        n.setVotes(0);
        n.setCreatedAt(OffsetDateTime.now());
        return notes.save(n);
    }

    @Transactional
    public RetroNote voteNote(String callerId, String noteId) {
        RetroNote n = notes.findById(noteId).orElseThrow(() -> ApiException.notFound("RetroNote", noteId));
        RetroSession s = loadForMember(callerId, n.getSessionId());
        rbac.require(callerId, s.getWorkspaceId(), "create_items");
        n.setVotes(n.getVotes() + 1);
        return notes.save(n);
    }

    @Transactional
    public void deleteNote(String callerId, String noteId) {
        RetroNote n = notes.findById(noteId).orElseThrow(() -> ApiException.notFound("RetroNote", noteId));
        RetroSession s = loadForMember(callerId, n.getSessionId());
        rbac.require(callerId, s.getWorkspaceId(), "delete_items");
        notes.deleteById(noteId);
    }

    /** Convert a retro note into a tracked action item (RB-20 §5 — outcomes become first-class work). */
    @Transactional
    public ActionItem convertNoteToAction(String callerId, String noteId, String ownerId, LocalDate dueDate) {
        RetroNote n = notes.findById(noteId).orElseThrow(() -> ApiException.notFound("RetroNote", noteId));
        RetroSession s = loadForMember(callerId, n.getSessionId());
        rbac.require(callerId, s.getWorkspaceId(), "create_items");
        ActionItem a = new ActionItem();
        a.setId("ACT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        a.setWorkspaceId(s.getWorkspaceId());
        a.setProjectId(s.getProjectId());
        a.setTitle(n.getContent());
        a.setDescription("From retrospective " + s.getTitle());
        a.setOwnerId(ownerId);
        a.setDueDate(dueDate);
        a.setStatus("OPEN");
        a.setCreatedBy(callerId);
        a.setCreatedAt(OffsetDateTime.now());
        a.setUpdatedAt(OffsetDateTime.now());
        ActionItem saved = actionItems.save(a);
        n.setConvertedActionItemId(saved.getId());
        notes.save(n);
        events.recordInWorkspace(s.getWorkspaceId(), saved.getId(), "RETRO_ACTION_CAPTURED", callerId,
                Map.of("retroId", s.getId(), "title", saved.getTitle()));
        return saved;
    }
}
