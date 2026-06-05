package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for customer organizations. All caller-facing lookups are workspace-scoped so an org
 * can never be read across tenants (RB-40 §1); {@link #findBySubdomain} is the one deliberate
 * unauthenticated lookup, used only to resolve portal branding by host key (a public, read-only
 * value), never to expose anything tenant-private.
 */
public interface CustomerOrganizationRepository extends JpaRepository<CustomerOrganization, String> {

    List<CustomerOrganization> findByWorkspaceIdOrderByNameAsc(String workspaceId);

    Optional<CustomerOrganization> findBySubdomain(String subdomain);
}
