package com.bcits.works;

import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit coverage for the pure guided→BQL compilation (no DB). Proves the visual builder emits BQL
 * the real {@link BqlCompiler} accepts, and that statuses stay mixed-case while types/priorities
 * are uppercase (post-V68). Execution, scoping and RBAC are covered by {@code WidgetDataIT}.
 */
@Tag("unit")
class WidgetDataServiceTest {

    private final BqlCompiler compiler = new BqlCompiler();

    private static WidgetSource.GuidedSpec spec(Boolean mine, Boolean open, Boolean overdue,
                                                List<String> types, List<String> priorities) {
        return new WidgetSource.GuidedSpec(mine, open, overdue, types, priorities);
    }

    @Test
    void emptySpec_compilesToEmptyBql() {
        assertThat(WidgetDataService.guidedToBql(null)).isEmpty();
        assertThat(WidgetDataService.guidedToBql(spec(null, null, null, null, null))).isEmpty();
    }

    @Test
    void open_and_mine_and_overdue_combineWithAnd() {
        String bql = WidgetDataService.guidedToBql(spec(true, true, true, null, null));
        assertThat(bql).isEqualTo(
            "status != \"Done\" AND assignee = currentUser() AND dueDate < today()");
        // And it must be valid BQL the compiler can parse end-to-end.
        BqlCompiler.Compiled c = compiler.compile(bql, "USR-1");
        assertThat(c.sql()).contains("status != ?").contains("assignee_id = ?").contains("due_date < CURRENT_DATE");
        assertThat(c.params()).containsExactly("Done", "USR-1");
    }

    @Test
    void singleType_emitsEquality_multipleTypes_emitInClause() {
        assertThat(WidgetDataService.guidedToBql(spec(null, null, null, List.of("BUG"), null)))
            .isEqualTo("type = \"BUG\"");
        assertThat(WidgetDataService.guidedToBql(spec(null, null, null, List.of("BUG", "STORY"), null)))
            .isEqualTo("type IN (\"BUG\", \"STORY\")");
    }

    @Test
    void priorities_compile_andBlanksAreDropped() {
        String bql = WidgetDataService.guidedToBql(
            spec(null, true, null, null, List.of("HIGH", " ", "CRITICAL")));
        assertThat(bql).isEqualTo("status != \"Done\" AND priority IN (\"HIGH\", \"CRITICAL\")");
        BqlCompiler.Compiled c = compiler.compile(bql, "USR-1");
        assertThat(c.params()).containsExactly("Done", "HIGH", "CRITICAL");
    }
}
