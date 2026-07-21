package com.bcits.works;
import com.bcits.works.sla.SlaCalendar;
import com.bcits.works.sla.SlaEscalation;
import com.bcits.works.sla.SlaPolicy;
import com.bcits.works.sla.SlaPolicyService;
import com.bcits.works.sla.SlaTarget;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link SlaPolicyService} — the pure field-level helpers (id generation, defaults,
 * normalization, update copying) for SLA policies, calendars, targets, and escalations. No DB.
 */
@Tag("unit")
class SlaPolicyServiceTest {

    private final SlaPolicyService service = new SlaPolicyService();

    // ── Policies ───────────────────────────────────────────────────────────────

    @Test
    void prepareNew_stampsIdCreatorDefaults_andStartsInactive() {
        SlaPolicy p = new SlaPolicy();
        p.setName("P0 resolution");
        p.setScopeBql("  priority = \"P0\"  ");
        p.setActive(true); // caller cannot create an already-active policy

        SlaPolicy out = service.prepareNew(p, "USR-1");

        assertThat(out.getId()).startsWith("SLP-");
        assertThat(out.getCreatedBy()).isEqualTo("USR-1");
        assertThat(out.getScopeBql()).isEqualTo("priority = \"P0\""); // trimmed
        assertThat(out.getActive()).isFalse();                        // test-before-activate
        assertThat(out.getCreatedAt()).isNotNull();
        assertThat(out.getUpdatedAt()).isNotNull();
    }

    @Test
    void applyUpdate_copiesEditableFields_andClearsNullableCalendarTier() {
        SlaPolicy existing = new SlaPolicy();
        existing.setName("Old");
        existing.setCalendarId("SLC-OLD");
        existing.setCustomerTier("GOLD");

        SlaPolicy updated = new SlaPolicy();
        updated.setName("New");
        updated.setScopeBql(" type = \"Incident\" ");
        // calendarId / customerTier left null → cleared (24x7 / internal)

        SlaPolicy out = service.applyUpdate(existing, updated);

        assertThat(out.getName()).isEqualTo("New");
        assertThat(out.getScopeBql()).isEqualTo("type = \"Incident\"");
        assertThat(out.getCalendarId()).isNull();
        assertThat(out.getCustomerTier()).isNull();
        assertThat(out.getUpdatedAt()).isNotNull();
    }

    // ── Calendars ──────────────────────────────────────────────────────────────

    @Test
    void prepareCalendar_defaultsTimezoneAndJson() {
        SlaCalendar c = new SlaCalendar();
        c.setName("IST business hours");
        c.setTimezone("  ");
        c.setWorkWeek(null);
        c.setHolidays(null);

        SlaCalendar out = service.prepareCalendar(c, "USR-1");

        assertThat(out.getId()).startsWith("SLC-");
        assertThat(out.getTimezone()).isEqualTo("Asia/Kolkata");
        assertThat(out.getWorkWeek()).isEqualTo("{}");
        assertThat(out.getHolidays()).isEqualTo("[]");
    }

    // ── Targets ────────────────────────────────────────────────────────────────

    @Test
    void prepareTarget_normalizesMetricAndDefaults() {
        SlaTarget t = new SlaTarget();
        t.setMetric("  first_response ");
        t.setTargetMinutes(240);
        t.setPauseStatuses(null);
        t.setSortOrder(null);

        SlaTarget out = service.prepareTarget(t, "SLP-1", "WS-1");

        assertThat(out.getId()).startsWith("SLT-");
        assertThat(out.getPolicyId()).isEqualTo("SLP-1");
        assertThat(out.getWorkspaceId()).isEqualTo("WS-1");
        assertThat(out.getMetric()).isEqualTo("FIRST_RESPONSE");
        assertThat(out.getPauseStatuses()).isEqualTo("[]");
        assertThat(out.getSortOrder()).isZero();
    }

    @Test
    void prepareTarget_defaultsMetricToResolution() {
        SlaTarget t = new SlaTarget();
        t.setTargetMinutes(60);
        assertThat(service.prepareTarget(t, "SLP-1", "WS-1").getMetric()).isEqualTo("RESOLUTION");
    }

    // ── Escalations ────────────────────────────────────────────────────────────

    @Test
    void prepareEscalation_normalizesActionAndDefaults() {
        SlaEscalation e = new SlaEscalation();
        e.setAction(" notify ");
        e.setActionTarget(null);
        e.setOnBreach(null);
        e.setSortOrder(null);

        SlaEscalation out = service.prepareEscalation(e, "SLP-1", "WS-1");

        assertThat(out.getId()).startsWith("SLE-");
        assertThat(out.getPolicyId()).isEqualTo("SLP-1");
        assertThat(out.getAction()).isEqualTo("NOTIFY");
        assertThat(out.getActionTarget()).isEqualTo("[]");
        assertThat(out.getOnBreach()).isFalse();
        assertThat(out.getSortOrder()).isZero();
    }
}
