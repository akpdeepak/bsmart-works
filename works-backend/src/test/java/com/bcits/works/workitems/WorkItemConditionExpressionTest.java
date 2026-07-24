package com.bcits.works.workitems;
import com.bcits.works.AutomationService;
import com.bcits.works.workitems.api.WorkItem;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Direct coverage for the condition evaluator extracted from {@code AutomationService}
 * (EPIC-03 Phase 2, GH-537). The existing {@code AutomationServiceTest} cases still pass through
 * the delegating {@code AutomationService.conditionMatches}, which is the characterization evidence
 * that the extraction preserved behavior; these cases pin the now-public API in its own right and
 * cover the assignee field and unsupported-field cases the automation suite did not reach.
 */
class WorkItemConditionExpressionTest {

    private WorkItem item(String priority, String type, String status, String assigneeId) {
        WorkItem w = new WorkItem();
        w.setId("A");
        w.setProjectId("PROJ-1");
        w.setPriority(priority);
        w.setType(type);
        w.setStatus(status);
        w.setAssigneeId(assigneeId);
        return w;
    }

    @Test
    void blankExpressionMatchesEverything() {
        WorkItem w = item("High", "Bug", "Todo", "u1");
        assertThat(WorkItemConditionExpression.matches(w, null)).isTrue();
        assertThat(WorkItemConditionExpression.matches(w, "")).isTrue();
        assertThat(WorkItemConditionExpression.matches(w, "   ")).isTrue();
    }

    @Test
    void clausesAreAndCombined() {
        WorkItem w = item("High", "Bug", "Todo", "u1");
        assertThat(WorkItemConditionExpression.matches(w, "priority = High AND type = Bug")).isTrue();
        assertThat(WorkItemConditionExpression.matches(w, "priority = High AND type = Story")).isFalse();
    }

    @Test
    void equalityIsCaseInsensitiveAndTolersQuotes() {
        WorkItem w = item("High", "Bug", "Todo", "u1");
        assertThat(WorkItemConditionExpression.matches(w, "priority = high")).isTrue();
        assertThat(WorkItemConditionExpression.matches(w, "priority = \"High\"")).isTrue();
        assertThat(WorkItemConditionExpression.matches(w, "priority = 'High'")).isTrue();
    }

    @Test
    void negationInvertsTheClause() {
        WorkItem w = item("High", "Bug", "Todo", "u1");
        assertThat(WorkItemConditionExpression.matches(w, "priority != Low")).isTrue();
        assertThat(WorkItemConditionExpression.matches(w, "priority != High")).isFalse();
    }

    @Test
    void assigneeIsAddressableUnderBothSpellings() {
        WorkItem w = item("High", "Bug", "Todo", "u1");
        assertThat(WorkItemConditionExpression.matches(w, "assignee = u1")).isTrue();
        assertThat(WorkItemConditionExpression.matches(w, "assigneeId = u1")).isTrue();
        assertThat(WorkItemConditionExpression.matches(w, "assignee = u2")).isFalse();
    }

    @Test
    void unsupportedFieldNeverMatches() {
        WorkItem w = item("High", "Bug", "Todo", "u1");
        assertThat(WorkItemConditionExpression.matches(w, "title = anything")).isFalse();
        assertThat(WorkItemConditionExpression.matches(w, "title != anything")).isTrue();
    }

    @Test
    void malformedClauseRejectsTheWholeExpression() {
        WorkItem w = item("High", "Bug", "Todo", "u1");
        assertThat(WorkItemConditionExpression.matches(w, "priority")).isFalse();
    }

    @Test
    void nullFieldValueDoesNotMatchButNegationDoes() {
        WorkItem w = item("High", "Bug", "Todo", null);
        assertThat(WorkItemConditionExpression.matches(w, "assignee = u1")).isFalse();
        assertThat(WorkItemConditionExpression.matches(w, "assignee != u1")).isTrue();
    }
}
