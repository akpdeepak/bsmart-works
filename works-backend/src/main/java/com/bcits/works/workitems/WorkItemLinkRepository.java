package com.bcits.works.workitems;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkItemLinkRepository extends JpaRepository<WorkItemLink, Long> {
    List<WorkItemLink> findBySourceId(String sourceId);
    List<WorkItemLink> findByTargetId(String targetId);
    void deleteBySourceIdAndTargetIdAndLinkType(String sourceId, String targetId, String linkType);
}
