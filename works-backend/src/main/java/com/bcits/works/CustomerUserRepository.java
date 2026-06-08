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

    List<CustomerUser> findByCustomerAccountIdOrderByCreatedAtDesc(String customerAccountId);

    List<CustomerUser> findByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);
}
