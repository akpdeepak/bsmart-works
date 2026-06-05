package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link NlToBqlParser} — the deterministic NL→BQL fallback (iteration 10, Cap O /
 * I10-S12). Proves recognisable phrases map to the expected BQL and unrecognised input is flagged
 * low-confidence (so the UI offers the manual builder). Pure; no DB.
 */
@Tag("unit")
class NlToBqlParserTest {

    private final NlToBqlParser parser = new NlToBqlParser();

    @Test
    void openBugsAssignedToMe() {
        NlToBqlParser.Result r = parser.parse("open bugs assigned to me");
        assertThat(r.confident()).isTrue();
        assertThat(r.bql()).isEqualTo("status != \"Done\" AND type = \"Bug\" AND assignee = currentUser()");
    }

    @Test
    void myHighPriorityTasks() {
        NlToBqlParser.Result r = parser.parse("my high priority tasks");
        assertThat(r.confident()).isTrue();
        assertThat(r.bql()).isEqualTo("type = \"Task\" AND priority = \"High\" AND assignee = currentUser()");
    }

    @Test
    void closedStories() {
        NlToBqlParser.Result r = parser.parse("closed stories");
        assertThat(r.confident()).isTrue();
        assertThat(r.bql()).isEqualTo("status = \"Done\" AND type = \"Story\"");
    }

    @Test
    void assignedToNamedPerson() {
        NlToBqlParser.Result r = parser.parse("bugs assigned to rahul");
        assertThat(r.confident()).isTrue();
        assertThat(r.bql()).contains("type = \"Bug\"").contains("assignee = \"rahul\"");
    }

    @Test
    void createdToday() {
        NlToBqlParser.Result r = parser.parse("tasks created today");
        assertThat(r.confident()).isTrue();
        assertThat(r.bql()).contains("created_at >= today()");
    }

    @Test
    void unrecognisedPhrase_isLowConfidence() {
        NlToBqlParser.Result r = parser.parse("xyzzy plugh");
        assertThat(r.confident()).isFalse();
        assertThat(r.bql()).isEmpty();
        assertThat(r.explanation()).contains("manual");
    }

    @Test
    void blankPhrase_isLowConfidence() {
        assertThat(parser.parse("").confident()).isFalse();
        assertThat(parser.parse(null).confident()).isFalse();
    }
}
