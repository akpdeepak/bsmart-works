package com.bcits.works;

import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Seeded report templates (Cap J, S05) against real Postgres with the Flyway migrations applied.
 * Asserts the two templates the spec names — Monthly executive summary and Customer status — are
 * returned by the repository method behind {@code GET /api/v1/reports/templates}
 * ({@link ReportRepository#findByIsTemplateTrueOrderByNameAsc()}), with the section structure
 * enriched in V84 (KPI grid + velocity/trend chart + narrative + risk summary; customer health +
 * SLA + open-requests table + narrative). Validates the migration is forward-only and valid SQL.
 */
@Tag("integration")
@Testcontainers
@SpringBootTest
class ReportTemplateSeedIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired ReportRepository reportRepository;

    private Report templateNamed(String name) {
        List<Report> templates = reportRepository.findByIsTemplateTrueOrderByNameAsc();
        return templates.stream()
            .filter(r -> name.equals(r.getName()))
            .findFirst()
            .orElseThrow(() -> new AssertionError("template not seeded: " + name));
    }

    @Test
    void templatesEndpointReturnsBothSpecNamedTemplates() {
        List<Report> templates = reportRepository.findByIsTemplateTrueOrderByNameAsc();

        // Every template is global (no owner) and flagged as a template.
        assertThat(templates).allSatisfy(t -> {
            assertThat(t.getIsTemplate()).isTrue();
            assertThat(t.getOwnerId()).isNull();
        });

        assertThat(templates).extracting(Report::getName)
            .contains("Monthly executive summary", "Customer status");
    }

    @Test
    void monthlyExecutiveSummaryHasKpiTrendNarrativeAndRiskSections() {
        Report exec = templateNamed("Monthly executive summary");
        String sections = exec.getSections();

        // KPI grid + velocity/trend chart + executive narrative + risk summary.
        assertThat(sections).contains("\"type\":\"kpi\"");
        assertThat(sections).contains("Velocity & delivery trend");
        assertThat(sections).contains("\"type\":\"chart\"");
        assertThat(sections).contains("Executive summary");
        assertThat(sections).contains("Risk summary");
        // Section shape matches the seed contract: chartType + dimension on charts.
        assertThat(sections).contains("\"chartType\"");
        assertThat(sections).contains("\"dimension\"");
    }

    @Test
    void customerStatusHasHealthSlaTableAndNarrativeSections() {
        Report customer = templateNamed("Customer status");
        String sections = customer.getSections();

        // Customer health + SLA + open-requests table + narrative.
        assertThat(sections).contains("Customer health");
        assertThat(sections).contains("Within SLA");
        assertThat(sections).contains("SLA at risk");
        assertThat(sections).contains("\"type\":\"table\"");
        assertThat(sections).contains("Open requests");
        assertThat(sections).contains("\"type\":\"narrative\"");
    }
}
