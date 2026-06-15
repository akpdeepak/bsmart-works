// Colour-blind-safe chart palette (WI-22 — WCAG 2.2 AA, RB-30 §6).
//
// Uses hue + luminance contrast so series remain distinguishable across:
//   • Deuteranopia / Protanopia (red-green): avoids relying on red vs green.
//   • Tritanopia (blue-yellow): uses multiple blue luminances + warm tones.
//
// Semantic-success (green) and semantic-danger (red) are NOT in this palette —
// they are for single-point status indicators (pass/fail), never for multi-series
// categorical data where hue is the only distinguisher.
//
// Used as `text-*` (SVG stroke via currentColor) or `bg-*` (bar fills).
export const CHART_PALETTE = [
  'text-brand-navy',       // dark blue      — primary series
  'text-brand-amber',      // amber / gold   — warm contrast to blue
  'text-brand-navy-tint',  // medium blue    — same hue, different luminance
  'text-brand-orange',     // orange-red     — warm, not pure red
  'text-neutral-600',      // dark grey      — luminance contrast fallback
  'text-semantic-warning', // dark amber/gold — 6th series
];

export const CHART_PALETTE_BG = [
  'bg-brand-navy',
  'bg-brand-amber',
  'bg-brand-navy-tint',
  'bg-brand-orange',
  'bg-neutral-600',
  'bg-semantic-warning',
];

export const colorFor = (i) => CHART_PALETTE[i % CHART_PALETTE.length];
export const bgColorFor = (i) => CHART_PALETTE_BG[i % CHART_PALETTE_BG.length];
