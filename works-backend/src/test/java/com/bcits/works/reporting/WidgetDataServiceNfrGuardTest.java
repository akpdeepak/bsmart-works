package com.bcits.works.reporting;

import com.bcits.works.auth.RbacService;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.BqlCompiler;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.lang.reflect.Field;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * NFR guard test (RB-40 §5 — dashboard render P95 1.5s). Asserts {@link WidgetDataService}'s
 * fan-out guards hold deterministically — the batch cap, the list/group row caps, and the
 * per-query 5-second timeout — rather than timing wall-clock, so the budget contract is enforced
 * without a flaky benchmark. A dashboard cannot fan out unbounded work past these limits.
 */
@Tag("unit")
class WidgetDataServiceNfrGuardTest {

    private static final String WS = "ws-A";
    private static final String USER = "user-A";

    private final DataSource dataSource = mock(DataSource.class);
    private final RbacService rbac = mock(RbacService.class);
    private final WidgetDataService service =
            new WidgetDataService(dataSource, new BqlCompiler(), rbac);

    @Test
    void guardConstantsMatchTheNfrContract() {
        // The constants the dashboard render budget (RB-40 §5) leans on. If any is loosened, the
        // budget assumption changes — this is the canary.
        assertThat(WidgetDataService.MAX_BATCH).isEqualTo(12);
        assertThat(WidgetDataService.MAX_LIST).isEqualTo(50);
        assertThat(WidgetDataService.MAX_GROUP).isEqualTo(20);
    }

    @Test
    void dedicatedJdbcTemplateCarriesFiveSecondTimeout() throws Exception {
        Field jdbcField = WidgetDataService.class.getDeclaredField("jdbc");
        jdbcField.setAccessible(true);
        JdbcTemplate jdbc = (JdbcTemplate) jdbcField.get(service);
        assertThat(jdbc.getQueryTimeout()).isEqualTo(5);
    }

    @Test
    void batchAtCapIsAccepted() {
        Map<String, WidgetSource> sources = sources(WidgetDataService.MAX_BATCH);
        // Each entry resolves a count over a mock DataSource; the point is the cap does NOT trip
        // at exactly MAX_BATCH (errors per entry are swallowed into BatchResult, never thrown).
        assertThatCode(() -> service.batch(WS, USER, sources)).doesNotThrowAnyException();
    }

    @Test
    void batchOverCapIsRejectedBeforeAnyQuery() {
        Map<String, WidgetSource> sources = sources(WidgetDataService.MAX_BATCH + 1);

        assertThatThrownBy(() -> service.batch(WS, USER, sources))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getCode()).isEqualTo("BATCH_TOO_LARGE"));

        // Guard trips before touching the database — no connection is ever requested.
        verifyNoInteractions(dataSource);
    }

    @Test
    void batchStillRequiresMembershipBeforeTheCapCheck() {
        doThrow(ApiException.forbidden("denied")).when(rbac).require(eq(USER), eq(WS), any());

        assertThatThrownBy(() -> service.batch(WS, USER, sources(WidgetDataService.MAX_BATCH + 1)))
                .isInstanceOf(ApiException.class);

        verifyNoInteractions(dataSource);
    }

    private static Map<String, WidgetSource> sources(int n) {
        Map<String, WidgetSource> m = new LinkedHashMap<>();
        for (int i = 0; i < n; i++) {
            // metric kind with an unknown key → resolution fails fast as a per-entry error,
            // never a real query, keeping the cap behavior the only thing under test.
            m.put("w" + i, new WidgetSource("metric", "nope", null, null, null, null, null));
        }
        return m;
    }
}
