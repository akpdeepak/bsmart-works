package com.bcits.works.security;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EvidencePackageRepository extends JpaRepository<EvidencePackage, String> {
    List<EvidencePackage> findByWorkspaceIdOrderByGeneratedAtDesc(String workspaceId);
}
