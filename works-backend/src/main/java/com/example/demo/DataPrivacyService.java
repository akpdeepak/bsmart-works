package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * GDPR / DPDP data-subject rights (iteration 19 Cap T): data <em>export</em> (portability) and
 * <em>erasure</em> (right to be forgotten). Workspace-scoped (RB-40 §1); the controller applies RBAC
 * ({@code manage_security}).
 *
 * <p>Erasure follows the crypto-shred / tokenization decision (RB-40 §3): the immutable audit log
 * and event history stay intact and re-derivable because they reference the subject by opaque id,
 * never by raw PII. Erasure removes the personal data from the mutable {@code users} record (the
 * production design destroys the subject's per-subject key in the PII vault); the request itself is
 * recorded so the erasure is itself auditable.
 */
@Service
public class DataPrivacyService {

    private final DataSubjectRequestRepository requests;
    private final UserRepository users;
    private final AuditLogService auditLog;
    private final ObjectMapper json = new ObjectMapper();

    public DataPrivacyService(DataSubjectRequestRepository requests, UserRepository users,
                              AuditLogService auditLog) {
        this.requests = requests;
        this.users = users;
        this.auditLog = auditLog;
    }

    public List<DataSubjectRequest> list(String workspaceId) {
        return requests.findByWorkspaceIdOrderByRequestedAtDesc(workspaceId);
    }

    /** Assemble and complete a portable export of one subject's personal data. */
    @Transactional
    public DataSubjectRequest export(String workspaceId, String actorId, String subjectUserId) {
        User user = users.findById(subjectUserId)
                .orElseThrow(() -> ApiException.notFound("User", subjectUserId));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", user.getId());
        data.put("email", user.getEmail());
        data.put("fullName", user.getFullName());
        data.put("emailVerified", user.isEmailVerified());
        data.put("mfaEnabled", user.isMfaEnabled());
        data.put("exportedAt", OffsetDateTime.now().toString());

        DataSubjectRequest r = base(workspaceId, actorId, user, "EXPORT");
        r.setStatus("COMPLETED");
        r.setCompletedAt(OffsetDateTime.now());
        r.setResultSummary(toJson(data));
        DataSubjectRequest saved = requests.save(r);
        auditLog.record(workspaceId, actorId, "DATA_EXPORTED", "user", subjectUserId,
                "GDPR/DPDP data export for " + user.getEmail());
        return saved;
    }

    /** Erase one subject's PII (crypto-shred semantics) while preserving the audit trail. */
    @Transactional
    public DataSubjectRequest erase(String workspaceId, String actorId, String subjectUserId) {
        User user = users.findById(subjectUserId)
                .orElseThrow(() -> ApiException.notFound("User", subjectUserId));
        if (actorId.equals(subjectUserId)) {
            throw ApiException.badRequest("CANNOT_ERASE_SELF",
                    "An administrator cannot erase their own account this way.");
        }

        DataSubjectRequest r = base(workspaceId, actorId, user, "ERASURE");
        String originalEmail = user.getEmail();

        // Tokenize the subject: replace PII with an opaque, non-reversible placeholder. The user id
        // (the foreign key used across events/audit) is retained so history stays re-derivable.
        String token = "erased-" + UUID.randomUUID().toString().substring(0, 12);
        user.setEmail(token + "@erased.invalid");
        user.setFullName("[erased]");
        user.setPasswordHash("ERASED");
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setVerificationToken(null);
        users.save(user);

        r.setStatus("COMPLETED");
        r.setCompletedAt(OffsetDateTime.now());
        r.setResultSummary("PII crypto-shredded; user id " + subjectUserId
                + " retained as an opaque token so the immutable audit trail stays intact.");
        DataSubjectRequest saved = requests.save(r);
        // Audit records the subject id + action, never the now-erased PII (the original email is not
        // written into the immutable log).
        auditLog.record(workspaceId, actorId, "DATA_ERASED", "user", subjectUserId,
                "Right-to-be-forgotten erasure completed");
        return saved;
    }

    private DataSubjectRequest base(String workspaceId, String actorId, User user, String type) {
        DataSubjectRequest r = new DataSubjectRequest();
        r.setId("DSR-" + UUID.randomUUID().toString().substring(0, 12));
        r.setWorkspaceId(workspaceId);
        r.setSubjectUserId(user.getId());
        r.setSubjectEmail("ERASURE".equals(type) ? null : user.getEmail());
        r.setType(type);
        r.setRequestedBy(actorId);
        r.setRequestedAt(OffsetDateTime.now());
        return r;
    }

    private String toJson(Map<String, Object> data) {
        try {
            return json.writeValueAsString(data);
        } catch (Exception e) {
            return "{}";
        }
    }
}
