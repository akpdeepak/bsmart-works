package com.bcits.works;

import com.bcits.works.shared.WorkspaceFilterActivator;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "work_items")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME,
        condition = "project_id IN (SELECT p.id FROM projects p WHERE p.workspace_id = :workspaceId)")
public class WorkItem {

    // ── Core (all types) ──────────────────────────────────────────────────────
    @Id private String id;
    /** Human-readable sequential ID, e.g. EP-0001, INC-0042. */
    private String autoId;
    private String title;
    private String status;
    /** Type key, e.g. EPIC, BUG, INCIDENT, HR_SERVICE_REQUEST. */
    private String type;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(name = "acceptance_criteria", columnDefinition = "TEXT")
    private String acceptanceCriteria;
    private String assigneeId;
    private LocalDate dueDate;
    private LocalDate startDate;
    private String projectId;
    private String createdBy;
    private OffsetDateTime createdAt;
    /** When the item entered its current status — drives the time-in-status lapse indicator (V74). */
    private OffsetDateTime statusChangedAt;
    private String sprintId;
    private Integer backlogOrder;
    private Integer storyPoints;
    private String priority;
    private String parentId;
    private OffsetDateTime deletedAt;
    private String deletedBy;
    private Integer version = 0;

    // ── Bug ───────────────────────────────────────────────────────────────────
    /** Who found / reported the defect (Bug) or raised the Incident. */
    private String reporterId;
    /** Critical / High / Medium / Low — shared by Bug and Incident. */
    private String severity;
    /** Development / Staging / UAT / Production. */
    private String environmentDetail;
    @Column(columnDefinition = "TEXT")
    private String stepsToReproduce;
    @Column(columnDefinition = "TEXT")
    private String expectedBehavior;
    @Column(columnDefinition = "TEXT")
    private String actualBehavior;
    private String affectedVersion;
    private String fixedInVersion;
    @Column(columnDefinition = "TEXT")
    private String fixDescription;
    /** Yes / No / Not Assessed. */
    private String regressionRisk;

    // ── Incident (Service) ────────────────────────────────────────────────────
    /** Organization-wide / Department / Team / Individual. */
    private String businessImpact;
    /** Immediate / High / Normal / Planned. */
    private String responseSpeed;
    /** Responding team name / group. */
    private String respondingTeam;
    /** Resolved / Workaround Applied / Duplicate / Not Reproducible / By Design / Cancelled. */
    private String resolutionType;
    @Column(columnDefinition = "TEXT")
    private String rootCause;
    @Column(columnDefinition = "TEXT")
    private String resolutionSummary;
    @Column(columnDefinition = "TEXT")
    private String closureNotes;
    @Column(columnDefinition = "TEXT")
    private String stakeholderUpdate;
    /** Affected system or configuration item. */
    private String affectedSystem;
    private String businessService;
    private OffsetDateTime slaTarget;
    private Boolean slaBreachFlag = false;
    /**
     * Sub-categorisation: Affected Area for Incident, HR Category / IT Category for Service Requests,
     * or any other type-specific category value.
     */
    private String itemCategory;
    /** Sub-category within itemCategory (e.g. specific HR sub-type). */
    private String subArea;

    // ── Service Requests (HR / IT) ────────────────────────────────────────────
    private String approverId;
    /** Employee / user this request is raised on behalf of. */
    private String requestedForId;
    private LocalDate neededByDate;
    /** Department (HR Service Request). */
    private String department;
    /** Affected system / application (IT Service Request). */
    // affectedSystem is reused above

    // ── RISK ──────────────────────────────────────────────────────────────────
    /** High / Medium / Low. */
    private String probability;
    /** High / Medium / Low — also used for Issue impact. */
    private String impactLevel;
    /** Auto-calculated = probability × impactLevel score (1–9). */
    private Short riskScore;
    @Column(columnDefinition = "TEXT")
    private String mitigationPlan;
    @Column(columnDefinition = "TEXT")
    private String contingencyPlan;

    // ── ISSUE ─────────────────────────────────────────────────────────────────
    // impactLevel, rootCause, resolutionSummary reused above

    // ── ASSUMPTION ────────────────────────────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String basisRationale;
    private LocalDate validationDate;
    @Column(columnDefinition = "TEXT")
    private String riskIfWrong;

    // ── DEPENDENCY ────────────────────────────────────────────────────────────
    /** Internal / External. */
    private String dependencyType;
    private String sourceItemId;
    private String targetItemId;
    private LocalDate expectedResolutionDate;
    @Column(columnDefinition = "TEXT")
    private String impactIfDelayed;

    // ── Service Request (shared) ──────────────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String businessJustification;

    @Transient private List<String> tags;
    @Transient private boolean starred = false;
    @Transient private Map<String, Object> customFields = new HashMap<>();
    /** Unified custom-field values (field_def id → value), attached to list responses for cards. */
    @Transient private Map<String, Object> fieldValues = new HashMap<>();

    // ── Getters / setters ─────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getAutoId() { return autoId; }
    public void setAutoId(String autoId) { this.autoId = autoId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getAcceptanceCriteria() { return acceptanceCriteria; }
    public void setAcceptanceCriteria(String v) { this.acceptanceCriteria = v; }
    public String getAssigneeId() { return assigneeId; }
    public void setAssigneeId(String v) { this.assigneeId = v; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate v) { this.dueDate = v; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate v) { this.startDate = v; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String v) { this.projectId = v; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String v) { this.createdBy = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime v) { this.createdAt = v; }
    public OffsetDateTime getStatusChangedAt() { return statusChangedAt; }
    public void setStatusChangedAt(OffsetDateTime v) { this.statusChangedAt = v; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> v) { this.tags = v; }
    public String getSprintId() { return sprintId; }
    public void setSprintId(String v) { this.sprintId = v; }
    public Integer getBacklogOrder() { return backlogOrder; }
    public void setBacklogOrder(Integer v) { this.backlogOrder = v; }
    public Integer getStoryPoints() { return storyPoints; }
    public void setStoryPoints(Integer v) { this.storyPoints = v; }
    public String getPriority() { return priority; }
    public void setPriority(String v) { this.priority = v; }
    public String getParentId() { return parentId; }
    public void setParentId(String v) { this.parentId = v; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime v) { this.deletedAt = v; }
    public String getDeletedBy() { return deletedBy; }
    public void setDeletedBy(String v) { this.deletedBy = v; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer v) { this.version = v; }
    public boolean isStarred() { return starred; }
    public void setStarred(boolean v) { this.starred = v; }

    public String getReporterId() { return reporterId; }
    public void setReporterId(String v) { this.reporterId = v; }
    public String getSeverity() { return severity; }
    public void setSeverity(String v) { this.severity = v; }
    public String getEnvironmentDetail() { return environmentDetail; }
    public void setEnvironmentDetail(String v) { this.environmentDetail = v; }
    public String getStepsToReproduce() { return stepsToReproduce; }
    public void setStepsToReproduce(String v) { this.stepsToReproduce = v; }
    public String getExpectedBehavior() { return expectedBehavior; }
    public void setExpectedBehavior(String v) { this.expectedBehavior = v; }
    public String getActualBehavior() { return actualBehavior; }
    public void setActualBehavior(String v) { this.actualBehavior = v; }
    public String getAffectedVersion() { return affectedVersion; }
    public void setAffectedVersion(String v) { this.affectedVersion = v; }
    public String getFixedInVersion() { return fixedInVersion; }
    public void setFixedInVersion(String v) { this.fixedInVersion = v; }
    public String getFixDescription() { return fixDescription; }
    public void setFixDescription(String v) { this.fixDescription = v; }
    public String getRegressionRisk() { return regressionRisk; }
    public void setRegressionRisk(String v) { this.regressionRisk = v; }

    public String getBusinessImpact() { return businessImpact; }
    public void setBusinessImpact(String v) { this.businessImpact = v; }
    public String getResponseSpeed() { return responseSpeed; }
    public void setResponseSpeed(String v) { this.responseSpeed = v; }
    public String getRespondingTeam() { return respondingTeam; }
    public void setRespondingTeam(String v) { this.respondingTeam = v; }
    public String getResolutionType() { return resolutionType; }
    public void setResolutionType(String v) { this.resolutionType = v; }
    public String getRootCause() { return rootCause; }
    public void setRootCause(String v) { this.rootCause = v; }
    public String getResolutionSummary() { return resolutionSummary; }
    public void setResolutionSummary(String v) { this.resolutionSummary = v; }
    public String getClosureNotes() { return closureNotes; }
    public void setClosureNotes(String v) { this.closureNotes = v; }
    public String getStakeholderUpdate() { return stakeholderUpdate; }
    public void setStakeholderUpdate(String v) { this.stakeholderUpdate = v; }
    public String getAffectedSystem() { return affectedSystem; }
    public void setAffectedSystem(String v) { this.affectedSystem = v; }
    public String getBusinessService() { return businessService; }
    public void setBusinessService(String v) { this.businessService = v; }
    public OffsetDateTime getSlaTarget() { return slaTarget; }
    public void setSlaTarget(OffsetDateTime v) { this.slaTarget = v; }
    public Boolean getSlaBreachFlag() { return slaBreachFlag; }
    public void setSlaBreachFlag(Boolean v) { this.slaBreachFlag = v; }
    public String getItemCategory() { return itemCategory; }
    public void setItemCategory(String v) { this.itemCategory = v; }
    public String getSubArea() { return subArea; }
    public void setSubArea(String v) { this.subArea = v; }

    public String getApproverId() { return approverId; }
    public void setApproverId(String v) { this.approverId = v; }
    public String getRequestedForId() { return requestedForId; }
    public void setRequestedForId(String v) { this.requestedForId = v; }
    public LocalDate getNeededByDate() { return neededByDate; }
    public void setNeededByDate(LocalDate v) { this.neededByDate = v; }
    public String getDepartment() { return department; }
    public void setDepartment(String v) { this.department = v; }

    public String getProbability() { return probability; }
    public void setProbability(String v) { this.probability = v; }
    public String getImpactLevel() { return impactLevel; }
    public void setImpactLevel(String v) { this.impactLevel = v; }
    public Short getRiskScore() { return riskScore; }
    public void setRiskScore(Short v) { this.riskScore = v; }
    public String getMitigationPlan() { return mitigationPlan; }
    public void setMitigationPlan(String v) { this.mitigationPlan = v; }
    public String getContingencyPlan() { return contingencyPlan; }
    public void setContingencyPlan(String v) { this.contingencyPlan = v; }

    public String getBasisRationale() { return basisRationale; }
    public void setBasisRationale(String v) { this.basisRationale = v; }
    public LocalDate getValidationDate() { return validationDate; }
    public void setValidationDate(LocalDate v) { this.validationDate = v; }
    public String getRiskIfWrong() { return riskIfWrong; }
    public void setRiskIfWrong(String v) { this.riskIfWrong = v; }

    public String getDependencyType() { return dependencyType; }
    public void setDependencyType(String v) { this.dependencyType = v; }
    public String getSourceItemId() { return sourceItemId; }
    public void setSourceItemId(String v) { this.sourceItemId = v; }
    public String getTargetItemId() { return targetItemId; }
    public void setTargetItemId(String v) { this.targetItemId = v; }
    public LocalDate getExpectedResolutionDate() { return expectedResolutionDate; }
    public void setExpectedResolutionDate(LocalDate v) { this.expectedResolutionDate = v; }
    public String getImpactIfDelayed() { return impactIfDelayed; }
    public void setImpactIfDelayed(String v) { this.impactIfDelayed = v; }

    public String getBusinessJustification() { return businessJustification; }
    public void setBusinessJustification(String v) { this.businessJustification = v; }

    // ── Product association (Incident / IT Service Request) ───────────────────
    /** Product this Incident or IT service request is raised against. */
    private String productId;
    public String getProductId() { return productId; }
    public void setProductId(String v) { this.productId = v; }

    public Map<String, Object> getCustomFields() { return customFields; }
    public void setCustomFields(Map<String, Object> v) { this.customFields = v != null ? v : new HashMap<>(); }
    public Map<String, Object> getFieldValues() { return fieldValues; }
    public void setFieldValues(Map<String, Object> v) { this.fieldValues = v != null ? v : new HashMap<>(); }
}
