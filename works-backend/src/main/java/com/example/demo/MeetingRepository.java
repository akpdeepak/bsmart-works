package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MeetingRepository extends JpaRepository<Meeting, String> {
    List<Meeting> findByProjectIdAndDeletedAtIsNullOrderByScheduledAtDesc(String projectId);
}
