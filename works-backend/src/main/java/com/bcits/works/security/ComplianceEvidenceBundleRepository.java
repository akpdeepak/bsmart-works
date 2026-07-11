package com.bcits.works.security;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/** Compliance evidence bundles — every finder is workspace-scoped (RB-40 §1). */
public interface ComplianceEvidenceBundleRepository extends JpaRepository<ComplianceEvidenceBundle, String> {
    List<ComplianceEvidenceBundle> findByWorkspaceIdOrderByGeneratedAtDesc(String workspaceId);
}
