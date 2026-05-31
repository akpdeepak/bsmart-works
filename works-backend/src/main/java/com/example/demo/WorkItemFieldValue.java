package com.example.demo;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "work_item_field_value")
public class WorkItemFieldValue {
    @Id private String id;
    private String workItemId;
    private String fieldDefId;
    @Column(columnDefinition = "TEXT") private String valueText;
    private BigDecimal valueNumber;
    @Column(columnDefinition = "jsonb") private String valueJson;
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
    public String getValueJson() { return valueJson; }
    public void setValueJson(String valueJson) { this.valueJson = valueJson; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
