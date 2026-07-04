package com.bcits.works.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/** Passkey credentials. Self-scoped by user id (a user only ever manages their own). */
public interface WebAuthnCredentialRepository extends JpaRepository<WebAuthnCredential, String> {
    List<WebAuthnCredential> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<WebAuthnCredential> findByCredentialId(String credentialId);
    long countByUserId(String userId);
}
