package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssumptionRepository extends JpaRepository<Assumption, String> {
    List<Assumption> findByProjectIdAndDeletedAtIsNull(String projectId);
}
