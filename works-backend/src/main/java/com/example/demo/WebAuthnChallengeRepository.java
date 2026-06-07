package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/** Pending WebAuthn ceremony challenges, looked up by user during the ceremony. */
public interface WebAuthnChallengeRepository extends JpaRepository<WebAuthnChallenge, String> {
    Optional<WebAuthnChallenge> findFirstByUserIdAndCeremonyOrderByCreatedAtDesc(String userId, String ceremony);
    void deleteByUserId(String userId);
}
