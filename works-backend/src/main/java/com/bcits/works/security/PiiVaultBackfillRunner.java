package com.bcits.works.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import com.bcits.works.PiiVaultBackfillService;

/**
 * Runs the one-shot PII-vault backfill ({@link PiiVaultBackfillService}) at startup when
 * {@code pii.vault.backfill-on-start=true} (env {@code PII_VAULT_BACKFILL_ON_START}). Default off, so
 * normal boots — and every test context — do nothing. The operator flips it on for a single rollout
 * boot, then off again; the job is idempotent so an accidental second run is harmless.
 */
@Component
public class PiiVaultBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PiiVaultBackfillRunner.class);

    private final PiiVaultBackfillService backfill;
    private final boolean runOnStart;

    public PiiVaultBackfillRunner(PiiVaultBackfillService backfill,
                                  @Value("${pii.vault.backfill-on-start:false}") boolean runOnStart) {
        this.backfill = backfill;
        this.runOnStart = runOnStart;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!runOnStart) {
            return;
        }
        log.info("[PII-BACKFILL] pii.vault.backfill-on-start=true — running one-shot PII backfill (all subjects)");
        int n = backfill.backfillAll();
        log.info("[PII-BACKFILL] Completed: {} row(s) backfilled into the PII vault across all subjects", n);
    }
}
