package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Installed extensions, workspace-scoped by construction (RB-40 §1 — every finder filters on workspaceId). */
public interface InstalledExtensionRepository extends JpaRepository<InstalledExtension, String> {

    List<InstalledExtension> findByWorkspaceIdOrderByInstalledAtDesc(String workspaceId);

    Optional<InstalledExtension> findByWorkspaceIdAndListingId(String workspaceId, String listingId);

    Optional<InstalledExtension> findByWorkspaceIdAndId(String workspaceId, String id);
}
