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
 * ({@link ReportRepository#findByIsTemplateTrueOrderByNameAsc()}), with the section structure as
 * re-seeded in V88 (KPI grid + pivot-backed charts + narrative + risk summary; customer KPIs +
 * pivot + open-requests table + narrative). Validates the migration is forward-only and valid SQL.
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
    void monthlyExecutiveSummaryHasKpiChartNarrativeAndRiskSections() {
        Report exec = templateNamed("Monthly executive summary");
        String sections = exec.getSections();
        // Whitespace-insensitive for the structural `"type":"x"` checks — the stored JSON may be
        // pretty-printed (`"type": "kpi"`); the section shape is what matters, not the spacing.
        String compact = sections.replaceAll("\\s+", "");

        // V88 made the template insightful: a KPI grid + pivot-backed charts + an executive
        // narrative + a risk summary (the count-only velocity `chart` was replaced by
        // multi-dimensional `pivot` sections — see V88__insightful_report_templates.sql).
        assertThat(compact).contains("\"type\":\"kpi\"");
        assertThat(compact).contains("\"type\":\"pivot\"");
        assertThat(sections).contains("Work by status");
        assertThat(sections).contains("Executive summary");
        assertThat(sections).contains("Risk summary");
        // Pivot section shape: a chart type + the grouping dimensions.
        assertThat(sections).contains("\"chartType\"");
        assertThat(sections).contains("\"dimensions\"");
    }

    @Test
    void customerStatusHasKpiChartTableAndNarrativeSections() {
        Report customer = templateNamed("Customer status");
        String sections = customer.getSections();
        String compact = sections.replaceAll("\\s+", "");

        // V88: KPI headline counts + a pivot chart + an open-requests table + a customer narrative.
        assertThat(compact).contains("\"type\":\"kpi\"");
        assertThat(sections).contains("Open requests");
        assertThat(compact).contains("\"type\":\"pivot\"");
        assertThat(compact).contains("\"type\":\"table\"");
        assertThat(compact).contains("\"type\":\"narrative\"");
        assertThat(sections).contains("Summary for the customer");
    }
}
