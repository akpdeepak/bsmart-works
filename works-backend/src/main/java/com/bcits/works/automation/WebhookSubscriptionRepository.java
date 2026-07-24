package com.bcits.works.automation;
import com.bcits.works.workspaces.api.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for outbound webhook subscriptions. Workspace-scoped (RB-40 §1).
 */
public interface WebhookSubscriptionRepository extends JpaRepository<WebhookSubscription, String> {

    List<WebhookSubscription> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    List<WebhookSubscription> findByWorkspaceIdAndActiveTrue(String workspaceId);
}
