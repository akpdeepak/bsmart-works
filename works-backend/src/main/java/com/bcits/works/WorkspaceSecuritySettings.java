package com.bcits.works;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Filter;

/** Per-workspace security posture: data residency region, BYOK (a key *reference*, never key
 *  material), encryption algorithm, audit retention, anomaly toggle (iteration 19 Cap T,
 *  RB-40 §4). One row per workspace; absent = platform defaults. Workspace-scoped (RB-40 §1). */
@Entity
@Table(name = "workspace_security_settings")
@Filter(name = WorkspaceFilterActivator.FILTER_NAME, condition = "workspace_id = :workspaceId")
public class WorkspaceSecuritySettings {

    @Id
    @Column(name = "workspace_id")
    private String workspaceId;

    @Column(name = "data_residency_region")
    private String dataResidencyRegion = "IN";

    @Column(name = "byok_enabled")
    private boolean byokEnabled = false;

    @Column(name = "byok_provider")
    private String byokProvider;

    @Column(name = "byok_key_ref")
    private String byokKeyRef;

    @Column(name = "encryption_algorithm")
    private String encryptionAlgorithm = "AES-256-GCM";

    @Column(name = "audit_retention_days")
    private int auditRetentionDays = 2555;

    @Column(name = "anomaly_detection_enabled")
    private boolean anomalyDetectionEnabled = true;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getDataResidencyRegion() { return dataResidencyRegion; }
    public void setDataResidencyRegion(String dataResidencyRegion) { this.dataResidencyRegion = dataResidencyRegion; }
    public boolean isByokEnabled() { return byokEnabled; }
    public void setByokEnabled(boolean byokEnabled) { this.byokEnabled = byokEnabled; }
    public String getByokProvider() { return byokProvider; }
    public void setByokProvider(String byokProvider) { this.byokProvider = byokProvider; }
    public String getByokKeyRef() { return byokKeyRef; }
    public void setByokKeyRef(String byokKeyRef) { this.byokKeyRef = byokKeyRef; }
    public String getEncryptionAlgorithm() { return encryptionAlgorithm; }
    public void setEncryptionAlgorithm(String encryptionAlgorithm) { this.encryptionAlgorithm = encryptionAlgorithm; }
    public int getAuditRetentionDays() { return auditRetentionDays; }
    public void setAuditRetentionDays(int auditRetentionDays) { this.auditRetentionDays = auditRetentionDays; }
    public boolean isAnomalyDetectionEnabled() { return anomalyDetectionEnabled; }
    public void setAnomalyDetectionEnabled(boolean anomalyDetectionEnabled) { this.anomalyDetectionEnabled = anomalyDetectionEnabled; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
