package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Agent steps, always workspace-scoped (RB-40 §1); read in sequence order for a run. */
public interface AiAgentStepRepository extends JpaRepository<AiAgentStep, String> {

    List<AiAgentStep> findByRunIdOrderBySeqAsc(String runId);
}
