package com.example.demo;

import org.springframework.stereotype.Service;

/**
 * Pure state-machine for the knowledge-article publishing workflow
 * (Author -> Review -> Publish, with archive/restore). Holds no I/O so the
 * transition rules are unit-testable in isolation.
 *
 * States:  DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED
 * Actions: submit | publish | reject | archive | restore
 */
@Service
public class ArticleWorkflowService {

    public static final String DRAFT     = "DRAFT";
    public static final String IN_REVIEW = "IN_REVIEW";
    public static final String PUBLISHED = "PUBLISHED";
    public static final String ARCHIVED  = "ARCHIVED";

    /**
     * Returns the status that results from applying {@code action} to {@code current},
     * or throws {@link IllegalStateException} if the transition is not allowed.
     */
    public String transition(String current, String action) {
        String from = current == null ? DRAFT : current;
        String act = action == null ? "" : action.toLowerCase();
        return switch (act) {
            case "submit"  -> require(from, DRAFT, IN_REVIEW, action);
            case "publish" -> require(from, IN_REVIEW, PUBLISHED, action);
            case "reject"  -> require(from, IN_REVIEW, DRAFT, action);
            case "archive" -> require(from, PUBLISHED, ARCHIVED, action);
            case "restore" -> require(from, ARCHIVED, DRAFT, action);
            default -> throw new IllegalStateException("Unknown article workflow action: " + action);
        };
    }

    private String require(String from, String expected, String to, String action) {
        if (!expected.equals(from)) {
            throw new IllegalStateException(
                "Cannot '" + action + "' an article in state " + from + " (requires " + expected + ")");
        }
        return to;
    }
}
