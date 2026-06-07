package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OnboardingRunRepository extends JpaRepository<OnboardingRun, String> {
    List<OnboardingRun> findByWorkspaceIdOrderByStartedAtDesc(String workspaceId);
}
