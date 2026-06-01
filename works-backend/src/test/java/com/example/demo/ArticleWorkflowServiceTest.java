package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("unit")
class ArticleWorkflowServiceTest {

    private final ArticleWorkflowService service = new ArticleWorkflowService();

    @Test
    void submit_movesDraftToInReview() {
        assertThat(service.transition("DRAFT", "submit")).isEqualTo("IN_REVIEW");
    }

    @Test
    void publish_movesInReviewToPublished() {
        assertThat(service.transition("IN_REVIEW", "publish")).isEqualTo("PUBLISHED");
    }

    @Test
    void reject_movesInReviewBackToDraft() {
        assertThat(service.transition("IN_REVIEW", "reject")).isEqualTo("DRAFT");
    }

    @Test
    void archive_movesPublishedToArchived() {
        assertThat(service.transition("PUBLISHED", "archive")).isEqualTo("ARCHIVED");
    }

    @Test
    void restore_movesArchivedToDraft() {
        assertThat(service.transition("ARCHIVED", "restore")).isEqualTo("DRAFT");
    }

    @Test
    void nullCurrentStatus_treatedAsDraft() {
        assertThat(service.transition(null, "submit")).isEqualTo("IN_REVIEW");
    }

    @Test
    void action_isCaseInsensitive() {
        assertThat(service.transition("DRAFT", "SUBMIT")).isEqualTo("IN_REVIEW");
    }

    @Test
    void publish_fromDraft_isRejected_enforcingReviewGate() {
        assertThatThrownBy(() -> service.transition("DRAFT", "publish"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("requires IN_REVIEW");
    }

    @Test
    void submit_fromPublished_isRejected() {
        assertThatThrownBy(() -> service.transition("PUBLISHED", "submit"))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void unknownAction_isRejected() {
        assertThatThrownBy(() -> service.transition("DRAFT", "frobnicate"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Unknown article workflow action");
    }
}
