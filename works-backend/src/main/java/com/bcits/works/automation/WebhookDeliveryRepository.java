package com.bcits.works.automation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Data access for webhook delivery records. Workspace-scoped (RB-40 §1).
 */
public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, String> {

    Page<WebhookDelivery> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId, Pageable pageable);
}
