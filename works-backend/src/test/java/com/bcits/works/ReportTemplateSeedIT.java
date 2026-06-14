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
 * made insightful in V88 (KPI grid + pivot-backed charts + table + narrative prompts; the templates
 * now drive the shared pivot engine rather than count-only charts). Validates the migration is
 * forward-only and valid SQL.
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
    void monthlyExecutiveSummaryHasKpiPivotChartsAndNarrativeSections() {
        Report exec = templateNamed("Monthly executive summary");
        String sections = exec.getSections();
        // Whitespace-insensitive for the structural `"type":"x"` checks — the stored JSON may be
        // pretty-printed (`"type": "kpi"`); the section shape is what matters, not the spacing.
        String compact = sections.replaceAll("\\s+", "");

        // V88: KPI grid + pivot-backed charts (status/type/assignee/priority) + executive + risk narrative.
        assertThat(compact).contains("\"type\":\"kpi\"");
        assertThat(compact).contains("\"type\":\"pivot\"");
        assertThat(sections).contains("Work by status");
        assertThat(sections).contains("Executive summary");
        assertThat(sections).contains("Risk summary");
        // Pivot sections carry a guided spec with chartType + dimensions (drives the shared pivot engine).
        assertThat(compact).contains("\"sourceKind\":\"guided\"");
        assertThat(sections).contains("\"chartType\"");
        assertThat(sections).contains("\"dimensions\"");
    }

    @Test
    void customerStatusHasKpiPivotTableAndNarrativeSections() {
        Report customer = templateNamed("Customer status");
        String sections = customer.getSections();
        String compact = sections.replaceAll("\\s+", "");

        // V88: KPI grid + open-by-status/priority pivots + open-requests table + customer narrative.
        assertThat(compact).contains("\"type\":\"kpi\"");
        assertThat(sections).contains("Open requests");
        assertThat(sections).contains("At risk (overdue)");
        assertThat(compact).contains("\"type\":\"pivot\"");
        assertThat(compact).contains("\"type\":\"table\"");
        assertThat(compact).contains("\"type\":\"narrative\"");
        assertThat(sections).contains("Summary for the customer");
    }
}
