package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OnboardingPlaybookRepository extends JpaRepository<OnboardingPlaybook, String> {
    List<OnboardingPlaybook> findByWorkspaceIdOrderByKindAscNameAsc(String workspaceId);
}
