package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for CSAT responses. Trend reads are workspace-scoped (RB-40 §1); one response per
 * request is enforced by a unique index plus the {@code findByServiceRequestId} guard.
 */
public interface CsatResponseRepository extends JpaRepository<CsatResponse, String> {

    Optional<CsatResponse> findByServiceRequestId(String serviceRequestId);

    boolean existsByServiceRequestId(String serviceRequestId);

    List<CsatResponse> findByWorkspaceIdOrderBySubmittedAtDesc(String workspaceId);

    List<CsatResponse> findByCustomerAccountIdOrderBySubmittedAtDesc(String customerAccountId);
}
