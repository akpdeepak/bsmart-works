package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Data access for customer accounts (the external portal identity). Email is unique within a
 * workspace, so the login/registration lookup is workspace-scoped — a customer in one tenant can
 * never collide with or authenticate against another tenant's account (RB-40 §1).
 */
public interface CustomerAccountRepository extends JpaRepository<CustomerAccount, String> {

    Optional<CustomerAccount> findByWorkspaceIdAndEmail(String workspaceId, String email);
}
