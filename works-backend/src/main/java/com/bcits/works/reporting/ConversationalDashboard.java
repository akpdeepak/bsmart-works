package com.bcits.works.reporting;
import com.bcits.works.workspaces.api.Workspace;

import com.bcits.works.shared.WorkspaceFilterActivator;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/**
 * A saved conversational dashboard (Cap O, iteration 20) — a natural-language ask compiled into a
 * structured widget spec ({@code specJson}) the dashboard renders. The prompt is kept for
 * provenance. Workspace-scoped (RB-40 §1).
 */
@Entity
@Table(name = "conversational_dashboards")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class ConversationalDashboard {

    @Id
    private String id;

    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "user_id")
    private String userId;

    private String title;
    private String prompt;

    @Column(name = "spec_json")
    private String specJson;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    public String getSpecJson() { return specJson; }
    public void setSpecJson(String specJson) { this.specJson = specJson; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
