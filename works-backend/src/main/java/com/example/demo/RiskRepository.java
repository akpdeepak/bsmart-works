package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RiskRepository extends JpaRepository<Risk, String> {
    List<Risk> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<Risk> findByProjectIdAndStatusOrderByCreatedAtDesc(String projectId, String status);
}
