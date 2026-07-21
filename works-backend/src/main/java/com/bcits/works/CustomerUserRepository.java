package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for external customer users. Email lookup powers the separate portal login flow;
 * everything else is scoped to a customer account / workspace (RB-40 §1).
 */
public interface CustomerUserRepository extends JpaRepository<CustomerUser, String> {

    Optional<CustomerUser> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /** Blind-index portal-login lookup once the raw email is tokenized (RB-40 §3, Slice 3). */
    Optional<CustomerUser> findByEmailHmac(String emailHmac);

    /** Blind-index duplicate-email guard (mirrors {@link #existsByEmailIgnoreCase}). */
    boolean existsByEmailHmac(String emailHmac);

    /** Backfill guard (RB-40 §3): customer-portal users not yet assigned a vault subject token. */
    List<CustomerUser> findBySubjectTokenIsNull();

    List<CustomerUser> findByCustomerAccountIdOrderByCreatedAtDesc(String customerAccountId);

    List<CustomerUser> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
}
