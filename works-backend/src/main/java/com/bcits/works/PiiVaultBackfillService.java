package com.bcits.works;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * One-shot, idempotent backfill of the PII vault for existing rows (RB-40 §3, EPIC §3 / §11.d —
 * "guarded one-shot service job", Deepak-approved 2026-06-20). For each subject population it assigns
 * a subject token and dual-writes the PII into the vault for every row that does not yet have one.
 * Safe to re-run: already-tokenized rows are skipped (the {@code subject_token IS NULL} /
 * {@code customer_subject_token IS NULL} finders are the guards). Rows created after the migrations get
 * their token via {@code @PrePersist} + the per-write {@code *PiiService} sync, so they never need this
 * job.
 *
 * <p>Runs in the system/unfiltered scope so the workspace @Filter does not narrow the pending sets;
 * every vault write is still addressed by the row's explicit {@code workspaceId} (the tenant boundary).
 *
 * <p>Slice 1–2: internal users (name + email + blind index). Slice 3: customer-portal users
 * (email + display name + blind index), stakeholders (name/email/org/notes), and the two denormalised
 * free-text copies (chat customer_name, feedback customer).
 */
@Service
public class PiiVaultBackfillService {

    private static final Logger log = LoggerFactory.getLogger(PiiVaultBackfillService.class);

    private final UserRepository users;
    private final UserPiiService userPii;
    private final PiiVaultService vault;
    private final CustomerUserRepository customerUsers;
    private final CustomerUserPiiService customerUserPii;
    private final StakeholderRepository stakeholders;
    private final StakeholderPiiService stakeholderPii;
    private final ChatConversationRepository conversations;
    private final CustomerFeedbackRepository feedback;
    private final CustomerAttributionPiiService attributionPii;

    public PiiVaultBackfillService(UserRepository users, UserPiiService userPii, PiiVaultService vault,
                                   CustomerUserRepository customerUsers, CustomerUserPiiService customerUserPii,
                                   StakeholderRepository stakeholders, StakeholderPiiService stakeholderPii,
                                   ChatConversationRepository conversations, CustomerFeedbackRepository feedback,
                                   CustomerAttributionPiiService attributionPii) {
        this.users = users;
        this.userPii = userPii;
        this.vault = vault;
        this.customerUsers = customerUsers;
        this.customerUserPii = customerUserPii;
        this.stakeholders = stakeholders;
        this.stakeholderPii = stakeholderPii;
        this.conversations = conversations;
        this.feedback = feedback;
        this.attributionPii = attributionPii;
    }

    /** Backfill all internal users lacking a subject token. Returns how many were backfilled. Idempotent. */
    @Transactional
    public int backfillUserNames() {
        return TenantScope.callAsSystem(() -> {
            List<User> pending = users.findBySubjectTokenIsNull();
            int n = 0;
            for (User u : pending) {
                u.setSubjectToken(vault.mintSubjectToken());
                u.setEmailHmac(userPii.emailHmac(u.getEmail())); // blind index for tokenized login (RB-40 §3)
                users.save(u);
                userPii.syncIdentity(u); // vault name + email
                n++;
            }
            if (n > 0) {
                log.info("[PII-BACKFILL] Assigned subject tokens + vaulted identity for {} user(s)", n);
            }
            return n;
        });
    }

    /** Backfill customer-portal users lacking a subject token (email + display name + blind index). */
    @Transactional
    public int backfillCustomerUsers() {
        return TenantScope.callAsSystem(() -> {
            List<CustomerUser> pending = customerUsers.findBySubjectTokenIsNull();
            int n = 0;
            for (CustomerUser cu : pending) {
                cu.setSubjectToken(vault.mintSubjectToken());
                cu.setEmailHmac(customerUserPii.emailHmac(cu.getEmail())); // portal-login blind index (RB-40 §3)
                customerUsers.save(cu);
                customerUserPii.syncIdentity(cu); // vault email + display name
                n++;
            }
            if (n > 0) {
                log.info("[PII-BACKFILL] Assigned subject tokens + vaulted identity for {} customer user(s)", n);
            }
            return n;
        });
    }

    /** Backfill stakeholders lacking a subject token (name/email/org/notes). */
    @Transactional
    public int backfillStakeholders() {
        return TenantScope.callAsSystem(() -> {
            List<Stakeholder> pending = stakeholders.findBySubjectTokenIsNull();
            int n = 0;
            for (Stakeholder s : pending) {
                s.setSubjectToken(vault.mintSubjectToken());
                stakeholders.save(s);
                stakeholderPii.sync(s); // vault name + email + organization + notes
                n++;
            }
            if (n > 0) {
                log.info("[PII-BACKFILL] Assigned subject tokens + vaulted PII for {} stakeholder(s)", n);
            }
            return n;
        });
    }

    /** Backfill the denormalised chat customer_name copies into the vault. */
    @Transactional
    public int backfillChatCustomerNames() {
        return TenantScope.callAsSystem(() -> {
            List<ChatConversation> pending = conversations.findByCustomerSubjectTokenIsNullAndCustomerNameIsNotNull();
            int n = 0;
            for (ChatConversation c : pending) {
                c.setCustomerSubjectToken(
                        attributionPii.ensureVaulted(c.getWorkspaceId(), null, c.getCustomerName()));
                conversations.save(c);
                n++;
            }
            if (n > 0) {
                log.info("[PII-BACKFILL] Tokenized customer_name for {} chat conversation(s)", n);
            }
            return n;
        });
    }

    /** Backfill the denormalised feedback customer copies into the vault. */
    @Transactional
    public int backfillFeedbackCustomers() {
        return TenantScope.callAsSystem(() -> {
            List<CustomerFeedback> pending = feedback.findByCustomerSubjectTokenIsNullAndCustomerIsNotNull();
            int n = 0;
            for (CustomerFeedback f : pending) {
                f.setCustomerSubjectToken(
                        attributionPii.ensureVaulted(f.getWorkspaceId(), null, f.getCustomer()));
                feedback.save(f);
                n++;
            }
            if (n > 0) {
                log.info("[PII-BACKFILL] Tokenized customer attribution for {} feedback item(s)", n);
            }
            return n;
        });
    }

    /** Run every subject population's backfill. Returns the total rows touched. Idempotent. */
    public int backfillAll() {
        int total = backfillUserNames()
                + backfillCustomerUsers()
                + backfillStakeholders()
                + backfillChatCustomerNames()
                + backfillFeedbackCustomers();
        log.info("[PII-BACKFILL] Backfill complete — {} row(s) tokenized across all subject populations", total);
        return total;
    }
}
