package com.bcits.works.workitems;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TypeFieldPrefRepository extends JpaRepository<TypeFieldPref, String> {
    List<TypeFieldPref> findByWorkspaceId(String workspaceId);
    void deleteByWorkspaceIdAndTypeKey(String workspaceId, String typeKey);
}
