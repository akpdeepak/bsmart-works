package com.example.demo;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for customer requests. Two callers, two isolation rules (RB-40 §1):
 * <ul>
 *   <li><b>Internal agents</b> read workspace-scoped queues — All open, Mine (by assignee),
 *       Unassigned, High priority — never across tenants.</li>
 *   <li><b>Portal customers</b> read organization-scoped lists only; every customer-facing method
 *       below takes {@code organizationId} so one customer can never see another's requests.</li>
 * </ul>
 * List queries are capped with {@link Limit} so an agent queue can never return an unbounded set.
 */
public interface CustomerRequestRepository extends JpaRepository<CustomerRequest, String> {

    // ── Internal agent queues (workspace-scoped) ─────────────────────────────────

    List<CustomerRequest> findByWorkspaceIdAndStatusInOrderByCreatedAtDesc(
            String workspaceId, List<String> statuses, Limit limit);

    List<CustomerRequest> findByWorkspaceIdAndAssigneeIdOrderByCreatedAtDesc(
            String workspaceId, String assigneeId, Limit limit);

    List<CustomerRequest> findByWorkspaceIdAndAssigneeIdIsNullAndStatusInOrderByCreatedAtDesc(
            String workspaceId, List<String> statuses, Limit limit);

    List<CustomerRequest> findByWorkspaceIdAndPriorityInAndStatusInOrderByCreatedAtDesc(
            String workspaceId, List<String> priorities, List<String> statuses, Limit limit);

    // ── CSAT aggregation (workspace-scoped) ──────────────────────────────────────

    /** Rated requests in a workspace — the input for CSAT trends; bounded by the rated set. */
    List<CustomerRequest> findByWorkspaceIdAndCsatRatingIsNotNull(String workspaceId);

    // ── Portal customer reads (organization-scoped) ──────────────────────────────

    List<CustomerRequest> findByOrganizationIdOrderByCreatedAtDesc(String organizationId, Limit limit);

    List<CustomerRequest> findByOrganizationIdAndStatusInOrderByCreatedAtDesc(
            String organizationId, List<String> statuses, Limit limit);

    /** A single request, organization-scoped — the portal can only fetch its own org's request. */
    Optional<CustomerRequest> findByIdAndOrganizationId(String id, String organizationId);
}
