// Hex values of design tokens — for the rare cases where code must pass a colour
// value to the API or another non-CSS context (state defaults, JSON payloads).
// Do NOT use these in className strings — use Tailwind token names (bg-brand-navy, etc.).
// Do NOT add hex values here that aren't in tailwind.config.js; add them there first.

// ── Brand ────────────────────────────────────────────────────────────────────
export const BRAND_NAVY   = '#0B2F5C'; // brand-navy
export const BRAND_NAVY_TINT = '#1E4D8C'; // brand-navy-tint
export const BRAND_ORANGE = '#E94E1B'; // brand-orange
export const BRAND_AMBER  = '#F39200'; // brand-amber

// ── Neutral palette ──────────────────────────────────────────────────────────
export const NEUTRAL_900 = '#0F1A2A';
export const NEUTRAL_800 = '#1A2638';
export const NEUTRAL_700 = '#2A3B52';
export const NEUTRAL_600 = '#5A6B7E'; // default colour for new entity types
export const NEUTRAL_500 = '#7A8AA0';
export const NEUTRAL_400 = '#9AA8BC';
export const NEUTRAL_300 = '#C9D2DF';
export const NEUTRAL_200 = '#E5E9EF';
export const NEUTRAL_100 = '#F2F4F8';
export const NEUTRAL_50  = '#F7F9FC';

// ── Semantic status ──────────────────────────────────────────────────────────
export const SEMANTIC_SUCCESS         = '#0E7C5E';
export const SEMANTIC_SUCCESS_SURFACE = '#E8F3EE';
export const SEMANTIC_WARNING         = '#B97A00';
export const SEMANTIC_WARNING_SURFACE = '#FFF4E5';
export const SEMANTIC_DANGER          = '#C0392B';
export const SEMANTIC_DANGER_SURFACE  = '#FDE7E7';
export const SEMANTIC_INFO            = '#1E4D8C';
export const SEMANTIC_INFO_SURFACE    = '#E5EDF7';

// ── Work-item status category ────────────────────────────────────────────────
export const STATUS_TODO        = '#5A6B7E';
export const STATUS_IN_PROGRESS = '#1E4D8C';
export const STATUS_DONE        = '#0E7C5E';

// ── Elevation (shadow) ───────────────────────────────────────────────────────
// CSS shadows use the brand-navy base for tint consistency (see tailwind.config.js boxShadow).
export const SHADOW_SM = '0 1px 2px rgba(11, 47, 92, 0.06)';
export const SHADOW_MD = '0 2px 8px rgba(11, 47, 92, 0.08)';
export const SHADOW_LG = '0 8px 24px rgba(11, 47, 92, 0.12)';
export const SHADOW_XL = '0 16px 48px rgba(11, 47, 92, 0.16)';

// ── Focus ring ───────────────────────────────────────────────────────────────
// Standardized focus-visible ring. Use these values for programmatic style application;
// in CSS/Tailwind prefer `focus-visible:ring-2 focus-visible:ring-brand-navy-tint/40`.
export const FOCUS_RING_WIDTH  = '2px';
export const FOCUS_RING_OFFSET = '2px';
export const FOCUS_RING_COLOR  = 'rgba(30, 77, 140, 0.4)'; // brand-navy-tint at 40%

