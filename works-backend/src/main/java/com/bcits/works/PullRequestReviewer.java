package com.bcits.works;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/** A reviewer requested on a pull request, with their review state (Cap U — code review queue). */
@Entity
@Table(name = "pull_request_reviewers")
public class PullRequestReviewer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "pull_request_id") private String pullRequestId;
    @Column(name = "reviewer_id") private String reviewerId;
    private String state;
    @Column(name = "requested_at") private OffsetDateTime requestedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPullRequestId() { return pullRequestId; }
    public void setPullRequestId(String pullRequestId) { this.pullRequestId = pullRequestId; }
    public String getReviewerId() { return reviewerId; }
    public void setReviewerId(String reviewerId) { this.reviewerId = reviewerId; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public OffsetDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(OffsetDateTime requestedAt) { this.requestedAt = requestedAt; }
}
