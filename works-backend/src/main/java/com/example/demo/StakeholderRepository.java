package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StakeholderRepository extends JpaRepository<Stakeholder, String> {
    List<Stakeholder> findByProjectIdOrderByNameAsc(String projectId);
}
