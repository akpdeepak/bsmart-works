package com.bcits.works.shared;

import java.util.Set;

/**
 * Single source of truth for the locale codes bSmart Works ships (iteration 20, Cap A —
 * localization). Consolidated here (ONE Source) so the backend keeps exactly one copy instead of a
 * hand-typed list in {@code UserController} and a separately hard-coded default in the {@code User}
 * entity.
 *
 * <p>The frontend mirror is {@code works-frontend/src/lib/locales.js} (LOCALES); the two lists must
 * stay in lock-step. A future step exposes this set over an endpoint so the frontend consumes it
 * rather than re-declaring it (see docs/analysis/ONE-source.md).
 */
public final class SupportedLocales {

    private SupportedLocales() { }

    /** Default UI language for a new user or an unset preference. */
    public static final String DEFAULT = "en";

    /** The shipped UI languages. Order is irrelevant; membership is what is validated. */
    public static final Set<String> CODES =
        Set.of("en", "hi", "es", "fr", "de", "pt", "ja", "zh", "ar", "ko");
}
