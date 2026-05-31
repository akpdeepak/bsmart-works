package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LessonLearnedRepository extends JpaRepository<LessonLearned, String> {
    List<LessonLearned> findByProjectIdOrderByCreatedAtDesc(String projectId);
}
