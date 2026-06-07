package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** GDPR/DPDP data-subject requests — every finder is workspace-scoped (RB-40 §1). */
public interface DataSubjectRequestRepository extends JpaRepository<DataSubjectRequest, String> {
    List<DataSubjectRequest> findByWorkspaceIdOrderByRequestedAtDesc(String workspaceId);
}
