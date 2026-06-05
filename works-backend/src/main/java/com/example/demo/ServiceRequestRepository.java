package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for service requests. Agent queues and customer views are all workspace-scoped, and
 * the customer-facing reads additionally narrow to a single customer account so a customer can
 * only ever see their own requests (RB-40 §1).
 */
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, String> {

    // ── Agent queues (internal, workspace-scoped) ──────────────────────────────────
    List<ServiceRequest> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    List<ServiceRequest> findByWorkspaceIdAndStatusInOrderByCreatedAtDesc(String workspaceId, List<String> statuses);

    List<ServiceRequest> findByWorkspaceIdAndAssigneeIdOrderByCreatedAtDesc(String workspaceId, String assigneeId);

    List<ServiceRequest> findByWorkspaceIdAndAssigneeIdIsNullOrderByCreatedAtDesc(String workspaceId);

    List<ServiceRequest> findByWorkspaceIdAndPriorityAndStatusInOrderByCreatedAtDesc(
            String workspaceId, String priority, List<String> statuses);

    // ── Customer-facing (account-scoped) ───────────────────────────────────────────
    List<ServiceRequest> findByCustomerAccountIdOrderByCreatedAtDesc(String customerAccountId);

    List<ServiceRequest> findByCustomerAccountIdAndStatusInOrderByCreatedAtDesc(
            String customerAccountId, List<String> statuses);
}
