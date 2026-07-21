package com.bcits.works.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByVerificationToken(String verificationToken);

    /** Resolve a user by the email blind index (RB-40 §3) — the tokenized login lookup path. */
    Optional<User> findByEmailHmac(String emailHmac);

    /** Users not yet assigned a PII-vault subject token — driven by the V110/V111 backfill (idempotent). */
    List<User> findBySubjectTokenIsNull();

    /** Returns only users who are members of the given workspace (RB-40 §1). */
    @Query(value = "SELECT u.* FROM users u " +
                   "JOIN workspace_members wm ON wm.user_id = u.id " +
                   "WHERE wm.workspace_id = :workspaceId",
           nativeQuery = true)
    List<User> findByWorkspaceId(@Param("workspaceId") String workspaceId);

    /** Workspace-scoped full-name lookup for @mention / AI assignment resolution. */
    @Query(value = "SELECT u.* FROM users u " +
                   "JOIN workspace_members wm ON wm.user_id = u.id " +
                   "WHERE wm.workspace_id = :workspaceId " +
                   "AND LOWER(u.full_name) LIKE LOWER(CONCAT('%', :name, '%'))",
           nativeQuery = true)
    List<User> findByWorkspaceIdAndFullNameContaining(
            @Param("workspaceId") String workspaceId,
            @Param("name") String name);
}