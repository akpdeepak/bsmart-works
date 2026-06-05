package com.example.demo;

import org.springframework.stereotype.Service;

/**
 * Pure resolver for the AI scope hierarchy (iteration 10, Cap Z; RB-40 §2). AI can be toggled at four
 * levels — <b>workspace → capability → user → in-context</b> — and the <b>most restrictive enabled
 * scope wins</b>: off at any level means off for the call. Off at the workspace is off everywhere
 * downstream, regardless of capability or user preference.
 *
 * <p>No I/O and no Spring collaborators, so the full truth table is unit-testable in isolation
 * (mirrors {@link SlaCalculationService}'s pure core). The controller/service boundary loads the
 * stored policy, toggle and preference rows and passes them here; this class only decides.
 */
@Service
public class AiPolicyResolver {

    /** Workspace AI mode — the top of the hierarchy. */
    public enum Mode { ENABLED, DISABLED, OPT_IN }

    /** A tri-state override: ON / OFF force a value; INHERIT defers to the level above. */
    public enum Toggle { ON, OFF, INHERIT }

    /**
     * Decide whether AI is effectively enabled for one call.
     *
     * @param mode          the workspace policy mode (null reads as the conservative {@code OPT_IN})
     * @param capability    the per-capability override (null reads as {@code INHERIT})
     * @param user          the per-user preference (null reads as {@code INHERIT})
     * @param contextOptOut an in-context opt-out for this single call (the 4th, most local scope)
     * @return true only if AI is enabled at every level that has an opinion (most-restrictive-wins)
     */
    public boolean isEnabled(Mode mode, Toggle capability, Toggle user, boolean contextOptOut) {
        Mode m = mode == null ? Mode.OPT_IN : mode;
        Toggle cap = capability == null ? Toggle.INHERIT : capability;
        Toggle usr = user == null ? Toggle.INHERIT : user;

        // 4th scope (in-context): a local opt-out always wins — most restrictive.
        if (contextOptOut) {
            return false;
        }
        // 1st scope (workspace): DISABLED is off everywhere downstream, full stop.
        if (m == Mode.DISABLED) {
            return false;
        }
        // 2nd scope (capability): an explicit OFF beats anything below; OFF anywhere wins.
        if (cap == Toggle.OFF) {
            return false;
        }
        // 3rd scope (user): an explicit OFF turns AI off for this user.
        if (usr == Toggle.OFF) {
            return false;
        }
        // Nothing turned it off. Now decide the default for the levels that said INHERIT:
        //   ENABLED  → on by default (an INHERIT user inherits "on").
        //   OPT_IN   → off until the user explicitly opts in (user must be ON).
        if (m == Mode.ENABLED) {
            return true;
        }
        // OPT_IN: requires an explicit user opt-in (ON). Capability ON alone does not opt a user in.
        return usr == Toggle.ON;
    }

    /** Parse a stored mode string (case-insensitive) to the enum; unknown/null → {@code OPT_IN}. */
    public Mode parseMode(String mode) {
        if (mode == null) {
            return Mode.OPT_IN;
        }
        try {
            return Mode.valueOf(mode.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Mode.OPT_IN;
        }
    }

    /** Map a nullable stored boolean (the override columns) to a tri-state toggle. */
    public Toggle toggleOf(Boolean enabled) {
        if (enabled == null) {
            return Toggle.INHERIT;
        }
        return enabled ? Toggle.ON : Toggle.OFF;
    }
}
