package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/** A code-review pull request, optionally linked to a work item (Cap U — code review queue +
 *  code context). Workspace-scoped (RB-40 §1). */
@Entity
@Table(name = "pull_requests")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class PullRequest {
    @Id
    private String id;
    @Column(name = "workspace_id") private String workspaceId;
    private String repo;
    private Integer number;
    private String title;
    @Column(name = "author_id") private String authorId;
    private String status;
    private String url;
    @Column(name = "work_item_id") private String workItemId;
    private Integer additions;
    private Integer deletions;
    @Column(name = "files_changed") private Integer filesChanged;
    @Column(name = "created_at") private OffsetDateTime createdAt;
    @Column(name = "updated_at") private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getRepo() { return repo; }
    public void setRepo(String repo) { this.repo = repo; }
    public Integer getNumber() { return number; }
    public void setNumber(Integer number) { this.number = number; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getWorkItemId() { return workItemId; }
    public void setWorkItemId(String workItemId) { this.workItemId = workItemId; }
    public Integer getAdditions() { return additions; }
    public void setAdditions(Integer additions) { this.additions = additions; }
    public Integer getDeletions() { return deletions; }
    public void setDeletions(Integer deletions) { this.deletions = deletions; }
    public Integer getFilesChanged() { return filesChanged; }
    public void setFilesChanged(Integer filesChanged) { this.filesChanged = filesChanged; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
