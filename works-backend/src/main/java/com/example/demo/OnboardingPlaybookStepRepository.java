package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OnboardingPlaybookStepRepository extends JpaRepository<OnboardingPlaybookStep, String> {
    List<OnboardingPlaybookStep> findByPlaybookIdOrderBySortOrderAsc(String playbookId);
}
