package com.bcits.works.security;

import com.bcits.works.auth.TokenRevocationService;
import com.bcits.works.auth.User;
import com.bcits.works.auth.UserPiiService;
import com.bcits.works.auth.UserRepository;
import com.bcits.works.shared.ApiException;
import com.bcits.works.shared.SecurityAuditLogService;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * GDPR / DPDP data-subject rights (iteration 19 Cap T): data <em>export</em> (portability) and
 * <em>erasure</em> (right to be forgotten). Workspace-scoped (RB-40 §1); the controller applies RBAC
 * ({@code manage_security}).
 *
 * <p>Erasure is real crypto-shredding (RB-40 §3): {@link UserPiiService#forgetIdentity} destroys the
 * subject's per-subject data key and purges the vault rows, so the personal data becomes
 * cryptographically unrecoverable even from backups. The legacy plaintext columns are also cleared
 * while they remain authoritative (the CONTRACT migration that drops them is deferred). The surrogate
 * {@code users.id} + subject token survive so the immutable audit/event history stays re-derivable.
 *
 * <p>Neither export nor erasure ever writes raw PII into a persisted column or the immutable audit
 * chain: the export payload is delivered transiently in the response and the audit/DSR records
 * reference the subject by surrogate id only.
 */
@Service
public class DataPrivacyService {

    private final DataSubjectRequestRepository requests;
    private final UserRepository users;
    private final SecurityAuditLogService auditLog;
    private final UserPiiService userPii;
    private final TokenRevocationService tokenRevocation;
    private final ObjectMapper json = new ObjectMapper();

    public DataPrivacyService(DataSubjectRequestRepository requests, UserRepository users,
                              SecurityAuditLogService auditLog, UserPiiService userPii,
                              TokenRevocationService tokenRevocation) {
        this.requests = requests;
        this.users = users;
        this.auditLog = auditLog;
        this.userPii = userPii;
        this.tokenRevocation = tokenRevocation;
    }

    public List<DataSubjectRequest> list(String workspaceId) {
        return requests.findByWorkspaceIdOrderByRequestedAtDesc(workspaceId);
    }

    /** Assemble and complete a portable export of one subject's personal data. The payload is
     *  delivered in the response but never persisted (RB-40 §3). */
    @Transactional
    public DataSubjectRequest export(String workspaceId, String actorId, String subjectUserId) {
        User user = users.findById(subjectUserId)
                .orElseThrow(() -> ApiException.notFound("User", subjectUserId));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", user.getId());
        data.put("email", user.getEmail());
        data.put("fullName", userPii.displayName(user));
        data.put("emailVerified", user.isEmailVerified());
        data.put("mfaEnabled", user.isMfaEnabled());
        data.put("exportedAt", OffsetDateTime.now().toString());

        DataSubjectRequest r = base(workspaceId, actorId, user, "EXPORT");
        r.setStatus("COMPLETED");
        r.setCompletedAt(OffsetDateTime.now());
        r.setResultSummary(metadataSummary(data.keySet()));   // field NAMES + counts only — never values
        DataSubjectRequest saved = requests.save(r);
        saved.setExportData(data);                            // transient — returned to the requester, not stored
        // Audit references the subject by surrogate id only — never the raw email (RB-40 §3 rule 1).
        auditLog.record(workspaceId, actorId, "DATA_EXPORTED", "user", subjectUserId,
                "GDPR/DPDP data export delivered for subject " + subjectUserId);
        return saved;
    }

    /** Erase one subject's PII by crypto-shred while preserving the audit trail. */
    @Transactional
    public DataSubjectRequest erase(String workspaceId, String actorId, String subjectUserId) {
        User user = users.findById(subjectUserId)
                .orElseThrow(() -> ApiException.notFound("User", subjectUserId));
        if (actorId.equals(subjectUserId)) {
            throw ApiException.badRequest("CANNOT_ERASE_SELF",
                    "An administrator cannot erase their own account this way.");
        }

        DataSubjectRequest r = base(workspaceId, actorId, user, "ERASURE");

        // Crypto-shred: destroy the subject's per-subject DEK + purge the vault rows. Any ciphertext
        // that lingers (including in backups) becomes permanently undecryptable (RB-40 §3 rule 2).
        userPii.forgetIdentity(user);

        // Clear the legacy plaintext columns too — they remain authoritative during the dual-write
        // window (until the CONTRACT migration drops them). The surrogate id is retained so the
        // immutable audit/event history stays re-derivable (rule 3).
        String token = "erased-" + UUID.randomUUID().toString().substring(0, 12);
        user.setEmail(token + "@erased.invalid");
        user.setFullName("[erased]");
        user.setPasswordHash("ERASED");
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setVerificationToken(null);
        users.save(user);
        // Token-version revocation (W1 rate-limit/JWT PR1): an erased subject's existing JWTs must stop
        // working immediately, not linger for up to the 7-day token lifetime.
        tokenRevocation.revokeUserTokens(subjectUserId);

        r.setStatus("COMPLETED");
        r.setCompletedAt(OffsetDateTime.now());
        r.setResultSummary("PII crypto-shredded (per-subject key destroyed + vault rows purged); user id "
                + subjectUserId + " retained as an opaque token so the immutable audit trail stays intact.");
        DataSubjectRequest saved = requests.save(r);
        // Audit records the subject id + action, never the now-erased PII.
        auditLog.record(workspaceId, actorId, "DATA_ERASED", "user", subjectUserId,
                "Right-to-be-forgotten erasure completed (crypto-shred)");
        return saved;
    }

    private DataSubjectRequest base(String workspaceId, String actorId, User user, String type) {
        DataSubjectRequest r = new DataSubjectRequest();
        r.setId("DSR-" + UUID.randomUUID().toString().substring(0, 12));
        r.setWorkspaceId(workspaceId);
        r.setSubjectUserId(user.getId());
        // subject_email is intentionally NOT persisted — the DSR references the subject by surrogate
        // id only, so an export/erasure record never holds raw PII that could survive a shred (RB-40 §3).
        r.setType(type);
        r.setRequestedBy(actorId);
        r.setRequestedAt(OffsetDateTime.now());
        return r;
    }

    /** A non-PII summary of an export: which field names were delivered, and how many — never values. */
    private String metadataSummary(Set<String> fieldNames) {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("exportedFieldCount", fieldNames.size());
        meta.put("exportedFields", new ArrayList<>(fieldNames));
        meta.put("note", "Personal data delivered to the requester in the response; not persisted (RB-40 §3).");
        return toJson(meta);
    }

    private String toJson(Map<String, Object> data) {
        try {
            return json.writeValueAsString(data);
        } catch (Exception e) {
            return "{}";
        }
    }
}
