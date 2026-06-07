package com.example.demo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * A user's notification preferences (iteration 18, Cap S — push notifications). One row per user,
 * extending the V6 table with per-event-type toggles, a quiet-hours window, a snooze deadline, and
 * the "P0 overrides quiet hours" on-call safety valve. Per-user, not workspace-scoped: a person's
 * delivery preferences follow them across every workspace they belong to.
 *
 * <p>The delivery decision (whether a given event should actually push) is pure logic and lives in
 * {@link PushPreferenceService#shouldDeliver}, so it is unit-testable without a database.
 */
@Entity
@Table(name = "notification_preferences")
public class NotificationPreference {

    @Id
    @Column(name = "user_id")
    private String userId;

    @Column(name = "notify_assign")
    private boolean notifyAssign = true;

    @Column(name = "notify_comment")
    private boolean notifyComment = true;

    @Column(name = "notify_mention")
    private boolean notifyMention = true;

    @Column(name = "email_digest")
    private boolean emailDigest = false;

    @Column(name = "notify_status_change")
    private boolean notifyStatusChange = true;

    @Column(name = "notify_sla_breach")
    private boolean notifySlaBreach = true;

    @Column(name = "notify_automation")
    private boolean notifyAutomation = false;

    @Column(name = "push_enabled")
    private boolean pushEnabled = false;

    @Column(name = "quiet_hours_enabled")
    private boolean quietHoursEnabled = false;

    @Column(name = "quiet_hours_start")
    private int quietHoursStart = 22;

    @Column(name = "quiet_hours_end")
    private int quietHoursEnd = 7;

    @Column(name = "snooze_until")
    private OffsetDateTime snoozeUntil;

    @Column(name = "p0_override_quiet")
    private boolean p0OverrideQuiet = true;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public boolean isNotifyAssign() { return notifyAssign; }
    public void setNotifyAssign(boolean v) { this.notifyAssign = v; }
    public boolean isNotifyComment() { return notifyComment; }
    public void setNotifyComment(boolean v) { this.notifyComment = v; }
    public boolean isNotifyMention() { return notifyMention; }
    public void setNotifyMention(boolean v) { this.notifyMention = v; }
    public boolean isEmailDigest() { return emailDigest; }
    public void setEmailDigest(boolean v) { this.emailDigest = v; }
    public boolean isNotifyStatusChange() { return notifyStatusChange; }
    public void setNotifyStatusChange(boolean v) { this.notifyStatusChange = v; }
    public boolean isNotifySlaBreach() { return notifySlaBreach; }
    public void setNotifySlaBreach(boolean v) { this.notifySlaBreach = v; }
    public boolean isNotifyAutomation() { return notifyAutomation; }
    public void setNotifyAutomation(boolean v) { this.notifyAutomation = v; }
    public boolean isPushEnabled() { return pushEnabled; }
    public void setPushEnabled(boolean v) { this.pushEnabled = v; }
    public boolean isQuietHoursEnabled() { return quietHoursEnabled; }
    public void setQuietHoursEnabled(boolean v) { this.quietHoursEnabled = v; }
    public int getQuietHoursStart() { return quietHoursStart; }
    public void setQuietHoursStart(int v) { this.quietHoursStart = v; }
    public int getQuietHoursEnd() { return quietHoursEnd; }
    public void setQuietHoursEnd(int v) { this.quietHoursEnd = v; }
    public OffsetDateTime getSnoozeUntil() { return snoozeUntil; }
    public void setSnoozeUntil(OffsetDateTime v) { this.snoozeUntil = v; }
    public boolean isP0OverrideQuiet() { return p0OverrideQuiet; }
    public void setP0OverrideQuiet(boolean v) { this.p0OverrideQuiet = v; }
}
