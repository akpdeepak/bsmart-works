package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SavedFilterRepository extends JpaRepository<SavedFilter, Long> {
    List<SavedFilter> findByWorkspaceIdAndIsSharedOrCreatedBy(String workspaceId, boolean isShared, String createdBy);
    List<SavedFilter> findBySubscribedTrue();
}
