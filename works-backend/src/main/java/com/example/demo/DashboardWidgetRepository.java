package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface DashboardWidgetRepository extends JpaRepository<DashboardWidget, Long> {
    List<DashboardWidget> findByDashboardIdOrderByPositionAsc(String dashboardId);

    @Transactional
    void deleteByDashboardId(String dashboardId);
}
