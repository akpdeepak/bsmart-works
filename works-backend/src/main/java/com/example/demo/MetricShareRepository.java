package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for voluntary metric shares. Scoped by owner / recipient; a share grants exactly
 * one recipient access to exactly one owner's personal metrics (RB-40 §1 — field-level access).
 */
public interface MetricShareRepository extends JpaRepository<MetricShare, String> {

    /** Shares the given user has granted to others. */
    List<MetricShare> findByOwnerId(String ownerId);

    /** Shares others have granted to the given user. */
    List<MetricShare> findBySharedWithId(String sharedWithId);

    Optional<MetricShare> findByOwnerIdAndSharedWithId(String ownerId, String sharedWithId);
}
