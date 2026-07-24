package com.bcits.works.service;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, String> {
    List<CustomerFeedback> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(String workspaceId);

    /** Backfill guard (RB-40 §3, Slice 3): feedback whose free-text customer attribution has not yet
     *  been tokenized into the vault. Runs in system scope so the workspace @Filter does not narrow it. */
    List<CustomerFeedback> findByCustomerSubjectTokenIsNullAndCustomerIsNotNull();
}
