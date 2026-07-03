package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** A reviewer requested on a pull request, with their review state (Cap U — code review queue). */
@Entity
@Table(name = "pull_request_reviewers")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "pull_request_id IN (SELECT pr.id FROM pull_requests pr WHERE pr.workspace_id = :workspaceId)")
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
