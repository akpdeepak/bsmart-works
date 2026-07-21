package com.bcits.works.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {

    /** Invalidate any outstanding tokens for a user before issuing a fresh one. */
    @Modifying
    @Transactional
    @Query("update PasswordResetToken t set t.used = true where t.userId = :userId and t.used = false")
    void invalidateActiveForUser(@Param("userId") String userId);
}
