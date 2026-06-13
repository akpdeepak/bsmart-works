package com.bcits.works;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class BqlCompilerTest {

    private final BqlCompiler compiler = new BqlCompiler();

    // ── Basics (parameterization preserved from the original translator) ──────────────

    @Test
    void simpleEquality_parameterizesValue() {
        BqlCompiler.Compiled c = compiler.compile("priority = Highest", "u1");
        assertEquals("priority = ?", c.sql());
        assertEquals(List.of("Highest"), c.params());
    }

    @Test
    void fieldAlias_mapsToColumn_andBindsCurrentUser() {
        BqlCompiler.Compiled c = compiler.compile("assignee = currentUser()", "user-42");
        assertEquals("assignee_id = ?", c.sql());
        assertEquals(List.of("user-42"), c.params());
    }

    @Test
    void inList_bindsEachValueSeparately() {
        BqlCompiler.Compiled c = compiler.compile("priority IN (High, Highest)", "u");
        assertEquals("priority IN (?, ?)", c.sql());
        assertEquals(List.of("High", "Highest"), c.params());
    }

    @Test
    void contains_usesIlikeWithSurroundingWildcards() {
        BqlCompiler.Compiled c = compiler.compile("title CONTAINS auth", "u");
        assertEquals("title ILIKE ?", c.sql());
        assertEquals(List.of("%auth%"), c.params());
    }

    @Test
    void startsWith_usesIlikePrefixWildcard() {
        BqlCompiler.Compiled c = compiler.compile("title STARTSWITH PROJ", "u");
        assertEquals("title ILIKE ?", c.sql());
        assertEquals(List.of("PROJ%"), c.params());
    }

    @Test
    void dateFunction_isLiteralNotParameter() {
        BqlCompiler.Compiled c = compiler.compile("dueDate < today()", "u");
        assertEquals("due_date < CURRENT_DATE", c.sql());
        assertTrue(c.params().isEmpty());
    }

    @Test
    void number_isBoundAsNumericType() {
        BqlCompiler.Compiled c = compiler.compile("points >= 5", "u");
        assertEquals("story_points >= ?", c.sql());
        assertEquals(List.of(5L), c.params());
    }

    @Test
    void quotedValue_isUnquotedBeforeBinding() {
        BqlCompiler.Compiled c = compiler.compile("status = 'In Progress'", "u");
        assertEquals("status = ?", c.sql());
        assertEquals(List.of("In Progress"), c.params());
    }

    @Test
    void emptyQuery_yieldsEmptySqlAndNoParams() {
        BqlCompiler.Compiled c = compiler.compile("   ", "u");
        assertEquals("", c.sql());
        assertTrue(c.params().isEmpty());
    }

    @Test
    void nowFunction_isLiteralNotParameter() {
        BqlCompiler.Compiled c = compiler.compile("createdAt >= now()", "u");
        assertEquals("created_at >= NOW()", c.sql());
        assertTrue(c.params().isEmpty());
    }

    @Test
    void decimalValue_isBoundAsDouble() {
        BqlCompiler.Compiled c = compiler.compile("points <= 2.5", "u");
        assertEquals("story_points <= ?", c.sql());
        assertEquals(List.of(2.5d), c.params());
    }

    @Test
    void angleBracketInequality_isTreatedAsNotEquals() {
        BqlCompiler.Compiled c = compiler.compile("status <> Done", "u");
        assertEquals("status != ?", c.sql());
        assertEquals(List.of("Done"), c.params());
    }

    // ── Boolean structure: AND/OR are now parenthesized for correct precedence ─────────

    @Test
    void andChaining_parenthesizesForPrecedence() {
        BqlCompiler.Compiled c = compiler.compile("status != Done AND type = Bug", "u");
        assertEquals("(status != ? AND type = ?)", c.sql());
        assertEquals(List.of("Done", "Bug"), c.params());
    }

    @Test
    void orConnector_isPreserved() {
        BqlCompiler.Compiled c = compiler.compile("priority = High OR priority = Highest", "u");
        assertEquals("(priority = ? OR priority = ?)", c.sql());
        assertEquals(List.of("High", "Highest"), c.params());
    }

    @Test
    void parentheses_groupOrInsideAnd() {
        BqlCompiler.Compiled c = compiler.compile(
            "status = Open AND (priority = High OR priority = Critical)", "u");
        assertEquals("(status = ? AND (priority = ? OR priority = ?))", c.sql());
        assertEquals(List.of("Open", "High", "Critical"), c.params());
    }

    @Test
    void andBindsTighterThanOr_withoutParentheses() {
        BqlCompiler.Compiled c = compiler.compile("priority = High OR status = Open AND type = Bug", "u");
        // OR is lowest precedence → priority OR (status AND type)
        assertEquals("(priority = ? OR (status = ? AND type = ?))", c.sql());
        assertEquals(List.of("High", "Open", "Bug"), c.params());
    }

    // ── New operators ─────────────────────────────────────────────────────────────────

    @Test
    void not_negatesGroup() {
        BqlCompiler.Compiled c = compiler.compile("NOT status = Done", "u");
        assertEquals("NOT (status = ?)", c.sql());
        assertEquals(List.of("Done"), c.params());
    }

    @Test
    void notIn_negatesSetMembership() {
        BqlCompiler.Compiled c = compiler.compile("status NOT IN (Done, Cancelled)", "u");
        assertEquals("status NOT IN (?, ?)", c.sql());
        assertEquals(List.of("Done", "Cancelled"), c.params());
    }

    @Test
    void between_emitsRange() {
        BqlCompiler.Compiled c = compiler.compile("points BETWEEN 2 AND 8", "u");
        assertEquals("story_points BETWEEN ? AND ?", c.sql());
        assertEquals(List.of(2L, 8L), c.params());
    }

    @Test
    void isEmpty_isNullCheck() {
        BqlCompiler.Compiled c = compiler.compile("assignee IS EMPTY", "u");
        assertEquals("assignee_id IS NULL", c.sql());
        assertTrue(c.params().isEmpty());
    }

    @Test
    void isNotEmpty_isNotNullCheck() {
        BqlCompiler.Compiled c = compiler.compile("assignee IS NOT EMPTY", "u");
        assertEquals("assignee_id IS NOT NULL", c.sql());
        assertTrue(c.params().isEmpty());
    }

    @Test
    void endsWith_usesIlikeSuffixWildcard() {
        BqlCompiler.Compiled c = compiler.compile("title ENDSWITH login", "u");
        assertEquals("title ILIKE ?", c.sql());
        assertEquals(List.of("%login"), c.params());
    }

    // ── Relative-date functions ─────────────────────────────────────────────────────

    @Test
    void startOfWeek_compilesToDateTrunc() {
        BqlCompiler.Compiled c = compiler.compile("createdAt >= startOfWeek()", "u");
        assertEquals("created_at >= date_trunc('week', CURRENT_DATE)", c.sql());
        assertTrue(c.params().isEmpty());
    }

    @Test
    void daysAgo_bindsIntervalCount() {
        BqlCompiler.Compiled c = compiler.compile("createdAt >= daysAgo(7)", "u");
        assertEquals("created_at >= (CURRENT_DATE - (? * INTERVAL '1 day'))", c.sql());
        assertEquals(List.of(7L), c.params());
    }

    @Test
    void daysAgo_nonNumericArg_throws() {
        assertThrows(BqlException.class, () -> compiler.compile("createdAt >= daysAgo(abc)", "u"));
    }

    // ── Field allow-list + field-level security ───────────────────────────────────────

    @Test
    void unknownField_isRejected() {
        // The former open-default pass-through is gone: only allow-listed fields compile.
        assertThrows(BqlException.class, () -> compiler.compile("secret_column = 1", "u"));
    }

    @Test
    void sensitiveField_allowedForTrustedContext() {
        BqlCompiler.Compiled c = compiler.compile("businessValue > 5", "u");
        assertEquals("business_value > ?", c.sql());
        assertEquals(List.of(5L), c.params());
    }

    @Test
    void sensitiveField_rejectedForUngatedUser() {
        BqlContext ctx = BqlContext.forUser("u", false);
        assertThrows(BqlException.class, () -> compiler.compileFor("businessValue > 5", ctx));
    }

    // ── Safety ────────────────────────────────────────────────────────────────────────

    @Test
    void injectionAttempt_isBoundAsOneParam_notExecutedAsSql() {
        BqlCompiler.Compiled c = compiler.compile("status = '; DROP TABLE users; --'", "u");
        assertEquals("status = ?", c.sql());
        assertEquals(List.of("; DROP TABLE users; --"), c.params());
    }

    // ── Backward compatibility with stored/seeded BQL (regression guard) ──────────────

    @Test
    void multiWordBareValue_isReadAsOneValue() {
        // Seeded compliance rules use unquoted multi-word values like `status = In Progress`.
        BqlCompiler.Compiled c = compiler.compile("status = In Progress", "u");
        assertEquals("status = ?", c.sql());
        assertEquals(List.of("In Progress"), c.params());
    }

    @Test
    void multiWordBareValue_stopsAtConnector() {
        BqlCompiler.Compiled c = compiler.compile("type = Story AND status = In Progress", "u");
        assertEquals("(type = ? AND status = ?)", c.sql());
        assertEquals(List.of("Story", "In Progress"), c.params());
    }

    @Test
    void seededComplianceRules_compile() {
        // Exact scope/assertion BQL pairs from V37 seed templates must still compile.
        for (String bql : List.of(
                "type = Story AND status = In Progress",
                "acceptance_criteria != ''",
                "status = In Progress",
                "assignee_id != ''",
                "due_date >= today()",
                "type = Bug AND priority = CRITICAL",
                "steps_to_reproduce != ''",
                "definition_of_done != ''",
                "business_value > 0")) {
            BqlCompiler.Compiled c = compiler.compile(bql, "system");
            assertTrue(c.sql() != null && !c.sql().isEmpty(), "should compile: " + bql);
        }
    }

    // ── Operator / field-type validation ─────────────────────────────────────────────

    @Test
    void textOperatorOnNumber_isRejected() {
        assertThrows(BqlException.class, () -> compiler.compile("storyPoints CONTAINS x", "u"));
    }

    @Test
    void relationalOperatorOnText_isRejected() {
        assertThrows(BqlException.class, () -> compiler.compile("title > 5", "u"));
        assertThrows(BqlException.class, () -> compiler.compile("status BETWEEN a AND b", "u"));
    }

    @Test
    void relationalOnNumberOrDate_isAllowed() {
        assertEquals("story_points >= ?", compiler.compile("points >= 5", "u").sql());
        assertEquals("due_date < CURRENT_DATE", compiler.compile("dueDate < today()", "u").sql());
    }

    // ── Custom fields (queryable via the value store) ─────────────────────────────────

    private BqlContext customCtx() {
        return BqlContext.forUser("u", true, java.util.Map.of(
            "team", new BqlContext.CustomField("FD-1", BqlField.BqlType.TEXT),
            "score", new BqlContext.CustomField("FD-2", BqlField.BqlType.NUMBER)));
    }

    @Test
    void customTextField_comparesViaValueStore() {
        BqlCompiler.Compiled c = compiler.compileFor("team = Platform", customCtx());
        assertEquals("id IN (SELECT work_item_id FROM work_item_field_value "
            + "WHERE field_def_id = ? AND value_text = ?)", c.sql());
        assertEquals(List.of("FD-1", "Platform"), c.params());
    }

    @Test
    void customNumberField_usesValueNumberColumn() {
        BqlCompiler.Compiled c = compiler.compileFor("score > 5", customCtx());
        assertEquals("id IN (SELECT work_item_id FROM work_item_field_value "
            + "WHERE field_def_id = ? AND value_number > ?)", c.sql());
        assertEquals(List.of("FD-2", 5L), c.params());
    }

    @Test
    void customField_isEmpty_negatesMembership() {
        BqlCompiler.Compiled empty = compiler.compileFor("team IS EMPTY", customCtx());
        assertEquals("id NOT IN (SELECT work_item_id FROM work_item_field_value "
            + "WHERE field_def_id = ? AND value_text IS NOT NULL)", empty.sql());
        assertEquals(List.of("FD-1"), empty.params());

        BqlCompiler.Compiled notEmpty = compiler.compileFor("team IS NOT EMPTY", customCtx());
        assertEquals("id IN (SELECT work_item_id FROM work_item_field_value "
            + "WHERE field_def_id = ? AND value_text IS NOT NULL)", notEmpty.sql());
    }

    @Test
    void customField_notIn_flipsOuterMembership() {
        BqlCompiler.Compiled c = compiler.compileFor("team NOT IN (A, B)", customCtx());
        assertEquals("id NOT IN (SELECT work_item_id FROM work_item_field_value "
            + "WHERE field_def_id = ? AND value_text IN (?, ?))", c.sql());
        assertEquals(List.of("FD-1", "A", "B"), c.params());
    }

    @Test
    void customAndBuiltin_mix_keepsParamOrder() {
        BqlCompiler.Compiled c = compiler.compileFor("status = Open AND score > 3", customCtx());
        assertEquals("(status = ? AND id IN (SELECT work_item_id FROM work_item_field_value "
            + "WHERE field_def_id = ? AND value_number > ?))", c.sql());
        assertEquals(List.of("Open", "FD-2", 3L), c.params());
    }

    @Test
    void unknownField_stillRejected_whenCustomFieldsPresent() {
        assertThrows(BqlException.class, () -> compiler.compileFor("nope = 1", customCtx()));
    }

    @Test
    void malformedCondition_throwsBqlException() {
        assertThrows(BqlException.class, () -> compiler.compile("this is not valid", "u"));
    }

    @Test
    void unterminatedString_throwsBqlException() {
        assertThrows(BqlException.class, () -> compiler.compile("status = 'oops", "u"));
    }

    @Test
    void unbalancedParen_throwsBqlException() {
        assertThrows(BqlException.class, () -> compiler.compile("(status = Open", "u"));
    }
}
