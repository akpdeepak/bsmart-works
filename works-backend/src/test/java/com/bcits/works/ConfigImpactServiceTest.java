package com.bcits.works;
import com.bcits.works.workspaces.ConfigDiffService;
import com.bcits.works.workspaces.ConfigImpactService;
import com.bcits.works.workspaces.ConfigService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

/** Unit tests for config impact analysis (iteration 17, Cap R). */
@Tag("unit")
class ConfigImpactServiceTest {

    private final ConfigService configService = mock(ConfigService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final ConfigImpactService service =
            new ConfigImpactService(configService, new ConfigDiffService(), jdbc);

    @Test
    void timezoneChangeAffectsEveryMemberAndWarns() {
        when(configService.getLiveDocument("WS-1"))
                .thenReturn("{\"settings\":{\"timezone\":\"Asia/Kolkata\"}}");
        when(jdbc.queryForObject(contains("workspace_members"), eq(Integer.class), eq("WS-1"))).thenReturn(12);
        when(jdbc.queryForObject(contains("automation_rules"), eq(Integer.class), eq("WS-1"))).thenReturn(4);
        when(jdbc.queryForObject(contains("work_items"), eq(Integer.class), eq("WS-1"))).thenReturn(47);

        ConfigImpactService.ImpactReport report =
                service.analyze("WS-1", "{\"settings\":{\"timezone\":\"UTC\"}}");

        assertThat(report.affectedUsers()).isEqualTo(12);
        assertThat(report.affectedAutomations()).isEqualTo(4);
        assertThat(report.affectedItems()).isEqualTo(47);
        assertThat(report.changes()).singleElement()
                .satisfies(c -> assertThat(c.path()).isEqualTo("settings.timezone"));
        assertThat(report.warnings()).isNotEmpty();
    }

    @Test
    void pureBrandingTweakAffectsNoStoredData() {
        when(configService.getLiveDocument("WS-1"))
                .thenReturn("{\"settings\":{\"branding\":{\"appName\":\"Works\"}}}");
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq("WS-1"))).thenReturn(99);

        ConfigImpactService.ImpactReport report =
                service.analyze("WS-1", "{\"settings\":{\"branding\":{\"appName\":\"DISCOM Works\"}}}");

        assertThat(report.affectedUsers()).isZero();
        assertThat(report.affectedAutomations()).isZero();
        assertThat(report.affectedItems()).isZero();
        assertThat(report.changes()).hasSize(1);
    }
}
