package com.bcits.works.shared;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

@Component
public class ProductionConfigurationGuard implements ApplicationRunner {

    static final String DEV_JWT_SECRET = "dev-only-change-me-" + "bSmartWorksSecretKey2026";
    private static final Set<String> PROTECTED_PROFILES =
            Set.of("prod", "production", "stage", "staging");

    private final Environment environment;
    private final String jwtSecret;
    private final boolean exposeDevVerificationToken;

    public ProductionConfigurationGuard(Environment environment,
                                        @Value("${app.jwt.secret:}") String jwtSecret,
                                        @Value("${app.auth.expose-dev-verification-token:false}")
                                        boolean exposeDevVerificationToken) {
        this.environment = environment;
        this.jwtSecret = jwtSecret;
        this.exposeDevVerificationToken = exposeDevVerificationToken;
    }

    @Override
    public void run(ApplicationArguments args) {
        validate(environment.getActiveProfiles(), jwtSecret, exposeDevVerificationToken);
    }

    static void validate(String[] activeProfiles, String jwtSecret, boolean exposeDevVerificationToken) {
        if (!isProtectedProfile(activeProfiles)) {
            return;
        }
        if (isUnsafeJwtSecret(jwtSecret)) {
            throw new IllegalStateException(
                    "Production/staging requires BSMART_JWT_SECRET with a non-dev value of at least 32 bytes.");
        }
        if (exposeDevVerificationToken) {
            throw new IllegalStateException(
                    "Production/staging must not expose development email verification tokens.");
        }
    }

    static boolean isProtectedProfile(String[] activeProfiles) {
        return Arrays.stream(activeProfiles == null ? new String[0] : activeProfiles)
                .map(profile -> profile.toLowerCase(Locale.ROOT))
                .anyMatch(PROTECTED_PROFILES::contains);
    }

    static boolean isUnsafeJwtSecret(String jwtSecret) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            return true;
        }
        String normalized = jwtSecret.toLowerCase(Locale.ROOT);
        return jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32
                || DEV_JWT_SECRET.equals(jwtSecret)
                || normalized.contains("dev-only")
                || normalized.contains("change-me")
                || normalized.contains("changeme");
    }
}
