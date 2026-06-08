package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CrossProjectDependencyRepository extends JpaRepository<CrossProjectDependency, String> {
    List<CrossProjectDependency> findByFromProjectIdOrderByCreatedAtDesc(String fromProjectId);
}
