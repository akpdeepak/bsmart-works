package com.bcits.works.reporting;

import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Pure field-level helpers for reports — id generation, defaults, and update
 * copying. No I/O, so it is unit-testable in isolation (mirrors DashboardLayoutService).
 */
@Service
public class ReportService {

    /** Sections default to an empty JSON array when absent. */
    public String normalizeSections(String sections) {
        return sections == null || sections.isBlank() ? "[]" : sections;
    }

    /** Stamp a new report with id, owner, defaults and timestamps. Mutates and returns it. */
    public Report prepareNew(Report report, String ownerId) {
        report.setId("RPT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        report.setOwnerId(ownerId);
        report.setSections(normalizeSections(report.getSections()));
        report.setIsTemplate(report.getIsTemplate() != null && report.getIsTemplate());
        OffsetDateTime now = OffsetDateTime.now();
        report.setCreatedAt(now);
        report.setUpdatedAt(now);
        return report;
    }

    /** Copy the editable fields from updated onto existing and bump updatedAt. */
    public Report applyUpdate(Report existing, Report updated) {
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        if (updated.getProjectId() != null) existing.setProjectId(updated.getProjectId());
        if (updated.getSections() != null) existing.setSections(normalizeSections(updated.getSections())); {
        existing.setUpdatedAt(OffsetDateTime.now());
        }
        return existing;
    }
}
