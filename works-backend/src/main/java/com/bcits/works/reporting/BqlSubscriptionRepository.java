package com.bcits.works.reporting;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Saved-view subscriptions, keyed for the owner's management views and the scheduler's sweep. */
public interface BqlSubscriptionRepository extends JpaRepository<BqlSubscription, String> {

    List<BqlSubscription> findByUserIdAndWorkspaceIdOrderByCreatedAtDesc(String userId, String workspaceId);

    Optional<BqlSubscription> findBySavedViewIdAndUserId(String savedViewId, String userId);

    /** The scheduler's sweep set — all active subscriptions (due-ness is decided per row). */
    List<BqlSubscription> findByActiveTrue();
}
