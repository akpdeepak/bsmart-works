package com.bcits.works;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "work_item_field_value")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "work_item_id IN (SELECT wi.id FROM work_items wi JOIN projects p ON wi.project_id = p.id WHERE p.workspace_id = "
                + ":workspaceId)")
public class WorkItemFieldValue {
    @Id private String id;
    private String workItemId;
    private String fieldDefId;
    @Column(columnDefinition = "TEXT") private String valueText;
    private BigDecimal valueNumber;
    private LocalDate valueDate;
    @ColumnTransformer(write = "?::jsonb")
    @Column(columnDefinition = "jsonb") private String valueJson;
    // Opaque vault token for a PII-flagged custom field's text value (RB-40 §3, Slice 4b): the value is
    // tokenized into the per-subject crypto-shred vault under this per-value token, resolved at render
    // and "[erased]" after a shred. Null for non-PII fields. Legacy value_text stays till CONTRACT.
    @Column(name = "subject_token") private String subjectToken;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWorkItemId() { return workItemId; }
    public void setWorkItemId(String workItemId) { this.workItemId = workItemId; }
    public String getFieldDefId() { return fieldDefId; }
    public void setFieldDefId(String fieldDefId) { this.fieldDefId = fieldDefId; }
    public String getValueText() { return valueText; }
    public void setValueText(String valueText) { this.valueText = valueText; }
    public BigDecimal getValueNumber() { return valueNumber; }
    public void setValueNumber(BigDecimal valueNumber) { this.valueNumber = valueNumber; }
    public LocalDate getValueDate() { return valueDate; }
    public void setValueDate(LocalDate valueDate) { this.valueDate = valueDate; }
    public String getValueJson() { return valueJson; }
    public void setValueJson(String valueJson) { this.valueJson = valueJson; }
    public String getSubjectToken() { return subjectToken; }
    public void setSubjectToken(String subjectToken) { this.subjectToken = subjectToken; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
