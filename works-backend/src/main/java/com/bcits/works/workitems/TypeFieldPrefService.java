package com.bcits.works.workitems;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Owns the atomic replace operation for workspace-scoped type-field preferences. */
@Service
public class TypeFieldPrefService {

    private final TypeFieldPrefRepository repository;

    public TypeFieldPrefService(TypeFieldPrefRepository repository) {
        this.repository = repository;
    }

    public List<TypeFieldPref> list(String workspaceId) {
        return repository.findByWorkspaceId(workspaceId);
    }

    @Transactional
    public List<TypeFieldPref> replace(String workspaceId, String typeKey, List<PrefRequest> prefs) {
        repository.deleteByWorkspaceIdAndTypeKey(workspaceId, typeKey);
        int order = 0;
        for (PrefRequest request : prefs) {
            if (request.fieldKey() == null || request.fieldKey().isBlank()) {
                continue;
            }
            TypeFieldPref pref = new TypeFieldPref();
            pref.setId("tfp_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
            pref.setWorkspaceId(workspaceId);
            pref.setTypeKey(typeKey);
            pref.setFieldKey(request.fieldKey());
            pref.setVisible(request.visible() == null ? Boolean.TRUE : request.visible());
            pref.setSortOrder(request.sortOrder() != null ? request.sortOrder() : order);
            pref.setCreatedAt(OffsetDateTime.now());
            repository.save(pref);
            order++;
        }
        return repository.findByWorkspaceId(workspaceId);
    }

    public record PrefRequest(String fieldKey, Boolean visible, Integer sortOrder) { }
}
