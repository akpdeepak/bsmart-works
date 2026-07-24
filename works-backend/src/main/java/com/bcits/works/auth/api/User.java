package com.bcits.works.auth.api;

import com.bcits.works.shared.SupportedLocales;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Column;

@Entity
@Table(name = "users")
public class User {

    /** Mint the opaque PII-vault subject token on first persist if absent (RB-40 §3). Format matches
     *  {@link PiiVaultService#mintSubjectToken()} so backfilled and freshly-created users are uniform. */
    @PrePersist
    void assignSubjectToken() {
        if (subjectToken == null || subjectToken.isBlank()) {
            subjectToken = "subj-" + java.util.UUID.randomUUID();
        }
    }
    @Id
    private String id;
    private String email;
    private String fullName;
    private String passwordHash;

    // Opaque per-subject token for the PII vault (RB-40 §3, EPIC-P1-pii-vault). Minted once, stable
    // for the subject's lifetime, and used as the subject_id in pii_vault_entries / subject_data_keys.
    // NOT derived from email/name. Nullable during the EXPAND/backfill window; once the vault is the
    // source of truth, email/full_name resolve through this token. See PiiVaultService.
    @Column(name = "subject_token")
    private String subjectToken;

    // Blind index of the (normalized) email — deterministic keyed HMAC for O(1) login lookups once the
    // raw email is tokenized into the vault (RB-40 §3). Populated alongside subject_token. See BlindIndexService.
    @Column(name = "email_hmac")
    private String emailHmac;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "verification_token")
    private String verificationToken;

    public String getId()                          { return id; }
    public void   setId(String id)                 { this.id = id; }

    public String getEmail()                       { return email; }
    public void   setEmail(String email)           { this.email = email; }

    public String getFullName()                    { return fullName; }
    public void   setFullName(String fullName)     { this.fullName = fullName; }

    public String getPasswordHash()                { return passwordHash; }
    public void   setPasswordHash(String h)        { this.passwordHash = h; }

    public String getSubjectToken()                { return subjectToken; }
    public void   setSubjectToken(String t)        { this.subjectToken = t; }

    public String getEmailHmac()                   { return emailHmac; }
    public void   setEmailHmac(String h)           { this.emailHmac = h; }

    public boolean isEmailVerified()               { return emailVerified; }
    public void    setEmailVerified(boolean v)     { this.emailVerified = v; }

    public String getVerificationToken()           { return verificationToken; }
    public void   setVerificationToken(String t)   { this.verificationToken = t; }

    @Column(name = "mfa_enabled", nullable = false)
    private boolean mfaEnabled = false;

    @Column(name = "mfa_secret")
    private String mfaSecret;

    // Iteration 20 (Cap A — localization): the user's preferred UI language as a BCP-47 code
    // (en, hi, es, fr, de, pt, ja, zh, ar, ko). Defaults to English; drives the frontend i18n layer.
    @Column(name = "locale", nullable = false)
    private String locale = SupportedLocales.DEFAULT;

    public boolean isMfaEnabled()               { return mfaEnabled; }
    public void    setMfaEnabled(boolean v)     { this.mfaEnabled = v; }

    public String getMfaSecret()                { return mfaSecret; }
    public void   setMfaSecret(String s)        { this.mfaSecret = s; }

    public String getLocale()                   { return locale == null ? SupportedLocales.DEFAULT : locale; }
    public void   setLocale(String locale)      { this.locale = locale; }
}
