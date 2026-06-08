package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

/** Workspace-scoped (RB-40 §1) access to the AI response cache. */
public interface AiCacheEntryRepository extends JpaRepository<AiCacheEntry, String> {
    // Lookups are by primary key (workspace:capability:key-hash), so the base repository suffices.
}
