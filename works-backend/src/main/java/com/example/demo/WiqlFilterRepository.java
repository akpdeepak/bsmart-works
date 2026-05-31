package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WiqlFilterRepository extends JpaRepository<WiqlFilter, String> {
    List<WiqlFilter> findByWorkspaceIdAndCreatedBy(String workspaceId, String createdBy);
    List<WiqlFilter> findByWorkspaceIdAndIsSharedTrue(String workspaceId);
}
