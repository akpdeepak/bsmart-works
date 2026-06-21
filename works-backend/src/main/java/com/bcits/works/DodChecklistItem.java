package com.bcits.works;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One line in a Definition-of-Done checklist (Cap U). Required items gate resolution. */
@Entity
@Table(name = "dod_checklist_items")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "checklist_id IN (SELECT c.id FROM dod_checklists c WHERE c.workspace_id = :workspaceId)")
public class DodChecklistItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "checklist_id") private String checklistId;
    private String label;
    private Integer position;
    private boolean required = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getChecklistId() { return checklistId; }
    public void setChecklistId(String checklistId) { this.checklistId = checklistId; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }
}
