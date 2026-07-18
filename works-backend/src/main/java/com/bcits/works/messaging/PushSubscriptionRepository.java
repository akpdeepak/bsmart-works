package com.bcits.works.messaging;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Web Push subscriptions (iteration 18, Cap S). */
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, String> {
    List<PushSubscription> findByUserId(String userId);
    Optional<PushSubscription> findByEndpoint(String endpoint);
}
