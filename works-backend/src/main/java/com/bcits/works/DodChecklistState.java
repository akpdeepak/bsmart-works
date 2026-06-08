package com.bcits.works;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/** Per-work-item completion state of a Definition-of-Done checklist item (Cap U). */
@Entity
@Table(name = "dod_checklist_states")
public class DodChecklistState {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "work_item_id") private String workItemId;
    @Column(name = "checklist_item_id") private Long checklistItemId;
    private boolean checked;
    @Column(name = "checked_by") private String checkedBy;
    @Column(name = "checked_at") private OffsetDateTime checkedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getWorkItemId() { return workItemId; }
    public void setWorkItemId(String workItemId) { this.workItemId = workItemId; }
    public Long getChecklistItemId() { return checklistItemId; }
    public void setChecklistItemId(Long checklistItemId) { this.checklistItemId = checklistItemId; }
    public boolean isChecked() { return checked; }
    public void setChecked(boolean checked) { this.checked = checked; }
    public String getCheckedBy() { return checkedBy; }
    public void setCheckedBy(String checkedBy) { this.checkedBy = checkedBy; }
    public OffsetDateTime getCheckedAt() { return checkedAt; }
    public void setCheckedAt(OffsetDateTime checkedAt) { this.checkedAt = checkedAt; }
}
