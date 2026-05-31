-- ============================================================
-- V15: Seed Brand & Identity Specs — bSmart Works
-- Spec source: 04-brand-assets/Works-Brand-and-Identity.docx
--              + 4 source logo SVGs (icon, primary, mono, reverse)
--
-- Maps the brand/design system spec to work items in their
-- correct iterations. Foundational brand work shipped in
-- iteration 1; advanced theming/white-label maps to iter 17;
-- motion + PWA polish to iter 18; Figma + OG to iter 20.
-- ============================================================


-- ============================================================
-- BRAND CAPABILITY EPIC
-- (cross-cutting design system — complements WRK-E15 Design System & Brand)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, definition_of_done, project_id, created_by, story_points, priority, created_at) VALUES

('WRK-BRAND', 'Brand & Product Identity — bSmart Works design system', 'In Progress', 'Epic',
 'SPEC: 04-brand-assets/Works-Brand-and-Identity.docx
PURPOSE: The single source of truth for naming, logo, colour, typography, UX principles, component inventory, motion, iconography, design tokens, and white-label scope. Every UI iteration re-reads section 12 (AI build instructions) before starting.
SCOPE: Foundational tokens + logo + typography shipped in iteration 1 (WRK-E15). White-label theming engine maps to iteration 17 (Cap R). Motion + PWA icons map to iteration 18 (Cap S). Figma library + OG cards map to iteration 20.
BRAND PILLARS: bSmart family fit · "Where work gets done" · Operational not playful · Navy primary, orange as cayenne pepper · Inter + JetBrains Mono · Lucide icons · WCAG AA.',
 '- Product name locked: "bSmart Works" (full) / "Works" (short); lowercase b always
- Logo system: primary, icon, mono, reverse — all 4 variants in src/assets/brand (public/)
- Canonical design tokens applied in tailwind.config.js (colours, neutrals, semantic, status, radius, shadow, motion)
- Inter (UI) + JetBrains Mono (code/IDs) loaded; full type scale (display→caption→mono)
- Locked component inventory (section 6.2) — no ad-hoc components
- 5 UX principles enforced: operational not playful, predictability over delight, config without code, defaults that work, honest visibility
- White-label theming engine (iteration 17): per-workspace logo + primary colour with contrast validation
- Lucide icon set with locked concept→icon mapping (section 8.2)
- No hex literals / no arbitrary spacing / no competitor names in product copy',
 '- Tailwind config matches canonical spec section 10.2 exactly (zero drift)
- All 4 logo SVGs present and referenced (never recreated inline)
- Contrast verified: navy-on-white 11.4:1, neutral-600 5.1:1, orange large-text only
- No emoji, no confetti, no bouncy springs in product UI',
 'PROJ-WORKS', 'USR-DEV1', 21, 'HIGH', NOW() - INTERVAL '30 days')

ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  acceptance_criteria = EXCLUDED.acceptance_criteria,
  definition_of_done = EXCLUDED.definition_of_done;


-- ============================================================
-- ITERATION 1 — Brand foundation (mostly DONE — shipped with WRK-E15)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-BR01', 'Product naming & wordmark — bSmart Works / Works', 'Done', 'Story',
 'Section 1. Lock the product name and wordmark usage. Full form "bSmart Works" for marketing/contracts/portal; short form "Works" for nav/tabs/dock/mobile. The "b" is always lowercase, even at sentence start.',
 '- Full form "bSmart Works" used in: login screen, marketing, contracts, customer portal
- Short form "Works" used in: product nav, browser tab title, mobile app name, conversational copy
- Wordmark: "bSmart" light (300) grey + "Works" bold (700) navy — signals Works is product, bSmart is family
- "b" always lowercase — find/replace check before merge
- No mashups ever: never "BCITS Tool", "Works Jira", "BCITS Tracker"
- Tagline on login + empty state: "Where work gets done."',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 2, 'HIGH', NOW() - INTERVAL '26 days'),

('WRK-BR02', 'Logo system — primary, icon, mono, reverse variants', 'Done', 'Story',
 'Section 2 + 13. Four logo lockups: primary (horizontal, glyph + two-weight wordmark), icon (standalone glyph for favicon/PWA/dock), mono (single-colour navy), reverse (white-on-navy for dark backgrounds/login). Glyph = three rising bars + orange chevron = "work moving forward".',
 '- logo-primary.svg: horizontal lockup, bSmart light grey + Works bold navy
- logo-icon.svg: standalone glyph, used as favicon/PWA/dock/avatar
- logo-mono.svg: single-colour navy for print/watermark
- logo-reverse.svg: white-on-navy for login screen + dark hero
- All SVGs live in public/ (src/assets/brand) — never recreated inline (Logo component reads them)
- Usage rules enforced: min clear space = half glyph height; min size glyph 24px, lockup 120px wide; no shadows/bevels/3D; no navy-on-navy; b always lowercase',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 3, 'HIGH', NOW() - INTERVAL '25 days'),

('WRK-BR03', 'Colour system — canonical design tokens in Tailwind', 'Done', 'Story',
 'Section 3 + 10.2. Navy is dominant; orange is the "cayenne pepper" accent (at most one prominent orange element per screen); neutrals do 80% of the work. Brand, neutral, semantic, and status-category colours all locked as tokens. No hex literals in components.',
 '- Brand: navy #0B2F5C, navy-tint #1E4D8C, orange #E94E1B, amber #F39200
- Neutral scale: 900 #0F1A2A, 700 #2A3B52, 600 #5A6B7E, 400 #9AA8BC, 300 #C9D2DF, 200 #E5E9EF, 100 #F2F4F8, 50 #F7F9FC
- Semantic + surface pairs: success #0E7C5E/#E8F3EE, warning #B97A00/#FFF4E5, danger #C0392B/#FDE7E7, info #1E4D8C/#E5EDF7
- Status-category (boards/badges): todo #5A6B7E, in-progress #1E4D8C, done #0E7C5E
- WCAG AA verified: navy/white 11.4:1, neutral-600/white 5.1:1, orange large-text only (never body)
- Lint: no bg-[#hex] literals in components — token names only',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 3, 'HIGH', NOW() - INTERVAL '26 days'),

('WRK-BR04', 'Typography — Inter + JetBrains Mono, full type scale', 'Done', 'Story',
 'Section 4. Inter for all UI (Devanagari support for Hindi); JetBrains Mono for code/IDs (WEB-1234)/shortcuts. Type scale display→caption locked as tokens. Tabular-nums for number columns; -0.5% letter-spacing on h1/h2.',
 '- Inter loaded with weights 300/400/500/600/700; JetBrains Mono 500
- Type scale tokens: display 40/48 700, h1 30/38 700, h2 24/32 600, h3 20/28 600, h4 16/24 600, body-lg 16/24 400, body 14/20 400, body-sm 13/18 400, caption 12/16 400, mono 13/20 500
- Fallback stack: Inter, Segoe UI, -apple-system, Roboto, Helvetica Neue, Arial
- tabular-nums on every numeric column; ellipsis after 1 line for list titles
- No inline font-sizes — text-body/text-h2 tokens only',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 2, 'MEDIUM', NOW() - INTERVAL '25 days'),

('WRK-BR05', 'Favicon + PWA manifest icons from logo-icon', 'Done', 'Task',
 'Section 13 next-steps. Generate favicon (SVG + multi-size .ico 16/32/48), PWA manifest icons (192/256/384/512), Apple touch icons (152/167/180), Android adaptive layers — all derived from logo-icon.svg.',
 '- favicon.svg + favicon.ico (16/32/48) wired in index.html
- manifest.json with icons at 192/256/384/512, theme-color #0B2F5C, name "bSmart Works", short_name "Works"
- Apple touch icons 152/167/180
- All derived from logo-icon.svg — single source glyph',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 2, 'MEDIUM', NOW() - INTERVAL '24 days'),

('WRK-BR06', 'Works component wrappers around shadcn/ui primitives', 'In Progress', 'Story',
 'Section 6.2 + 12.2. Locked component inventory — AI may not invent new component types, only compose from these. Use shadcn/ui as the primitive layer wrapped in Works components that inject design tokens. Feature code imports from @/components/works/*, never @/components/ui/* directly.',
 '- Locked inventory: Button (primary/secondary/ghost/danger/icon-only), Input, Select, Picker, DatePicker, Combobox, Toggle, Checkbox/Radio, Card, Table, Tabs, Dialog, Drawer, Toast, Banner, Badge/Chip, Avatar, Menu, Tooltip, Popover, EmptyState, Skeleton, ProgressBar, Stepper
- Each Works wrapper injects token-based styling; no raw shadcn imports in feature code
- New component types require explicit human approval (PR review gate)
- Button + StatusBadge + Logo wrappers already exist; remaining inventory to be built out',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 8, 'HIGH', NOW() - INTERVAL '24 days'),

('WRK-BR07', 'Spacing, radius & elevation scale tokens', 'Done', 'Task',
 'Sections 6.3–6.5. All spacing on a 4px scale (no arbitrary values). Border radius sm 4 / md 8 / lg 12 / xl 22 / full 9999. Navy-tinted shadows (not generic grey) so elevation feels intentional.',
 '- Spacing: 4px multiples only (space-0..space-20) — lint bans p-[15px]
- Radius: sm 4px, md 8px (default), lg 12px, xl 22px (app icon tile), full 9999px
- Shadow tokens navy-tinted: sm 0 1px 2px rgba(11,47,92,.06), md 0 2px 8px rgba(11,47,92,.08), lg 0 8px 24px rgba(11,47,92,.12), xl 0 16px 48px rgba(11,47,92,.16)
- Forbidden: rgba(0,0,0,...) shadows — must use navy-tinted tokens',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 2, 'MEDIUM', NOW() - INTERVAL '25 days'),

('WRK-BR08', 'Lucide iconography with locked concept→icon mapping', 'Done', 'Task',
 'Section 8. Lucide icons only — 24px default (1.5px stroke), 20px inline, 16px dense; colour inherits via currentColor. Locked concept→icon map prevents the same concept getting different icons across screens.',
 '- Locked map: Epic=layers, Story=book-open, Task=check-square, Bug=bug, Sub-task=git-branch, Incident=alert-triangle, Service Request=headphones, Sprint=timer, Backlog=list, Board=kanban, Compliance=shield-check, KPI=trending-up, SLA=gauge, Worklog=clock, Automation=zap, Webhook=webhook, Permission=lock
- Icon-only controls always have aria-label
- Stroke 1.5px at 24px — never changed; colour via currentColor
- Enforced in code review (section 12.3)',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 2, 'LOW', NOW() - INTERVAL '24 days'),

('WRK-BR09', 'UX principles — operational, predictable, honest visibility', 'In Progress', 'Story',
 'Section 5. Five principles that settle every UX dispute: (1) operational not playful — info density is a feature, no emoji/confetti; (2) predictability over delight — same action same place, consistent shortcuts, 2-click max; (3) configuration without code; (4) defaults that work for 80%; (5) honest visibility — UI makes the data model honest (velocity scope markers, "Private to you", SLA calendar shown).',
 '- Empty states are direct: "No work items yet. Create one." — never "Looks like things are quiet ✨"
- Keyboard shortcuts consistent: c=create, /=search, g-p=projects regardless of context
- Destructive actions confirm; non-destructive get 10s undo toast
- Navigation max 2 clicks from any start
- Velocity charts show scope-change markers, not a single number
- Manager views say "Aggregated at team level. Individual data is not available here."
- SLA timers show the calendar in use ("Business hours: Mon-Fri 9-18 IST")',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 3, 'HIGH', NOW() - INTERVAL '23 days')

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ITERATION 18 — Motion system + PWA polish (Cap S)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-BR10', 'Motion & interaction system — timing, easing, loading states', 'Todo', 'Story',
 'Section 9. Motion communicates state change — snappy and operational, not bouncy. Timing tokens (instant/fast/base/slow/slower) + easing (ease-out-quint default; ease-spring reserved for the 1%). Loading: <200ms no spinner; 200-1000ms skeleton; >1000ms skeleton + labelled progress. Optimistic UI by default with revert-on-failure toast.',
 '- Timing tokens: instant 0ms, fast 150ms, base 220ms, slow 320ms, slower 480ms
- Easing: ease-out-quint cubic-bezier(0.22,1,0.36,1) default; ease-spring cubic-bezier(0.34,1.56,0.64,1) sparingly
- No bouncy springs on routine actions — bounce reserved for sprint completion celebration (max once/sprint)
- Loading: <200ms show result directly; 200-1000ms skeleton matching content shape; >1000ms skeleton + "Loading work items..." label; indeterminate = navy linear bar at top
- Optimistic UI: drag-drop/inline-edit/transition/comment reflect immediately, revert with reason toast "Couldn''t save: permission denied."',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 5, 'MEDIUM', NOW()),

('WRK-BR11', 'Full PWA manifest + Apple touch + Android adaptive icons', 'Todo', 'Task',
 'Section 13 next-steps (mobile iteration). Complete the icon generation pipeline for the iteration 18 mobile/PWA work: all manifest sizes, Apple touch icons, Android adaptive foreground/background layers, Open Graph card template (1200x630) with logo + tagline.',
 '- PWA manifest icons: 192, 256, 384, 512 px (maskable + any)
- Apple touch icons: 152, 167, 180 px
- Android adaptive icon: foreground (glyph) + background (navy) layers
- Open Graph card 1200x630 with logo-primary + "Where work gets done."
- All generated from logo-icon.svg — single source',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 3, 'LOW', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ITERATION 17 — White-label theming engine (Cap R)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-BR12', 'White-label theming engine — per-workspace logo + colour with contrast validation', 'Todo', 'Story',
 'Section 11. Enterprise-tier white-label. Each utility customer can apply their own logo and primary colour. The theming engine validates contrast (rejects WCAG-failing colours), derives tints/shades algorithmically via HSL, keeps semantic colours + neutrals at brand defaults (health states must read universally), and updates favicon + logo dynamically.',
 '- White-labelable: workspace logo, favicon, primary colour (one — tints derived), custom domain, email-from, email templates, full service portal branding
- NOT white-labelable: OS dock/springboard app icon (stays bSmart Works), in-product help articles, "Powered by bSmart Works" portal footnote (removable only at Enterprise+ with separate contract)
- Theming engine on custom colour upload: (1) validate contrast — reject colours failing WCAG AA against white; (2) derive tints/shades via HSL adjustment; (3) keep semantic success/warning/danger at brand defaults; (4) keep neutrals at defaults; (5) update favicon + logo dynamically
GIVEN a workspace admin uploads primary colour #6B2FA0 (passes contrast)
THEN the UI re-themes: primary buttons + sidebar accent use the colour and derived tints; success/warning/danger stay at brand defaults; favicon recolours',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 8, 'HIGH', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- ITERATION 20 — Figma library + brand collateral
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-BR13', 'Figma component library + brand collateral (OG, email signature)', 'Todo', 'Task',
 'Section 13 next-steps (final polish). Create the shared Figma file with the full component library so designers and AI agents iterate from one source. Plus brand collateral: Open Graph card template, BCITS email-signature template representing the product.',
 '- Figma file with locked component inventory (section 6.2) using design tokens — shared source for designers + AI
- Open Graph card template 1200x630 (logo-primary + tagline placeholder)
- Email signature template for BCITS team members
- Trademark clearance documented for "bSmart Works" + "Works" (classes 9 software, 42 SaaS) in India/US/EU',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 5, 'LOW', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SPR-FIXES — token drift remediation (current sprint, applied now)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-BR14', 'Fix design-token drift in tailwind.config.js vs canonical spec', 'Done', 'Bug',
 'Section 10.2. The frontend tailwind.config.js had drifted from the canonical spec: brand.teal instead of brand.amber; neutral.700 wrong (#3C4858 vs #2A3B52); missing neutral.300; semantic surfaces wrong (generic Tailwind hexes instead of brand-harmonised); missing status-category colours; radius.xl 16px instead of 22px; no navy-tinted shadow tokens; no motion tokens. This bug brings the config back to the canonical single-source-of-truth.',
 '- brand.amber #F39200 added; brand.teal removed (was non-spec)
- neutral.300 #C9D2DF added; neutral.700 corrected to #2A3B52
- semantic surfaces corrected: success #E8F3EE, warning #FFF4E5, danger #FDE7E7, info #E5EDF7
- status colours added: todo #5A6B7E, in-progress #1E4D8C, done #0E7C5E
- radius.xl corrected to 22px
- navy-tinted boxShadow tokens (sm/md/lg/xl) added
- motion timing + easing tokens added
GIVEN a developer uses bg-brand-amber or shadow-md
THEN it resolves to the canonical spec value, not a drifted one',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 3, 'HIGH', NOW()),

('WRK-BR15', 'Add missing logo variants — logo-mono.svg, logo-reverse.svg', 'Done', 'Task',
 'Section 2.4 + 13. The frontend had only logo-icon.svg and logo-primary.svg. The mono (print/watermark) and reverse (dark-background, used by login screen) variants from the source brand assets were missing. Added both to public/ so the Logo component can switch variants and the login screen can use reverse.',
 '- logo-mono.svg added to public/ (single-colour navy lockup)
- logo-reverse.svg added to public/ (white-on-navy lockup for dark backgrounds)
- Logo component supports variant="mono" and variant="reverse"
- Login screen (dark hero) uses logo-reverse',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-FIXES', 2, 'MEDIUM', NOW())

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- LINKS — brand stories to brand epic + capability epics
-- ============================================================
INSERT INTO work_item_links (source_id, target_id, link_type, created_at) VALUES
('WRK-BR01', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR02', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR03', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR04', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR05', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR06', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR07', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR08', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR09', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR10', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR11', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR12', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR13', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR14', 'WRK-BRAND', 'PARENT', NOW()),
('WRK-BR15', 'WRK-BRAND', 'PARENT', NOW()),
-- cross-links to existing epics
('WRK-BRAND', 'WRK-E15', 'RELATES_TO', NOW()),   -- Design System & Brand (iter 1)
('WRK-BR12',  'WRK-CR',  'RELATES_TO', NOW()),   -- White-label → Universal Customization
('WRK-BR10',  'WRK-CS',  'RELATES_TO', NOW()),   -- Motion → Mobile/Performance
('WRK-BR02',  'WRK-CA',  'RELATES_TO', NOW())    -- Logo/branding → Identity & Workspace
ON CONFLICT DO NOTHING;


-- ============================================================
-- TAGS
-- ============================================================
INSERT INTO tags (work_item_id, tag) VALUES
('WRK-BRAND', 'brand'), ('WRK-BRAND', 'design-system'),
('WRK-BR01', 'brand'), ('WRK-BR01', 'naming'),
('WRK-BR02', 'brand'), ('WRK-BR02', 'logo'),
('WRK-BR03', 'brand'), ('WRK-BR03', 'design-tokens'), ('WRK-BR03', 'color'),
('WRK-BR04', 'brand'), ('WRK-BR04', 'typography'),
('WRK-BR05', 'brand'), ('WRK-BR05', 'pwa'),
('WRK-BR06', 'design-system'), ('WRK-BR06', 'components'), ('WRK-BR06', 'shadcn'),
('WRK-BR07', 'design-tokens'), ('WRK-BR07', 'spacing'),
('WRK-BR08', 'design-system'), ('WRK-BR08', 'icons'), ('WRK-BR08', 'lucide'),
('WRK-BR09', 'ux'), ('WRK-BR09', 'principles'),
('WRK-BR10', 'motion'), ('WRK-BR10', 'ux'),
('WRK-BR11', 'pwa'), ('WRK-BR11', 'mobile'),
('WRK-BR12', 'white-label'), ('WRK-BR12', 'theming'), ('WRK-BR12', 'customization'),
('WRK-BR13', 'figma'), ('WRK-BR13', 'collateral'),
('WRK-BR14', 'design-tokens'), ('WRK-BR14', 'tech-debt'), ('WRK-BR14', 'dogfood'),
('WRK-BR15', 'logo'), ('WRK-BR15', 'brand')
ON CONFLICT DO NOTHING;


-- ============================================================
-- SUMMARY
-- ============================================================
-- V15 seeds the Brand & Identity spec (doc 04) as work items:
--   1 brand epic (WRK-BRAND)
--   9 iteration-1 foundation stories/tasks (naming, logo, colour, type,
--     favicon, components, spacing, icons, UX principles) — mostly Done
--   1 motion system story (iter 18)
--   1 PWA icon pipeline task (iter 18)
--   1 white-label theming engine story (iter 17)
--   1 Figma + collateral task (iter 20)
--   2 SPR-FIXES items (token drift fix + missing logo variants) — Done
--
-- Companion code changes in this commit:
--   - tailwind.config.js brought to canonical spec (WRK-BR14)
--   - logo-mono.svg + logo-reverse.svg added to public/ (WRK-BR15)
-- ============================================================
