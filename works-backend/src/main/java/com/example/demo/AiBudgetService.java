package com.example.demo;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure budget math for the AI Control Plane (iteration 10, Cap Z; RB-40 §2). Given a monthly cap and
 * the amount spent so far, it derives the budget <b>state</b> that drives cost discipline:
 * <ul>
 *   <li>&lt; 80% consumed → {@link State#NORMAL} — use the capable model tier;</li>
 *   <li>80%–&lt;100% consumed → {@link State#DEGRADED} — auto-degrade to the cheap tier (Haiku);</li>
 *   <li>&ge; 100% consumed → {@link State#DISABLED} — auto-disable AI; serve deterministic fallbacks.</li>
 * </ul>
 *
 * <p>No I/O — every boundary is unit-testable in isolation (mirrors {@link SlaCalculationService}).
 * A non-positive cap means "no budget configured", which is treated as {@link State#NORMAL} (the cap
 * is simply not enforced) so the plane works before an admin sets a budget.
 */
@Service
public class AiBudgetService {

    /** Budget state — both the gate (can AI run?) and the tier selector. */
    public enum State { NORMAL, DEGRADED, DISABLED }

    /** The two thresholds, as integer percents, kept here so the UI and tests share one source. */
    public static final int DEGRADE_AT_PERCENT = 80;
    public static final int DISABLE_AT_PERCENT = 100;

    /**
     * Consumed percentage of the cap, floored, never negative. A non-positive cap reads as 0%
     * (no budget enforced).
     */
    public int consumedPercent(BigDecimal cap, BigDecimal spent) {
        if (cap == null || cap.signum() <= 0) {
            return 0;
        }
        BigDecimal s = spent == null ? BigDecimal.ZERO : spent.max(BigDecimal.ZERO);
        return s.multiply(BigDecimal.valueOf(100))
                .divide(cap, 0, RoundingMode.FLOOR)
                .intValue();
    }

    /** The budget state for a cap + spend pair (RB-40 §2 thresholds). */
    public State state(BigDecimal cap, BigDecimal spent) {
        // No cap configured → budget is not enforced; behave as NORMAL.
        if (cap == null || cap.signum() <= 0) {
            return State.NORMAL;
        }
        int pct = consumedPercent(cap, spent);
        if (pct >= DISABLE_AT_PERCENT) {
            return State.DISABLED;
        }
        if (pct >= DEGRADE_AT_PERCENT) {
            return State.DEGRADED;
        }
        return State.NORMAL;
    }

    /**
     * The model tier this state should use. NORMAL uses the workspace's configured capable tier;
     * DEGRADED forces the cheap tier; DISABLED never reaches a model (the caller serves a fallback),
     * so this returns the deterministic marker for completeness.
     */
    public String tierFor(State state, String capableTier) {
        return switch (state) {
            case NORMAL -> capableTier == null || capableTier.isBlank() ? "SONNET" : capableTier;
            case DEGRADED -> "HAIKU";
            case DISABLED -> "DETERMINISTIC";
        };
    }
}
