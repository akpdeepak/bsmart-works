package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OkrLinkRepository extends JpaRepository<OkrLink, String> {
    List<OkrLink> findByKeyResultId(String keyResultId);
    List<OkrLink> findByEntityTypeAndEntityId(String entityType, String entityId);
    boolean existsByKeyResultIdAndEntityTypeAndEntityId(String keyResultId, String entityType, String entityId);
}
