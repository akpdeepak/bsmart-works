package com.bcits.works;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;

public interface ReportScheduleRepository extends JpaRepository<ReportSchedule, String> {
    List<ReportSchedule> findByReportIdOrderByCreatedAtDesc(String reportId);
    List<ReportSchedule> findByOwnerIdOrderByCreatedAtDesc(String ownerId);
    List<ReportSchedule> findByActiveTrueAndNextRunAtLessThanEqual(OffsetDateTime now);
}
