package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BqlFilterRepository extends JpaRepository<BqlFilter, String> {
    List<BqlFilter> findByWorkspaceIdAndCreatedBy(String workspaceId, String createdBy);
    List<BqlFilter> findByWorkspaceIdAndIsSharedTrue(String workspaceId);
}
