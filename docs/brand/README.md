# bSmart Works — Brand Assets

Source logo files and how to use them. The full brand rationale is in
[`brand-and-identity.md`](brand-and-identity.md); the enforced design tokens are in
[`/CLAUDE.md` §4](../../CLAUDE.md).

## The mark

Every logo is built from one idea: **three rising bars** (growth/rhythm) + a **forward
chevron** (delivery/progress), inside a rounded-square app tile. It reads as momentum toward
a goal — "where work gets done."

Construction grid (lockup tile = 112×112, radius 22; icon tile = 160×160, radius 32):
- Bars rise left→right: widths 14 (icon 20), heights 26 → 40 → 56 (icon 38 → 58 → 80).
- Chevron is a right-pointing triangle at the top-right, overlapping the tallest bar.
- Wordmark: **bSmart** in Inter Light (300), **Works** in Inter Bold (700).

## Variants

| File | viewBox | Use on | Tile | Chevron | Wordmark |
|------|---------|--------|------|---------|----------|
| [`source-logos/logo-primary.svg`](source-logos/logo-primary.svg) | 640×160 | light backgrounds | navy→blue gradient | orange→amber gradient | bSmart `#5A6B7E` · Works `#0B2F5C` |
| [`source-logos/logo-reverse.svg`](source-logos/logo-reverse.svg) | 640×160 | navy / dark backgrounds | translucent white (8%) | flat orange `#E94E1B` | bSmart `#B8C5D6` · Works `#FFFFFF` |
| [`source-logos/logo-mono.svg`](source-logos/logo-mono.svg) | 640×160 | single-colour / print / fax | flat navy `#0B2F5C` | white (same colour) | both `#0B2F5C` |
| [`source-logos/logo-icon.svg`](source-logos/logo-icon.svg) | 160×160 | favicon, avatar, app icon (≥24px) | navy→blue gradient | orange→amber gradient | — (mark only) |

## Colours used in the logos

| Hex | Token (CLAUDE.md §4) | Role in the logo |
|-----|----------------------|------------------|
| `#0B2F5C` | `brand-navy` | tile, "Works" wordmark |
| `#1E4D8C` | `brand-navy-tint` | tile gradient end |
| `#E94E1B` | `brand-orange` | chevron (start of gradient; flat on reverse) |
| `#F39200` | `brand-amber` ⚠️ | chevron gradient end |
| `#5A6B7E` | `neutral-600` | "bSmart" wordmark on primary |
| `#B8C5D6` | (light tint) | "bSmart" wordmark on reverse |

> ✅ **Token resolved:** the logos use an orange→amber gradient (`#E94E1B → #F39200`). The
> implemented `works-frontend/tailwind.config.js` on `main` now ships **`brand-amber #F39200`**
> (the earlier `brand-teal` token was migrated). So `brand-amber` is safe to use in code.
> Note: the live UI uses flat token colours, not gradients — gradients appear only in the logo SVGs.

## Where the runtime copies live

These `source-logos/` files are the **design source**. The app serves its own copies from
[`works-frontend/public/`](../../works-frontend/public/) (`logo-*.svg`), rendered via the
`<Logo>` component (`works-frontend/src/components/works/logo.jsx`). If you update a logo,
update both the source here and the runtime copy in `public/`.

## Usage rules

- Use the variant that matches the background (primary on light, reverse on dark, mono for one-colour).
- Never recolour, stretch, rotate, or rebuild the logo in code — reference the SVG.
- Keep clear space around the lockup ≥ the height of one bar.
- Minimum icon size 24px; below that, legibility of the bars breaks down.
- Orange is an accent — it appears only in the chevron, never enlarged or used as a fill elsewhere.
