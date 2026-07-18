package com.bcits.works.knowledge;

import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.EventService;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Document templates (iteration-20 Cap I): a workspace-scoped library of reusable markdown skeletons
 * an author starts a new article from. The caller ({@link DocumentTemplateController}) applies RBAC —
 * workspace membership ({@code view_items}) to read, {@code manage_projects} to manage the library — and
 * every method here is workspace-scoped (RB-40 §1): a get/update/delete of a template that belongs to a
 * different workspace is a {@code NOT_FOUND}, so the row can never be touched across the tenant boundary.
 */
@Service
public class DocumentTemplateService {

    private final DocumentTemplateRepository repo;
    private final EventService events;

    public DocumentTemplateService(DocumentTemplateRepository repo, EventService events) {
        this.repo = repo;
        this.events = events;
    }

    public List<DocumentTemplate> list(String workspaceId, String category) {
        return (category == null || category.isBlank())
            ? repo.findByWorkspaceIdOrderByCategoryAscNameAsc(workspaceId)
            : repo.findByWorkspaceIdAndCategoryOrderByNameAsc(workspaceId, category);
    }

    /** Fetch a template, scoped to its workspace — a foreign-workspace id is a NOT_FOUND (RB-40 §1). */
    public DocumentTemplate get(String workspaceId, String id) {
        DocumentTemplate t = repo.findById(id)
            .filter(x -> workspaceId.equals(x.getWorkspaceId()))
            .orElseThrow(() -> ApiException.notFound("Template", id));
        return t;
    }

    public DocumentTemplate create(String workspaceId, String userId, DocumentTemplate template) {
        if (template.getName() == null || template.getName().isBlank()) {
            throw ApiException.badRequest("TEMPLATE_NAME_REQUIRED", "A template name is required.", "name");
        }
        OffsetDateTime now = OffsetDateTime.now();
        template.setId("DTPL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        template.setWorkspaceId(workspaceId);
        template.setCreatedBy(userId);
        template.setCreatedAt(now);
        template.setUpdatedAt(now);
        DocumentTemplate saved = repo.save(template);
        events.recordInWorkspace(workspaceId, saved.getId(), "DOCUMENT_TEMPLATE_CREATED", userId,
            java.util.Map.of("name", nv(saved.getName()), "category", nv(saved.getCategory())));
        return saved;
    }

    public DocumentTemplate update(String workspaceId, String userId, String id, DocumentTemplate updated) {
        DocumentTemplate t = get(workspaceId, id); // workspace-scoped fetch — guards cross-tenant
        t.setName(updated.getName() != null ? updated.getName() : t.getName());
        t.setDescription(updated.getDescription());
        t.setCategory(updated.getCategory());
        t.setBody(updated.getBody());
        t.setUpdatedAt(OffsetDateTime.now());
        DocumentTemplate saved = repo.save(t);
        events.recordInWorkspace(workspaceId, saved.getId(), "DOCUMENT_TEMPLATE_UPDATED", userId,
            java.util.Map.of("name", nv(saved.getName())));
        return saved;
    }

    public void delete(String workspaceId, String userId, String id) {
        DocumentTemplate t = get(workspaceId, id); // workspace-scoped fetch — guards cross-tenant
        repo.delete(t);
        events.recordInWorkspace(workspaceId, id, "DOCUMENT_TEMPLATE_DELETED", userId,
            java.util.Map.of("name", nv(t.getName())));
    }

    private static String nv(Object o) {
        return o == null ? "" : o.toString();
    }
}
