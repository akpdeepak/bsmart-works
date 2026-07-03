package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A workspace's board WIP (work-in-progress) limits for the three fixed board columns
 * (Todo / In Progress / Done). One row per workspace; a NULL limit means that column is unbounded.
 * Workspace-scoped (RB-40 §1): the workspace id is the primary key. The board groups items by status
 * name and is not driven by the per-workflow workflow_status table, so the limits live here rather
 * than on a per-status row.
 */
@Entity
@Table(name = "board_wip_limits")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class BoardWipLimit {

    @Id
    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "todo_limit")
    private Integer todoLimit;

    @Column(name = "in_progress_limit")
    private Integer inProgressLimit;

    @Column(name = "done_limit")
    private Integer doneLimit;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public Integer getTodoLimit() { return todoLimit; }
    public void setTodoLimit(Integer todoLimit) { this.todoLimit = todoLimit; }
    public Integer getInProgressLimit() { return inProgressLimit; }
    public void setInProgressLimit(Integer inProgressLimit) { this.inProgressLimit = inProgressLimit; }
    public Integer getDoneLimit() { return doneLimit; }
    public void setDoneLimit(Integer doneLimit) { this.doneLimit = doneLimit; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
