package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OnboardingRunStepRepository extends JpaRepository<OnboardingRunStep, String> {
    List<OnboardingRunStep> findByRunIdOrderBySortOrderAsc(String runId);
}
