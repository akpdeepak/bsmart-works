package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for customer accounts. All lookups are workspace-scoped so an account can never be
 * read across tenants (RB-40 §1).
 */
public interface CustomerAccountRepository extends JpaRepository<CustomerAccount, String> {

    List<CustomerAccount> findByWorkspaceIdOrderByNameAsc(String workspaceId);

    List<CustomerAccount> findByWorkspaceIdAndActiveTrueOrderByNameAsc(String workspaceId);

    Optional<CustomerAccount> findBySubdomain(String subdomain);
}
