package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SprintRepository extends JpaRepository<Sprint, String> {
    List<Sprint> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<Sprint> findByProjectIdAndStatus(String projectId, String status);
}
