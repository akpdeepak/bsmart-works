package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

/**
 * Data access for business-hours calendars. All lookups are workspace-scoped so a
 * calendar can never be read across tenants (RB-40 §1).
 */
public interface BusinessCalendarRepository extends JpaRepository<BusinessCalendar, String> {

    List<BusinessCalendar> findByWorkspaceIdOrderByNameAsc(String workspaceId);

    Optional<BusinessCalendar> findFirstByWorkspaceIdAndIsDefaultTrue(String workspaceId);
}
