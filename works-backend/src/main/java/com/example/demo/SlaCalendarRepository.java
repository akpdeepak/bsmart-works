package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Data access for business-hours calendars. All lookups are workspace-scoped so a calendar can
 * never be read across tenants (RB-40 §1).
 */
public interface SlaCalendarRepository extends JpaRepository<SlaCalendar, String> {

    List<SlaCalendar> findByWorkspaceIdOrderByNameAsc(String workspaceId);
}
