package com.bcits.works.workspaces;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OperatingModelPolicyRepository extends JpaRepository<OperatingModelPolicy, String> {
    List<OperatingModelPolicy> findByWorkspaceId(String workspaceId);
}
