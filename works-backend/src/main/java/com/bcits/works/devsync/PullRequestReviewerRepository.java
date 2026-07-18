package com.bcits.works.devsync;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PullRequestReviewerRepository extends JpaRepository<PullRequestReviewer, Long> {
    List<PullRequestReviewer> findByReviewerIdAndState(String reviewerId, String state);
    List<PullRequestReviewer> findByPullRequestId(String pullRequestId);
}
