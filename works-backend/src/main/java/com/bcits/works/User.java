package com.bcits.works;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;

@Entity
@Table(name = "users")
public class User {
    @Id
    private String id;
    private String email;
    private String fullName;
    private String passwordHash;

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
