package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("unit")
class BqlCompilerTest {

    private final BqlCompiler compiler = new BqlCompiler();

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
    void andOrChaining_preservesConnectors() {
        BqlCompiler.Compiled c = compiler.compile("status != Done AND type = Bug", "u");
        assertEquals("status != ? AND type = ?", c.sql());
        assertEquals(List.of("Done", "Bug"), c.params());
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
        BqlCompiler.Compiled c = compiler.compile("due_date < today()", "u");
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
    void injectionAttempt_isBoundAsOneParam_notExecutedAsSql() {
        BqlCompiler.Compiled c = compiler.compile("status = x'; DROP TABLE users; --", "u");
        assertEquals("status = ?", c.sql());
        assertEquals(List.of("x'; DROP TABLE users; --"), c.params());
    }

    @Test
    void emptyQuery_yieldsEmptySqlAndNoParams() {
        BqlCompiler.Compiled c = compiler.compile("   ", "u");
        assertEquals("", c.sql());
        assertTrue(c.params().isEmpty());
    }

    @Test
    void malformedCondition_throwsBqlException() {
        assertThrows(BqlException.class, () -> compiler.compile("this is not valid", "u"));
    }
}
