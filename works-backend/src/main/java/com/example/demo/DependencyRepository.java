package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DependencyRepository extends JpaRepository<Dependency, String> {
    List<Dependency> findByProjectIdAndDeletedAtIsNull(String projectId);
}
