package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Marketplace listings — the GLOBAL extension catalogue (iteration 20, Cap R). Browse finders return
 * only PUBLISHED listings; write paths in the service additionally enforce that a workspace may only
 * mutate listings it owns ({@code publisherWorkspaceId}), so the global catalogue does not break
 * tenant isolation (RB-40 §1).
 */
public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListing, String> {

    List<MarketplaceListing> findByStatusOrderByNameAsc(String status);

    Optional<MarketplaceListing> findBySlug(String slug);

    List<MarketplaceListing> findByPublisherWorkspaceId(String publisherWorkspaceId);
}
