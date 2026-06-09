// Hex values of design tokens — for the rare cases where code must pass a colour
// value to the API or another non-CSS context (state defaults, JSON payloads).
// Do NOT use these in className strings — use Tailwind token names (bg-brand-navy, etc.).
// Do NOT add hex values here that aren't in tailwind.config.js; add them there first.

export const BRAND_NAVY   = '#0B2F5C'; // brand-navy
export const BRAND_ORANGE = '#E94E1B'; // brand-orange
export const NEUTRAL_600  = '#5A6B7E'; // neutral-600  (default colour for new entity types)
