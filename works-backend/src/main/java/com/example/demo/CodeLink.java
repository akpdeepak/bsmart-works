package com.example.demo;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/** A commit / branch / PR reference attached to a work item (Cap U — code context, IDE/CLI
 *  inline commit linking). Workspace-scoped (RB-40 §1). */
@Entity
@Table(name = "code_links")
public class CodeLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "workspace_id") private String workspaceId;
    @Column(name = "work_item_id") private String workItemId;
    private String kind;   // COMMIT | BRANCH | PR
    private String ref;
    @Column(columnDefinition = "TEXT") private String message;
    @Column(name = "author_id") private String authorId;
    private String url;
    @Column(name = "files_touched", columnDefinition = "TEXT") private String filesTouched;
    @Column(name = "created_at") private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getWorkItemId() { return workItemId; }
    public void setWorkItemId(String workItemId) { this.workItemId = workItemId; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getRef() { return ref; }
    public void setRef(String ref) { this.ref = ref; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getFilesTouched() { return filesTouched; }
    public void setFilesTouched(String filesTouched) { this.filesTouched = filesTouched; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
