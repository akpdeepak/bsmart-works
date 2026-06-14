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
 * ({@link ReportRepository#findByIsTemplateTrueOrderByNameAsc()}), with the pivot-backed section
 * structure set in V88 (KPI grid + pivot charts + executive narrative + risk summary; customer
 * KPIs + pivot charts + open-requests table + narrative). Validates the migration is forward-only
 * and valid SQL.
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
    void monthlyExecutiveSummaryHasKpiPivotNarrativeAndRiskSections() {
        Report exec = templateNamed("Monthly executive summary");
        String sections = exec.getSections();
        // Whitespace-insensitive for the structural `"type":"x"` checks — JSONB normalises the
        // stored JSON (no spaces, keys reordered); the section shape is what matters, not spacing.
        String compact = sections.replaceAll("\\s+", "");

        // V88 made the template pivot-backed: a KPI grid + pivot charts + executive narrative + risk.
        assertThat(compact).contains("\"type\":\"kpi\"");
        assertThat(sections).contains("Total items");
        assertThat(compact).contains("\"type\":\"pivot\"");
        assertThat(sections).contains("Work by status");
        assertThat(sections).contains("Workload by assignee");
        assertThat(compact).contains("\"type\":\"narrative\"");
        assertThat(sections).contains("Executive summary");
        assertThat(sections).contains("Risk summary");
        // Pivot section shape: chartType + dimensions on the shared pivot spec.
        assertThat(sections).contains("\"chartType\"");
        assertThat(sections).contains("\"dimensions\"");
    }

    @Test
    void customerStatusHasKpiPivotTableAndNarrativeSections() {
        Report customer = templateNamed("Customer status");
        String sections = customer.getSections();
        String compact = sections.replaceAll("\\s+", "");

        // V88: KPI grid (open / resolved / at-risk) + pivot charts + open-requests table + narrative.
        assertThat(compact).contains("\"type\":\"kpi\"");
        assertThat(sections).contains("Open requests");
        assertThat(sections).contains("At risk (overdue)");
        assertThat(compact).contains("\"type\":\"pivot\"");
        assertThat(sections).contains("Open by status");
        assertThat(compact).contains("\"type\":\"table\"");
        assertThat(compact).contains("\"type\":\"narrative\"");
        assertThat(sections).contains("Summary for the customer");
    }
}
