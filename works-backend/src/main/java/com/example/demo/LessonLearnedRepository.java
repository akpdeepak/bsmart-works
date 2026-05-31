package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LessonLearnedRepository extends JpaRepository<LessonLearned, String> {
    List<LessonLearned> findByProjectIdAndDeletedAtIsNull(String projectId);
    List<LessonLearned> findByWorkspaceIdAndDeletedAtIsNull(String workspaceId);
}
