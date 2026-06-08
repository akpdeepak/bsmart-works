package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link CustomDomain} (B14).
 *
 * <p>Every query is either workspace-scoped (RB-40 §1) or operates by domain string.
 * The soft-delete filter ({@code deletedAt IS NULL}) is applied explicitly on the queries
 * that should exclude deleted records — the list endpoint hides deleted domains while the
 * verify/delete endpoints load by ID regardless (so the service can enforce ownership).
 */
public interface CustomDomainRepository extends JpaRepository<CustomDomain, String> {

    /**
     * Workspace-scoped list — excludes soft-deleted records (RB-40 §1).
     * Only rows belonging to the given workspace and not yet deleted are returned.
     */
    List<CustomDomain> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId);

    /**
     * Looks up a live (not soft-deleted) domain by its domain string.
     * Used during registration to reject duplicates without relying solely on the DB constraint.
     */
    Optional<CustomDomain> findByDomainAndDeletedAtIsNull(String domain);
}
