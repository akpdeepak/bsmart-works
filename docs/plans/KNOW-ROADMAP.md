# Know Studio — Premium Improvement Roadmap

> **Owner:** Deepak Pandey · **Created:** 2026-06-16 · **Status:** Planning — execute part-wise  
> **Source:** Session `96b76e2d` (Know Studio end-to-end improvement plan)  
> **Next migration at time of writing:** V91 (confirm in `CLAUDE.md §6` before each session)

---

## How to use this document

1. Pick the next unexecuted WI by phase order: **P0 → P1 → P2 → Unique**.
2. Each WI block is **self-contained** — everything a cold session needs to execute it.
3. Before coding any WI: read `CLAUDE.md` (orchestrator) + `rulebooks/05-TASK-EXECUTION.md` (RB-05).
4. Confirm the active Flyway migration number from `CLAUDE.md §6` — do **not** use the number written here; it may have advanced.
5. After merge, mark the WI `[x] MERGED PR #NNN · date` below its heading and commit this file.

---

## Phase summary

| Phase | WIs | Trigger |
|-------|-----|---------|
| **P0 — Critical** | WI-KR-001 to WI-KR-007 (scattered across layers) | Ship first; these are the gaps that make Know feel unfinished |
| **P1 — High** | WI-KR-008 to ~WI-KR-055 | Core completeness vs Notion / Confluence |
| **P2 — Premium** | WI-KR-056 to ~WI-KR-088 | Best-in-class surface |
| **Unique** | WI-KR-089 to WI-KR-096 | bSmart-native differentiators |

---

## Execution status tracker

| WI | Title | Phase | Status |
|----|-------|-------|--------|
| KR-001 | Inline formatting marks | P0 | ✅ done · 2026-06-16 |
| KR-002 | Floating selection toolbar | P0 | ✅ done · 2026-06-16 |
| KR-003 | Undo / redo | P0 | ✅ done · 2026-06-16 |
| KR-004 | Syntax highlighting in code blocks | P0 | ✅ done · 2026-06-16 |
| KR-005 | Text color & highlight | P1 | ✅ done · 2026-06-16 |
| KR-006 | Find & Replace | P1 | ✅ done · 2026-06-16 |
| KR-007 | Block indent / nesting | P2 | ⬜ open |
| KR-008 | Footnotes | P2 | ⬜ open |
| KR-009 | Cover image / gradient | P0 | ✅ done · 2026-06-16 |
| KR-010 | Article icon / emoji | P0 | ✅ done · 2026-06-16 |
| KR-011 | Article properties panel | P1 | ✅ done · 2026-06-16 |
| KR-012 | Focus / distraction-free mode | P1 | ✅ done · 2026-06-16 |
| KR-013 | Enhanced status bar | P1 | ✅ done · 2026-06-16 |
| KR-014 | In-article TOC pane | P2 | ⬜ open |
| KR-015 | Print / PDF / DOCX / Markdown export | P2 | ⬜ open |
| KR-016 | Article reading view | P2 | ⬜ open |
| KR-017 | Status badge + transition popover | P0 | ✅ done · 2026-06-16 |
| KR-018 | Reviewer assignment | P1 | ✅ done · 2026-06-16 |
| KR-019 | Approval requirements | P1 | ✅ done · 2026-06-16 |
| KR-020 | Scheduled publish | P1 | ✅ done · 2026-06-16 |
| KR-021 | Article expiry / review-by date | P1 | ✅ done · 2026-06-16 |
| KR-022 | Duplicate / clone article | P1 | ✅ done · 2026-06-16 |
| KR-023 | Suggestions mode (track changes) | P2 | ⬜ open |
| KR-024 | Content health score | P2 | ⬜ open |
| KR-025 | Block-level comment threads | P0 | ✅ done · 2026-06-16 |
| KR-026 | Text-selection inline comments | P0 | ✅ done · 2026-06-16 |
| KR-027 | Threaded replies | P0 | ✅ done · 2026-06-16 |
| KR-028 | @mention in comments & blocks | P0 | ✅ done · 2026-06-16 |
| KR-029 | Reactions on comments & articles | P1 | ✅ done · 2026-06-16 |
| KR-030 | Comment digest notifications | P1 | ⬜ open |
| KR-031 | Comment draft auto-save | P2 | ⬜ open |
| KR-032 | External reviewer comments | P2 | ⬜ open |
| KR-033 | Persistent page tree sidebar | P0 | ✅ done · 2026-06-16 |
| KR-034 | Tags / labels | P1 | ✅ done |
| KR-035 | Starred / favorites | P1 | ✅ done |
| KR-036 | Recently viewed | P1 | ✅ done · 2026-06-16 |
| KR-037 | Space home page | P1 | ✅ done · 2026-06-16 |
| KR-038 | Bulk operations | P1 | ✅ done · 2026-06-16 |
| KR-039 | Article moves across spaces | P2 | ⬜ open |
| KR-040 | Backlinks pane | P2 | ⬜ open |
| KR-041 | Full-text search across content | P0 | ✅ done · 2026-06-16 |
| KR-042 | Search result excerpts | P0 | ✅ done · 2026-06-16 |
| KR-043 | Advanced search filters | P1 | ✅ done |
| KR-044 | AI semantic search | P1 | ⬜ open |
| KR-045 | Related articles recommendations | P1 | ✅ done |
| KR-046 | Content knowledge graph | P2 | ⬜ open |
| KR-047 | Popular & trending section | P2 | ⬜ open |
| KR-048 | Saved search views | P2 | ⬜ open |
| KR-049 | Database block — multi-view | P1 | ⬜ open |
| KR-050 | Database relations | P1 | ⬜ open |
| KR-051 | Database filters / sorts / groups | P1 | ⬜ open |
| KR-052 | Enhanced Sheet block | P1 | ⬜ open |
| KR-053 | Enhanced Chart block | P2 | ⬜ open |
| KR-054 | Pivot table block | P2 | ⬜ open |
| KR-055 | Live data refresh on BQL widgets | P2 | ⬜ open |
| KR-056 | Embedded dashboard block | P2 | ⬜ open |
| KR-057 | Whiteboard shapes library | P1 | ⬜ open |
| KR-058 | Connector lines | P1 | ⬜ open |
| KR-059 | Whiteboard zoom / pan / snap | P1 | ⬜ open |
| KR-060 | Mind map block | P1 | ⬜ open |
| KR-061 | Flowchart builder | P2 | ⬜ open |
| KR-062 | Math / LaTeX block | P2 | ⬜ open |
| KR-063 | Rich embed block | P2 | ⬜ open |
| KR-064 | Whiteboard export | P2 | ⬜ open |
| KR-065 | Real-time presence indicators | P1 | ⬜ open |
| KR-066 | Article public share link | P1 | ✅ done · 2026-06-16 |
| KR-067 | Article subscriptions / watch | P1 | ✅ done · 2026-06-16 |
| KR-068 | Follow a space | P1 | ✅ done · 2026-06-16 |
| KR-069 | Embed article anywhere | P1 | ⬜ open |
| KR-070 | Live co-editing cursors | P2 | ⬜ open |
| KR-071 | Activity timeline tab | P2 | ⬜ open |
| KR-072 | Version diff viewer | P2 | ⬜ open |
| KR-073 | AI document outline generator | P1 | ⬜ open |
| KR-074 | AI grammar & style check | P1 | ⬜ open |
| KR-075 | AI auto-tagging | P1 | ⬜ open |
| KR-076 | AI readability score | P1 | ⬜ open |
| KR-077 | Meeting notes assistant | P1 | ⬜ open |
| KR-078 | AI content gap analysis | P2 | ⬜ open |
| KR-079 | AI duplicate detection | P2 | ⬜ open |
| KR-080 | AI translation (10 locales) | P2 | ⬜ open |
| KR-081 | PDF export (server-side) | P1 | ⬜ open |
| KR-082 | DOCX export | P1 | ⬜ open |
| KR-083 | Markdown export | P1 | ⬜ open |
| KR-084 | Email article | P1 | ⬜ open |
| KR-085 | Slack share integration | P2 | ⬜ open |
| KR-086 | Print stylesheet | P2 | ⬜ open |
| KR-087 | Public REST API for published articles | P2 | ⬜ open |
| KR-088 | Publish webhook | P2 | ⬜ open |
| KR-089 | Sprint ceremony notes template | Unique | ⬜ open |
| KR-090 | Decision log block | Unique | ⬜ open |
| KR-091 | Retrospective block | Unique | ⬜ open |
| KR-092 | Release notes auto-generator | Unique | ⬜ open |
| KR-093 | OKR documentation block | Unique | ⬜ open |
| KR-094 | Risk register block | Unique | ⬜ open |
| KR-095 | RACI matrix template | Unique | ⬜ open |
| KR-096 | Knowledge health dashboard | Unique | ⬜ open |

---

## Layer 1 — Rich text & formatting
> References: MS Word · Notion · Google Docs  
> Stack surface: `works-frontend/src/components/BlockEditor.jsx`, `BlockRenderer.jsx`

---

### WI-KR-001 · Inline formatting marks
**Phase** P0 | **Effort** L | **No migration needed**  
**Rule books** RB-10 · RB-30

**Scope** — Add bold, italic, underline, strikethrough, code-span, and hyperlink marks to paragraph, quote, and callout block content. Store marks as CommonMark markdown syntax within the existing `block.content` string (no schema change). Render marks as sanitized HTML in BlockRenderer.

**Analysis**
- Currently blocks hold plain text in `content`; BlockRenderer displays it as-is. No rendering layer for inline marks exists.
- Decision: use markdown syntax (`**bold**`, `*italic*`, `__underline__`, `~~strike~~`, `` `code` ``, `[text](url)`) stored in the string. This requires zero schema change and composes with the existing `renderMd` utility already in use.
- XSS risk: `renderMd` output must pass through DOMPurify before being set as innerHTML. Verify this is already the case; add it if not.
- Marks only apply to text-bearing blocks: paragraph, heading1-3, quote, callout. Not to code, table, sheet, or structural blocks.
- WI-KR-002 (floating toolbar) depends on this WI — the toolbar buttons insert/wrap the syntax added here.

**Build**
1. Audit `renderMd` to confirm it already uses DOMPurify or a sanitized renderer; add sanitization if missing.
2. In `BlockEditor.jsx`, for each text-bearing block textarea, add `onMouseUp` and `onKeyUp` handlers that check `window.getSelection()` and set a `selection` state (`{ blockId, start, end, text }`).
3. Implement `wrapSelection(blockId, syntax)` helper: reads current textarea value, wraps `value.slice(start, end)` with the syntax pair, updates the block's `content` via `updateBlock`, and restores the caret.
4. Keyboard shortcuts: `Ctrl+B` → `**`, `Ctrl+I` → `*`, `Ctrl+Shift+X` → `~~`, `` Ctrl+` `` → `` ` ``.
5. In `BlockRenderer.jsx`, ensure all text-bearing blocks render content through `renderMd` (not as plain text). Confirm headings 1-3 do this; fix any that use `{block.content}` directly.
6. Add a `MarkLink` popover: when user wraps a selection with `[]()` the link syntax, immediately open a small popover asking for the URL, then replace `()` with `(url)`.

**Acceptance criteria**
- [ ] Selecting "Hello" in a paragraph and pressing Ctrl+B changes it to `**Hello**` and the rendered read-mode shows it bold.
- [ ] Ctrl+I, Ctrl+Shift+X, Ctrl+` work analogously for italic, strikethrough, code-span.
- [ ] Link syntax `[Hello](https://example.com)` in content renders as a clickable link in read mode (opens in new tab).
- [ ] Marks work in paragraph, heading1-3, quote, callout; code block content is not processed for marks.
- [ ] Rendered HTML contains no XSS vectors: `<script>` or `onerror` attributes in content are stripped.
- [ ] Unauthorized: user without edit permission sees rendered content only; textarea is not shown.
- [ ] Cross-tenant: article content from another workspace cannot be fetched (existing API scoping sufficient; verify no new endpoint needed).

**Validation**
- `npm test` (Vitest) green — add test: render a paragraph block with `**bold**` in content → `getByText` finds a `<strong>` element in BlockRenderer output.
- Run app, open any block article in edit mode, type text, select it, press Ctrl+B → content string shows `**text**`, press "Save" → read mode shows bold text.
- Open browser DevTools, paste `**<img onerror=alert(1) src=x>**` as content → no alert fires in read mode.

**Merge** — Branch: `feat/know-inline-marks` · PR: `feat(knowledge): inline text formatting marks in block editor`  
DoD notes: no migration; no RBAC change; add 1 Vitest test for mark rendering; guardrails must pass.

---

### WI-KR-002 · Floating selection toolbar
**Phase** P0 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — When the user selects text inside any text-bearing block, display a floating toolbar above the selection with buttons: Bold · Italic · Strikethrough · Code · Link · Comment · AI assist. Buttons call `wrapSelection` (from WI-KR-001). Toolbar is keyboard-accessible and dismisses on Escape or outside click.

**Analysis**
- Depends on WI-KR-001 for `wrapSelection`. Build KR-001 first or in the same PR.
- Positioning: use `document.getSelection().getRangeAt(0).getBoundingClientRect()` to get the bounding box of the selection, then position the toolbar absolutely relative to the `#block-editor-root` container. Account for scroll offset.
- Toolbar must be a React portal rendered into `document.body` to avoid clipping by `overflow: hidden` containers.
- "Comment" button triggers KR-025 (block-level comments); wire up a no-op placeholder until KR-025 lands.
- "AI assist" triggers the existing AI assist menu on the block.
- Z-index: use the `dropdown` named scale token (RB-30 §9), not arbitrary `z-[9999]`.

**Build**
1. Create `SelectionToolbar.jsx`: a small floating `<div role="toolbar">` rendered via `ReactDOM.createPortal` into `document.body`.
2. Position calculation: `{ top: rect.top + window.scrollY - toolbarHeight - 6, left: rect.left + rect.width / 2 - toolbarWidth / 2 }`. Clamp to viewport edges.
3. Toolbar buttons: Bold, Italic, Strikethrough, Code, Link — each calls `onWrap(syntax)`; Comment calls `onComment()`; AI calls `onAI()`.
4. All buttons: `aria-label`, `title` tooltip, keyboard-navigable with Tab/Shift+Tab, Enter/Space to activate.
5. In `BlockEditor.jsx`: listen for `onMouseUp` on the editor root; if `window.getSelection().toString().length > 0` and the selection is inside a text block, set `toolbarAnchor` state; otherwise clear it.
6. Clear toolbar on Escape keydown (captured at the editor root), on click outside, and on `onBlur` from all text areas (with 100ms delay to allow toolbar button clicks to register first).
7. Use brand tokens: `bg-neutral-900 text-neutral-50 rounded-md` for the dark floating toolbar (Notion-style); icon buttons `p-1.5 hover:bg-neutral-700`.

**Acceptance criteria**
- [ ] Selecting text in a paragraph block shows the floating toolbar above the selection within 50ms.
- [ ] Clicking Bold in the toolbar wraps selected text with `**...**`.
- [ ] Toolbar is positioned above the selection, horizontally centered, and does not overflow the viewport.
- [ ] Pressing Escape dismisses the toolbar without modifying content.
- [ ] Clicking anywhere outside the toolbar and the selected block dismisses it.
- [ ] All toolbar buttons are focusable and activatable via keyboard.
- [ ] Toolbar does not appear on read-only views or when `editingArticle` is false.
- [ ] `role="toolbar"` and `aria-label="Text formatting"` are present.

**Validation**
- Vitest: mount BlockEditor with a paragraph block, fire `mouseup` after selecting text → toolbar renders in the DOM with role=toolbar.
- Run app, select text in any paragraph → toolbar appears; click each button → correct markdown syntax inserted; press Escape → toolbar gone.

**Merge** — Branch: `feat/know-selection-toolbar` · PR: `feat(knowledge): floating text selection toolbar`  
DoD notes: can be combined with KR-001 PR if small enough; must pass `jsx-a11y` rules; no migration.

---

### WI-KR-003 · Undo / redo
**Phase** P0 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30

**Scope** — Add session-level undo/redo to BlockEditor. `Ctrl+Z` undoes the last block state change; `Ctrl+Y` / `Ctrl+Shift+Z` redoes. Distinct from version history (which is server-side snapshots). Stack clears on article navigate.

**Analysis**
- Current BlockEditor holds `blocks` state. Every mutation (typing, block add/delete/move) updates `blocks` directly with no undo path.
- Approach: maintain `undoStack: Block[][]` and `redoStack: Block[][]` alongside `blocks`. On every `setBlocks` call (debounced after 500ms idle to batch keystrokes), push current `blocks` to `undoStack` and clear `redoStack`.
- Undo: pop `undoStack` → push current `blocks` to `redoStack` → restore popped snapshot.
- Cap stack depth at 100 entries to bound memory.
- `Ctrl+Z` is already a browser native on `<textarea>` (undoes within the textarea). Prevent default at the editor root level when `Ctrl+Z` is pressed outside a textarea (i.e., focus is on the editor shell), or when the textarea itself is at the beginning of its own undo stack. This is nuanced — simplest implementation: intercept `Ctrl+Z` at the `#block-editor-root` `onKeyDown` and always apply the block-level undo if the undoStack is non-empty, preventing default to suppress textarea-level undo.

**Build**
1. In `BlockEditor.jsx`, add `undoStack` and `redoStack` to state (or `useRef` to avoid re-renders).
2. Wrap `setBlocks` in a `commitBlocks(newBlocks)` helper that pushes to `undoStack` (capped at 100) and clears `redoStack`.
3. `handleUndo`: if `undoStack.length > 0`, push current blocks to `redoStack`, pop from `undoStack`, call `setBlocks` without going through `commitBlocks`.
4. `handleRedo`: inverse.
5. At `#block-editor-root` `onKeyDown`: intercept `Ctrl+Z` → `handleUndo` → `e.preventDefault()`; intercept `Ctrl+Y` or `Ctrl+Shift+Z` → `handleRedo` → `e.preventDefault()`.
6. Show a subtle status flash "Undone" / "Redone" in the existing save-status indicator for 800ms.
7. Clear both stacks when `selectedArticle.id` changes (via `useEffect` on article id).

**Acceptance criteria**
- [ ] Typing in a paragraph, then pressing Ctrl+Z, restores the previous block content.
- [ ] Deleting a block, then pressing Ctrl+Z, restores it at the correct position.
- [ ] Adding a block, undoing, redoing restores it.
- [ ] Undo stack caps at 100; the 101st undo drops the oldest entry.
- [ ] Navigating to a different article clears both stacks (no bleed between articles).
- [ ] Ctrl+Y and Ctrl+Shift+Z both trigger redo.
- [ ] Status bar briefly shows "Undone" / "Redone".

**Validation**
- Vitest: simulate 5 block mutations → call handleUndo 5 times → verify blocks restored to initial state.
- Run app: type text in 3 blocks, press Ctrl+Z 3 times → each undo reverts one typing step.

**Merge** — Branch: `feat/know-undo-redo` · PR: `feat(knowledge): session-level undo/redo in block editor`

---

### WI-KR-004 · Syntax highlighting in code blocks
**Phase** P0 | **Effort** S | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — Language-aware syntax highlighting for the `code` block type in read mode using Shiki (browser bundle). Language selector badge in the code block editor header. Language stored in `block.metadata.language`. Falls back to plain monospace if language not recognised.

**Analysis**
- Currently code blocks render as `<pre><code>{block.content}</code></pre>` — plain monospace, no coloring.
- Shiki provides accurate multi-language highlighting and ships a browser-compatible bundle via `shiki/bundle/web`. Bundle size is ~200 KB gzipped — acceptable; load it lazily on first code block render.
- Language stored in `block.metadata.language` (existing JSONB metadata field on block). No schema change needed.
- Shiki theme: use `github-light` / `github-dark` pair keyed to the existing `dark` class on `<html>`.
- In edit mode, the textarea stays plain — highlighting is read-mode only (edit mode shows raw syntax).

**Build**
1. Add `shiki` to `works-frontend/package.json` (check license: MIT, approved pattern).
2. Create `CodeBlockRenderer.jsx`: async component that imports `createHighlighter` from `shiki/bundle/web`, lazily initialises once (singleton), and returns highlighted HTML via `highlighter.codeToHtml(content, { lang, theme })`. Wrap in `<Suspense>` with a monospace pre fallback.
3. Sanitise the Shiki output with DOMPurify before `dangerouslySetInnerHTML`.
4. In `BlockRenderer.jsx`, replace the bare `<pre><code>` render for `type === 'code'` with `<CodeBlockRenderer content={block.content} language={block.metadata?.language ?? 'plaintext'} />`.
5. In `BlockEditor.jsx`, for the `code` block editor panel: add a language selector `<select>` (a list of ~20 common languages: javascript, typescript, java, python, sql, bash, json, yaml, xml, html, css, go, rust, kotlin, swift, markdown, dockerfile, plaintext). On change, call `updateBlock(id, { metadata: { ...metadata, language: val } })`.
6. Show the selected language as a small badge in the top-right of the code block in read mode.

**Acceptance criteria**
- [ ] A code block with `metadata.language = 'javascript'` renders coloured tokens in read mode (keywords blue, strings green, etc.).
- [ ] Language selector dropdown appears in edit mode for code blocks; selecting `python` persists via `updateBlock`.
- [ ] Unknown language falls back to `plaintext` without throwing.
- [ ] Shiki HTML output is sanitized; injecting `</pre><script>alert(1)</script>` into content does not execute.
- [ ] Language badge visible in top-right of code block in read mode.
- [ ] Dark/light theme switch renders correct Shiki theme.

**Validation**
- Vitest: render `<CodeBlockRenderer content="const x = 1" language="javascript" />` → find an element with class `shiki` in the DOM.
- Run app: create a code block, select language JavaScript, type `const x = 1`, switch to read mode → token colours visible.

**Merge** — Branch: `feat/know-code-highlight` · PR: `feat(knowledge): syntax highlighting for code blocks via Shiki`

---

### WI-KR-005 · Text color & highlight
**Phase** P1 | **Effort** S | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — Add text color (8 colors) and background highlight (8 colors) as inline mark types in text-bearing blocks. Surfaced via the floating selection toolbar (WI-KR-002). Stored as HTML `<span>` tags with Tailwind color classes in the block content string.

**Analysis**
- Depends on KR-001 (inline marks) and KR-002 (selection toolbar).
- Storage approach: instead of markdown syntax (which has no native color support), store color marks as `<span class="text-semantic-danger">...</span>` inline in the content string. `renderMd` already uses DOMPurify so span tags with allow-listed classes pass through cleanly.
- Add a `span` allowlist to DOMPurify: allow `span` elements with `class` attributes matching the design-token set only. No arbitrary classes.
- Highlight: `<span class="bg-yellow-100 dark:bg-yellow-900">...</span>` — use neutral/semantic token names per RB-30.
- 8 text colors: `neutral-600`, `semantic-danger`, `semantic-warning`, `semantic-success`, `brand-navy`, `brand-orange`, and 2 neutral light variants.
- 8 highlight colors: yellow, blue, green, red, orange, purple, pink, neutral.

**Build**
1. Define `TEXT_COLORS` and `HIGHLIGHT_COLORS` arrays: `{ label, textClass, bgClass, previewHex }` (hex only for color swatch rendering, not applied to DOM).
2. In `SelectionToolbar.jsx` (KR-002), add color picker sub-menu: on clicking a color icon, show a 2-row palette (text | highlight). Clicking a swatch calls `wrapSelectionWithSpan(blockId, start, end, className)`.
3. `wrapSelectionWithSpan`: wraps selected text with `<span class="${className}">...</span>` and updates the block content.
4. In `renderMd` / DOMPurify config: add `span` to the allowed tags; add `class` to allowed attributes for `span`; add an allowed class pattern that matches only `text-*` and `bg-*` Tailwind tokens.
5. Ensure `BlockRenderer.jsx` renders span tags for text-bearing blocks.

**Acceptance criteria**
- [ ] Selecting text and choosing red from the text color picker wraps it in `<span class="text-semantic-danger">`.
- [ ] The red text is visible in read mode.
- [ ] Highlight yellow wraps in `<span class="bg-yellow-100 dark:bg-yellow-900">` and is visible in both light and dark modes.
- [ ] Non-allowlisted classes in content are stripped by DOMPurify (e.g., `onclick` is removed).
- [ ] Color swatches in the toolbar meet WCAG AA contrast against the toolbar background.

**Validation**
- Vitest: render a paragraph block with `<span class="text-semantic-danger">hello</span>` in content → element has class `text-semantic-danger`.
- Run app: select text → color picker → apply red → read mode shows red text.

**Merge** — Branch: `feat/know-text-color` · PR: `feat(knowledge): text color and highlight marks in block editor`

---

### WI-KR-006 · Find & Replace
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — Add a Find & Replace bar to BlockEditor, opened via `Ctrl+F` (find) and `Ctrl+H` (find + replace). Searches across all block content strings in the current article. Matches highlighted inline. Navigation: prev / next match.

**Analysis**
- Pure frontend change. No backend needed — all blocks are loaded in memory in `BlockEditor`'s `blocks` state.
- Find: scan all blocks' `content` for case-insensitive substring matches. Store `[{ blockId, start, end }]` as match list.
- Highlight matches: inject `<mark>` tags around matches in the rendered read preview. In edit mode, `<textarea>` cannot natively highlight text; approximate with a scrolling highlight overlay (complex) — or simpler: scroll to the matching block and set the textarea selection range using `setSelectionRange`. The latter is much simpler and sufficient.
- Replace: replace all occurrences of the match in a specific block's content, or replace all across all blocks.

**Build**
1. Add `findBarOpen`, `findQuery`, `replaceQuery`, `matches`, `activeMatchIndex` to BlockEditor state.
2. `Ctrl+F` at editor root: set `findBarOpen=true`, focus the find input, `e.preventDefault()`.
3. `Ctrl+H`: same + `replaceOpen=true`.
4. Find bar UI: fixed bar at the top of the editor (not floating). Input for query, `↑↓` prev/next buttons, match count `3/12`, close button (Esc). Replace row (below, if open): replace input, Replace button, Replace All button.
5. `computeMatches(query, blocks)`: returns `[{ blockId, start, end, blockIndex }]` for all case-insensitive matches.
6. Navigation: `activeMatchIndex` cycles through `matches`; scroll to the matching block (`blockElsRef.current[blockIndex]?.scrollIntoView`), set `textarea.setSelectionRange(start, end)` to select the match in the textarea.
7. Replace: update block content with the replaced string for the active match (single) or all matches.

**Acceptance criteria**
- [ ] `Ctrl+F` opens the find bar and focuses the query input.
- [ ] Typing "hello" finds all occurrences across all blocks; count shown as "N matches".
- [ ] `↑` / `↓` buttons navigate between matches; the matching block scrolls into view and the textarea selection jumps to the match.
- [ ] Replace All replaces all occurrences across all blocks in one action.
- [ ] Escape closes the find bar.
- [ ] Find bar does not appear in read-only mode (editingArticle=false).
- [ ] Empty query shows "0 matches" without error.

**Validation**
- Vitest: render editor with 3 paragraph blocks containing "hello"; call `computeMatches('hello', blocks)` → returns 3 matches.
- Run app: Ctrl+F → type "the" → matches highlighted (textarea scrolls to each).

**Merge** — Branch: `feat/know-find-replace` · PR: `feat(knowledge): Find & Replace bar in block editor`

---

### WI-KR-007 · Block indent / nesting
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — Tab / Shift+Tab in a focused block textarea indents or outdents that block up to 4 levels. Indent level stored in `block.metadata.indent` (0–4). Visual left-border accent per depth level in both edit and read mode.

**Analysis**
- Depends on no other WI.
- Tab in a textarea normally inserts a literal tab character. Override `onKeyDown` to intercept Tab (without Ctrl/Alt) when the textarea is focused in BlockEditor and the cursor is at the start of a line or the textarea is empty.
- This is a presentational nesting only — not a semantic tree structure. Blocks remain a flat array; `indent` is purely display metadata.
- Visual treatment: for indent level 1-4, apply a `border-l-2 border-brand-navy-tint/40 pl-${2+level*3}` style class on the block wrapper.
- Numbered list blocks at different indent levels restart their count per level (tracked via display logic in BlockRenderer, not stored).

**Build**
1. In `BlockEditor.jsx`, on block textarea `onKeyDown`, intercept `Tab` (no modifiers): call `updateBlock(id, { metadata: { ...meta, indent: Math.min(4, (meta.indent ?? 0) + 1) } })` → `e.preventDefault()`.
2. Intercept `Shift+Tab`: `Math.max(0, indent - 1)`.
3. On `Block` wrapper in BlockEditor's render: apply `pl-${(meta.indent ?? 0) * 4}` padding and `border-l-2 border-brand-navy-tint/30` for `indent > 0`.
4. In `BlockRenderer.jsx`: same padding + border for read mode.
5. Do not indent structural blocks (divider, toc, bqlwidget, whiteboard, image, mermaid) — skip Tab interception for those types.

**Acceptance criteria**
- [ ] Pressing Tab in a focused paragraph block increases its `metadata.indent` from 0 to 1, adding a left border and padding.
- [ ] Pressing Tab 4 more times caps at indent 4 and does not increase further.
- [ ] Shift+Tab decreases indent; Shift+Tab at indent 0 has no effect.
- [ ] Indentation persists after save and reload (stored in JSONB metadata).
- [ ] Tab on a structural block (divider, image) does not indent it.
- [ ] Read mode shows the same indent levels as edit mode.

**Validation**
- Vitest: simulate Tab keydown on paragraph block → metadata.indent becomes 1.
- Run app: Tab on a paragraph → visual indent; save → reload → indent preserved.

**Merge** — Branch: `feat/know-block-indent` · PR: `feat(knowledge): block indentation via Tab/Shift+Tab`

---

### WI-KR-008 · Footnotes
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New block type `footnote_ref` (inline) and article-level footnote collection. User inserts a footnote via `/footnote` slash command; a numbered superscript `[n]` appears in the block content; the footnote body is stored in `block.metadata.footnotes` on the article root (or as a special block at the end). Footnotes rendered as a numbered list at article bottom in read mode.

**Analysis**
- Simpler design: store footnotes as a special `metadata.footnotes` array on a dedicated `footnotes` block type appended at the end of the block list. The inline marker `[^1]` is inserted into paragraph content as markdown (standard CommonMark footnote syntax). `renderMd` with the `markdown-it-footnote` plugin (or equivalent) handles rendering.
- Alternatively (simpler, no new plugin): treat `[^1]` markers as literal text; strip them in the BlockRenderer footnotes block and render the footnotes list. Choose the simpler path.
- Decision: add `footnotes` to SLASH_COMMANDS; inserting it adds a `{ type: 'footnotes', content: '', metadata: { items: [] } }` block. The block renders as a divider + numbered list. Each `[^n]` in text is hyperlinked to the corresponding list item via id anchors.

**Build**
1. Add `footnotes` to `TOOLBAR_GROUPS` under Structure (icon: Superscript).
2. `FootnotesBlockEditor`: renders a numbered list of textareas; "Add footnote" button appends an item; delete button removes one. Footnote numbers are positional.
3. `FootnotesBlockRenderer`: renders `<ol>` with `<li id="fn-n">` items; jump anchor back to marker.
4. In text-bearing blocks, `/footnote` slash command inserts `[^n]` at cursor where `n` is the next available footnote number. Relies on cross-block state (the footnotes block's items count).
5. Provide a helper `getNextFootnoteNumber(blocks)` that counts existing `[^n]` markers across all blocks.
6. In read mode, `[^n]` text in paragraph content renders as `<sup><a href="#fn-n">[n]</a></sup>`.

**Acceptance criteria**
- [ ] `/footnote` inserts `[^1]` at cursor in a paragraph block and adds a footnotes block at the end (if not already present) with one empty item.
- [ ] Inserting a second `/footnote` inserts `[^2]` and adds item 2 to the footnotes block.
- [ ] Read mode renders `[^1]` as a superscript `[1]` linked to the corresponding footnote item.
- [ ] Footnotes block renders as a numbered list at the bottom of the article.
- [ ] Deleting the footnotes block removes all markers from text blocks (or shows a warning toast).

**Validation**
- Vitest: simulate `/footnote` command → verify `[^1]` inserted in content and a `footnotes` block appended.
- Run app: add a footnote, write footnote text, switch to read mode → superscript link visible; click it → jumps to footnote list.

**Merge** — Branch: `feat/know-footnotes` · PR: `feat(knowledge): footnotes block type and inline markers`

---

## Layer 2 — Document chrome
> References: Notion · Confluence · Linear Docs  
> Stack surface: `knowledge-view.jsx`, `Article` entity, new migration

---

### WI-KR-009 · Cover image / gradient
**Phase** P0 | **Effort** S | **Migration: V9X (add cover_image to articles)**  
**Rule books** RB-10 · RB-30 · RB-40 (workspace-scoped write)

**Scope** — Add a `cover_image` varchar column to the `articles` table. Display a cover (URL or gradient key) above the article title in both edit and read mode. Toggle and remove cover via an overflow menu in the article header.

**Analysis**
- Schema: `cover_image VARCHAR(500) NULL` — stores either an external image URL or a gradient key like `gradient:brand-navy-to-orange`.
- No file upload (URLs only for P0; native uploads tracked as TD for a later WI).
- Frontend: in `knowledge-view.jsx`, above the title area, render `<ArticleCover image={article.coverImage} />` that either shows an `<img>` tag (sanitized URL, no javascript: scheme) or a CSS gradient div keyed by the gradient name.
- 12 preset gradients defined as `COVER_GRADIENTS` constants using brand tokens.
- "Add cover" button appears on hover over the title area when no cover is set. Clicking opens a popover: URL input tab + gradient picker tab.

**Build**
1. Migration `V9X__articles_cover_image.sql`: `ALTER TABLE articles ADD COLUMN cover_image VARCHAR(500);`.
2. Add `coverImage` field to `Article` entity + DTO.
3. Existing `PUT /api/v1/articles/{id}` already accepts partial updates — add `coverImage` to `ArticleUpdateRequest` DTO. Validate: must be null, a gradient key starting with `gradient:`, or an http/https URL (no javascript: scheme).
4. Create `ArticleCover.jsx`: renders a 180px-tall cover area. If `image` starts with `gradient:`, map to a CSS gradient via `COVER_GRADIENTS` lookup. If it's a URL, render `<img src={image} alt="" role="presentation" className="w-full h-44 object-cover" />`.
5. In `knowledge-view.jsx` article detail panel: prepend `<ArticleCover>` before the title.
6. Article header overflow menu (⋯): add "Change cover" → cover picker popover; "Remove cover" → sets `coverImage` to null and saves.

**Acceptance criteria**
- [ ] Setting a gradient key (`gradient:brand-navy`) shows a navy gradient banner above the article title.
- [ ] Setting an HTTPS image URL shows the image as a full-width banner at 44 height.
- [ ] `javascript:` URLs are rejected with a validation error (400) from the backend.
- [ ] "Remove cover" sets cover to null; the article header returns to normal.
- [ ] Cover persists after page reload (stored in DB).
- [ ] Unauthorized: users without edit permission cannot change the cover (RBAC enforced in service).
- [ ] Cross-tenant: `coverImage` is updated only for articles in the requesting user's workspace.

**Validation**
- Testcontainers IT: PUT article with `coverImage = "gradient:brand-navy"` → GET article → field returned.
- Vitest: render `<ArticleCover image="gradient:brand-navy" />` → container has gradient background style.
- Run app: open an article → "Add cover" → pick gradient → cover appears.

**Merge** — Branch: `feat/know-cover-image` · PR: `feat(knowledge): article cover image and gradient banner`  
DoD notes: migration must be next sequential V-number per CLAUDE.md §6; confirm before push.

---

### WI-KR-010 · Article icon / emoji
**Phase** P0 | **Effort** S | **Migration: V9X (add icon to articles) — combine with KR-009 migration if possible**  
**Rule books** RB-10 · RB-30

**Scope** — Add `icon` varchar to `articles` (stores an emoji string or a Lucide icon name). Show the icon beside the article title in the page tree sidebar and article header. Emoji picker popover to set it. Defaults to the template-type icon if unset.

**Analysis**
- Can be combined with KR-009 migration: `ALTER TABLE articles ADD COLUMN cover_image VARCHAR(500); ALTER TABLE articles ADD COLUMN icon VARCHAR(50);`.
- Frontend: article title row shows a clickable icon slot. If `icon` is a 1-2 character emoji, render it as text. If it starts with `lucide:`, render the corresponding Lucide icon. If null, show the template-type default icon.
- Emoji picker: use the browser's native emoji picker via `<input type="text" inputmode="none">` trick, or a simple flat grid of 30 common emoji options (fast, no extra dep). Option 2 is simpler and avoids emoji-mart dependency.

**Build**
1. Migration: add `icon VARCHAR(50) NULL` to articles (combine with KR-009 or as its own migration).
2. `Article` entity + `ArticleUpdateRequest` DTO: add `icon` field.
3. Default icon map: `{ KB: BookOpen, RUNBOOK: Terminal, ADR: Scale, POSTMORTEM: AlertTriangle, ONBOARDING: Users, TROUBLESHOOTING: Wrench, CUSTOM: FileText }` — Lucide icons.
4. `ArticleIconPicker.jsx`: a small popover triggered by clicking the icon slot. Shows 2 tabs: Emoji (flat grid of 40 common emoji) and Icons (grid of 12 Lucide options). "Clear" button resets to default. On select, calls `updateArticle(id, { icon: value })`.
5. In the page tree sidebar (KR-033): show `icon` beside each article name.
6. In the article header: show `icon` as a large emoji/icon (24px) beside the title.

**Acceptance criteria**
- [ ] Clicking the icon slot in the article header opens the icon picker popover.
- [ ] Selecting 📝 emoji sets `icon = "📝"` and it appears in the article header and (once KR-033 is done) the page tree.
- [ ] Clearing the icon reverts to the template-type default icon.
- [ ] `icon` persists after reload.
- [ ] Unauthorized users cannot change the icon (RBAC in service).

**Validation**
- Testcontainers IT: PUT article with `icon = "📝"` → GET → returned in DTO.
- Run app: click icon slot → pick emoji → emoji appears in header.

**Merge** — Branch: `feat/know-article-icon` · PR: `feat(knowledge): article icon/emoji picker`

---

### WI-KR-011 · Article properties panel
**Phase** P1 | **Effort** M | **Migration: V9X (article_tags table — see KR-034; review_by_date — see KR-021)**  
**Rule books** RB-10 · RB-30

**Scope** — Collapsible "Properties" panel below the article title (edit + read mode). Shows: owner (authorName, read-only), reviewer (if assigned), tags (from KR-034), review-by date (from KR-021), template type, word count. Hidden by default; toggle with a Properties button or `Cmd+Shift+P`.

**Analysis**
- This WI is primarily a UI aggregation of fields that already exist (`authorId`, `reviewerId`, `templateType`, `versionNumber`) plus new fields from other WIs. Build the panel shell now; populate tag + review-date fields after KR-034 / KR-021 land.
- Panel is collapsed by default (`useLocalStorage('know_props_open', false)` so the preference persists per user in browser storage).
- Each property row: icon + label + value (read-only for most; tags is editable if KR-034 done).

**Build**
1. `ArticlePropertiesPanel.jsx`: a collapsible `<details>`-based (or CSS-driven) panel. Fields: Owner (authorName), Reviewer (reviewerName, nullable), Template type (templateType), Status (status badge), Version (versionNumber), Last updated (updatedAt), Word count (derived from blocks content), Tags (chip list, editable when KR-034 available), Review by (editable date, when KR-021 available).
2. In `knowledge-view.jsx`, render `<ArticlePropertiesPanel>` between the article title and the block editor / content.
3. Properties toggle button: a small "Properties" text button with `ChevronDown` icon in the article header bar. Click toggles collapsed state.
4. `Cmd+Shift+P` keyboard shortcut in the editor root toggles the panel.
5. Panel is visible in both edit and read modes (some fields editable in edit only).

**Acceptance criteria**
- [ ] "Properties" button in article header toggles the panel open/closed.
- [ ] Panel shows: owner name, template type, status, version, last-updated date, word count.
- [ ] Panel defaults to collapsed; preference persists on reload.
- [ ] `Cmd+Shift+P` toggles the panel.
- [ ] No WCAG violations (axe-core): panel uses correct heading hierarchy and all fields have labels.
- [ ] Read-only in read mode: all fields are display-only when `editingArticle=false`.

**Validation**
- Vitest: render KnowledgeView with a selected article → click "Properties" button → `ArticlePropertiesPanel` appears.
- Run app: open any article → Properties button → panel shows correct data.

**Merge** — Branch: `feat/know-properties-panel` · PR: `feat(knowledge): collapsible article properties panel`

---

### WI-KR-012 · Focus / distraction-free mode
**Phase** P1 | **Effort** S | **No migration needed**  
**Rule books** RB-30

**Scope** — `Ctrl+Shift+F` hides both the left sidebar and the article side panels, leaving only the block editor centered at max-width 720px. A subtle "Exit focus" chip in the top-right corner dismisses it. `Escape` also exits.

**Analysis**
- Pure CSS/state toggle. `focusMode` boolean in knowledge-view state.
- When `focusMode=true`: left sidebar `display:none`, article side panels hidden, editor wrapper gets `max-w-[720px] mx-auto` (acceptable arbitrary value since 720 is a standard prose width — but check if `max-w-xl` covers it; `max-w-xl` = 36rem = 576px, `max-w-2xl` = 42rem = 672px, `max-w-3xl` = 48rem = 768px — use `max-w-3xl` as the nearest token, approximately 720px).
- Keyboard shortcut captured at `knowledge-view` root `onKeyDown` (avoid conflict with browser Ctrl+Shift+F which opens browser Find).

**Build**
1. Add `focusMode` boolean state to `knowledge-view.jsx`.
2. `onKeyDown` on the view root: intercept `Ctrl+Shift+F` → toggle `focusMode` → `e.preventDefault()`.
3. Conditional class on left sidebar wrapper: `focusMode ? 'hidden' : ''`.
4. Conditional class on article side-panel area: `focusMode ? 'hidden' : ''`.
5. Editor content wrapper: `focusMode ? 'max-w-3xl mx-auto' : ''`.
6. Render `<FocusModeExitChip>` (top-right, fixed within the content area) when `focusMode=true`. Clicking it or pressing `Escape` (captured at document level while focusMode active) sets `focusMode=false`.
7. Reading time shown in a subtle `text-xs text-neutral-400` chip in the editor header while in focus mode.

**Acceptance criteria**
- [ ] `Ctrl+Shift+F` hides the left sidebar and side panels.
- [ ] Editor content centers at ~720px width in focus mode.
- [ ] "Exit focus" chip is visible and dismisses focus mode on click.
- [ ] `Escape` exits focus mode.
- [ ] Focus mode state does not persist on page reload (session-only).
- [ ] Focus mode is only available in edit mode (not read-only view).

**Validation**
- Vitest: render KnowledgeView → simulate Ctrl+Shift+F keydown → sidebar element has `hidden` class.
- Run app: enter edit mode, Ctrl+Shift+F → sidebar gone, editor centered.

**Merge** — Branch: `feat/know-focus-mode` · PR: `feat(knowledge): distraction-free focus mode for block editor`

---

### WI-KR-013 · Enhanced status bar
**Phase** P1 | **Effort** S | **No migration needed**  
**Rule books** RB-30

**Scope** — Upgrade the existing word-count / reading-time status bar at the bottom of the BlockEditor to also show: Flesch-Kincaid readability grade, characters without spaces, last-saved timestamp (relative), and current user's avatar. All values update live without triggering a save.

**Analysis**
- Flesch-Kincaid Grade Level formula: `0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59`. Syllable count is approximated by counting vowel groups per word. Implement as a pure JS function `flesch(text)` → grade number. This is rule-based — no AI needed.
- All text is already available in `blocks` state via `flatMap(b => b.content)`.
- Last-saved timestamp: already tracked as `saveStatus` in the component. Add a `lastSavedAt` Date state updated when save completes.
- The status bar already exists as a `<div>` at the bottom of BlockEditor. Extend it.

**Build**
1. Implement `fleschKincaid(text: string): number` in `src/lib/readability.js`. Use vowel-group approximation for syllables. Return grade rounded to 1 decimal.
2. Implement `gradeLabel(grade: number): string` → e.g., `"Grade 8 · Easy"`, `"Grade 12 · Difficult"`.
3. In `BlockEditor.jsx`, derive `allText` from `useMemo(() => blocks.filter(b => b.content).map(b => b.content).join(' '), [blocks])`.
4. Derive `grade = useMemo(() => fleschKincaid(allText), [allText])`.
5. Update status bar render: `{wordCount} words · {charCount} chars · {readingTime} min read · Grade {grade} · {relative(lastSavedAt)}`.
6. Show user avatar (from `currentUser` prop) as a 20px circle on the far right of the status bar.

**Acceptance criteria**
- [ ] Status bar shows word count, character count, reading time, readability grade, and last-saved time.
- [ ] All values update live as user types (no save triggered).
- [ ] Readability grade is computed correctly: a simple "Hello world." should yield Grade < 2.
- [ ] Last-saved time shows "Saved just now" immediately after save, then "Saved 2 min ago" etc.
- [ ] Status bar is `aria-live="polite"` to announce changes to screen readers.

**Validation**
- Vitest: call `fleschKincaid('The cat sat on the mat.')` → grade between 0 and 3 (very simple sentence).
- Run app: type a paragraph → status bar updates; save → "Saved just now" appears.

**Merge** — Branch: `feat/know-status-bar` · PR: `feat(knowledge): enhanced block editor status bar with readability grade`

---

### WI-KR-014 · In-article table of contents pane
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-30

**Scope** — A collapsible left mini-pane within the article detail area (not the global sidebar) listing all H1/H2/H3 heading blocks as anchor links. Clicking a heading link scrolls to that block. The active heading highlights as user scrolls (read mode only).

**Analysis**
- The `toc` block type already exists and auto-generates a list from headings. This WI is different: a persistent collapsible side pane that is always accessible in read mode without inserting a TOC block.
- In edit mode, the pane shows the heading list as navigation only (not editable). Hidden in focus mode (KR-012).
- Intersection Observer watches heading blocks in read mode to track which one is in view.
- The pane is placed to the left of the article content (inside the article panel, not the global left nav).

**Build**
1. `ArticleTOCPane.jsx`: accepts `blocks: Block[]`, derives `headings = blocks.filter(b => ['heading1','heading2','heading3'].includes(b.type))`. Renders a `<nav aria-label="Article outline">` with an `<ol>` of links. H2 is indented with `pl-4`, H3 with `pl-8`.
2. Each link: `href="#block-{id}"` (anchor to the heading block's DOM id). Clicking triggers smooth scroll via `document.getElementById('block-' + id)?.scrollIntoView({ behavior: 'smooth' })`.
3. Ensure each heading block in `BlockRenderer.jsx` has `id={`block-${block.id}`}` on its wrapper element.
4. In read mode only: add `IntersectionObserver` watching heading elements. Update `activeId` state as headings enter the viewport. Highlight the corresponding TOC link.
5. In `knowledge-view.jsx`: show the TOC pane to the right of the article content in a 2-column layout (`grid-cols-[1fr_200px]`) when the article has ≥2 headings and the pane is open.
6. Toggle button ("Outline") in the article header. Remember state in localStorage.

**Acceptance criteria**
- [ ] Articles with 2+ headings show an "Outline" toggle button in the article header.
- [ ] TOC pane lists all H1/H2/H3 blocks; H2 and H3 are indented.
- [ ] Clicking a TOC link scrolls to the corresponding heading.
- [ ] The active heading link is highlighted as user scrolls through the article (read mode).
- [ ] TOC pane is hidden in focus mode (KR-012).
- [ ] `nav aria-label="Article outline"` present for accessibility.

**Validation**
- Vitest: render `<ArticleTOCPane blocks={[h1, h2, h3]} />` → 3 links in the nav.
- Run app: open a multi-heading article in read mode → Outline button → pane appears with working links.

**Merge** — Branch: `feat/know-toc-pane` · PR: `feat(knowledge): in-article table of contents pane`

---

### WI-KR-015 · Print / PDF / DOCX / Markdown export
**Phase** P2 | **Effort** L | **Migration: none (new endpoints only)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Export the current article in four formats: PDF (server-side Puppeteer), DOCX (docx.js on server), Markdown (client-side serializer), and print (CSS @media print). Accessible from an "Export" dropdown in the article header overflow menu.

**Analysis**
- PDF and DOCX are server-side to ensure consistent rendering (Puppeteer renders the full HTML including block types; docx.js serializes blocks to Word XML). New endpoints: `GET /api/v1/articles/{id}/export/pdf` and `/export/docx`.
- Both endpoints are RBAC-gated: must have read access to the article's space; article must be PUBLISHED or the requester must be the author.
- Puppeteer is a heavy dependency. Evaluate whether to add it as a backend Maven dependency or invoke via a separate Node sidecar. For the modular monolith stage, a small Node.js export sidecar script called via `ProcessBuilder` is acceptable. Alternatively, use `Flying Saucer` (a Java PDF renderer from HTML) to avoid Node. Flag for Deepak sign-off — stop and ask before adding Puppeteer.
- Markdown export: client-side block serializer `blocksToMarkdown(blocks): string`. No backend call needed.
- DOCX: use `docx` npm package (MIT) in a Node.js export helper invoked server-side.

**Build**
1. **Markdown export (frontend only):**  
   `src/lib/export.js`: `blocksToMarkdown(blocks)` — map each block type to GFM markdown. Return string. Download via `URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))`.
2. **Print stylesheet (frontend only):**  
   Add `@media print` rules to `src/index.css`: hide left nav, hide side panels, hide editor chrome; center content at 720px; break before H1.
3. **PDF export (backend):**  
   New `ExportController` → `ExportService`. Retrieve article, render blocks to HTML (reuse the same template the frontend uses, via a Thymeleaf template or a stored HTML serializer). Invoke a PDF library. Return `application/pdf` response stream. RBAC gate: `rbacService.requirePermission(userId, workspaceId, "view_items")` + article visibility check.
4. **DOCX export (backend):**  
   `ExportService.toDocx(article)`: map blocks to docx.js elements (heading → HeadingLevel, paragraph → Paragraph, table → Table). Return `application/vnd.openxmlformats-officedocument.wordprocessingml.document` stream.
5. **Export dropdown UI:**  
   `ExportMenu.jsx` in article header overflow: four items (PDF, DOCX, Markdown, Print). Markdown triggers client-side download; Print calls `window.print()`; PDF/DOCX call respective endpoints.

> ⚠️ **Stop and ask Deepak** before adding Puppeteer or any PDF library — this is a new backend dependency requiring the approval checklist (RB-10 §9).

**Acceptance criteria**
- [ ] "Export" dropdown appears in article overflow menu.
- [ ] Markdown export downloads a `.md` file with all block types serialized (headings → `#`, tables → GFM pipes, code → fenced blocks).
- [ ] Print triggers `window.print()` with a clean print layout (sidebar hidden, content centered).
- [ ] PDF endpoint returns a valid PDF for a PUBLISHED article; returns 403 for an unauthorized user.
- [ ] DOCX endpoint returns a valid Word document with correct heading styles.
- [ ] Cross-tenant: PDF/DOCX endpoints 404 for articles not in the requester's workspace.

**Validation**
- Vitest: `blocksToMarkdown([{ type: 'heading1', content: 'Title' }])` → returns `'# Title\n'`.
- Integration test: GET /api/v1/articles/{id}/export/pdf with valid + unauthorized tokens.
- Run app: Markdown export on a multi-block article → download opens; content matches blocks.

**Merge** — Branch: `feat/know-export` · PR: `feat(knowledge): PDF, DOCX, and Markdown article export`

---

### WI-KR-016 · Article reading view
**Phase** P2 | **Effort** S | **No migration needed**  
**Rule books** RB-30

**Scope** — Clean toggle between edit mode and read mode for the article. Read mode hides all editor chrome (block toolbar, block controls, add-block button), centers content at max 720px, and renders blocks via `BlockRenderer`. Toggle via an "Edit" / "Preview" button in the article header. Deep-linked via `?mode=read` URL param.

**Analysis**
- `editingArticle` state already exists in knowledge-view. This WI formalises it as a first-class mode toggle visible in the UI (currently triggered only by a separate "Edit" button flow).
- The read/edit toggle should be a split button or icon button in the article header, not buried in a menu.
- In read mode, the URL should update to `?mode=read` (shallow navigation, no full page reload). In edit mode `?mode=edit`. Deep links open in the correct mode.

**Build**
1. In `knowledge-view.jsx`, on article open, read `?mode` from the URL (`useSearchParams` or `window.location.search`). Set `editingArticle = mode === 'edit'`.
2. Article header: add a `<ReadEditToggle>` component — two buttons "Edit" and "Preview" styled as a segmented control (like a tab). Clicking "Preview" sets `editingArticle=false` and pushes `?mode=read` to history; "Edit" sets `editingArticle=true` and pushes `?mode=edit`.
3. In read mode, the article content area shows `<BlockRenderer blocks={blocks} />` with `max-w-3xl mx-auto` centering.
4. In edit mode, it shows `<BlockEditor ...>` as now.
5. Users without edit permission see "Preview" as the only available mode (the "Edit" button is disabled or hidden).

**Acceptance criteria**
- [ ] "Edit" and "Preview" segmented control visible in article header when article is open.
- [ ] Clicking "Preview" renders blocks in read mode, centered at ~720px, with no editor chrome.
- [ ] Clicking "Edit" returns to the block editor.
- [ ] URL reflects the current mode (`?mode=read` / `?mode=edit`).
- [ ] Opening `?mode=read` directly shows read mode without requiring a click.
- [ ] Read-only users see "Preview" only; "Edit" button absent or disabled.

**Validation**
- Vitest: render KnowledgeView with `selectedArticle` and `editingArticle=false` → `BlockRenderer` present, `BlockEditor` absent.
- Run app: open article, click Preview → editor chrome gone; click Edit → editor returns.

**Merge** — Branch: `feat/know-reading-view` · PR: `feat(knowledge): edit/preview toggle and deep-link mode param`

---

## Layer 3 — Status & workflow
> References: Confluence · MS Word Review · Notion  
> Stack surface: `knowledge-view.jsx`, `Article` entity/service, new migrations

---

### WI-KR-017 · Status badge + transition popover
**Phase** P0 | **Effort** M | **No migration needed (uses existing status field)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Replace the current text-only status display with a clickable colored badge. Clicking the badge opens a popover listing allowed next statuses with a required transition comment field. Transition is submitted via the existing `submitArticleForReview` / `publishArticle` / `archiveArticle` / `restoreArticle` callbacks. Transition event logged.

**Analysis**
- Current: status string shown as plain text; workflow actions are separate buttons (Submit for Review, Publish, etc.) in a toolbar area. This fragments the UX.
- New model: one status badge → click → popover with next-status chips + comment textarea + Confirm button. Replaces the separate workflow action buttons.
- Status → allowed transitions: `DRAFT → [IN_REVIEW, ARCHIVED]`; `IN_REVIEW → [PUBLISHED, DRAFT (reject)]`; `PUBLISHED → [ARCHIVED, DRAFT (unpublish)]`; `ARCHIVED → [DRAFT (restore)]`.
- Transition comment: optional for DRAFT→IN_REVIEW; logged as an event.
- Existing API calls remain unchanged; the popover just calls the existing callbacks.

**Build**
1. `StatusBadge.jsx`: renders a colored pill badge for the article status. Colors: DRAFT → `bg-neutral-100 text-neutral-600`, IN_REVIEW → `bg-semantic-warning/10 text-semantic-warning`, PUBLISHED → `bg-semantic-success/10 text-semantic-success`, ARCHIVED → `bg-neutral-200 text-neutral-400`. Clickable (calls `onClick`) when user has edit permission.
2. `StatusTransitionPopover.jsx`: a popover (use the existing popover pattern in the codebase) showing: current status header, list of next-status chips, comment textarea (`<textarea aria-label="Transition comment" placeholder="Why are you changing this status?">`), Confirm button.
3. Confirm button maps to the appropriate existing callback based on `nextStatus`.
4. In `knowledge-view.jsx`: replace the ad-hoc status buttons with `<StatusBadge>` + `<StatusTransitionPopover>`.

**Acceptance criteria**
- [ ] Status badge renders with the correct color for each status.
- [ ] Clicking the badge (edit permission required) opens the transition popover.
- [ ] Available next-status options match the allowed transition map.
- [ ] Submitting a transition with an optional comment calls the correct existing callback.
- [ ] Popover closes after submit; status badge updates to the new status.
- [ ] Unauthorized user: status badge is not clickable (no pointer-events); clicking does nothing.
- [ ] `aria-haspopup="dialog"` on the badge button for a11y.

**Validation**
- Vitest: render `<StatusBadge status="DRAFT" can={() => true} onClick={fn} />` → clicking it calls `onClick`.
- Vitest: render `<StatusTransitionPopover currentStatus="DRAFT" .../>` → shows IN_REVIEW and ARCHIVED as options.
- Run app: click DRAFT badge → popover → select IN_REVIEW → Confirm → badge updates to IN_REVIEW.

**Merge** — Branch: `feat/know-status-badge` · PR: `feat(knowledge): article status badge and transition popover`

---

### WI-KR-018 · Reviewer assignment
**Phase** P1 | **Effort** M | **Migration: V9X (reviewer_due_date on articles)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — When submitting an article for review, the status transition popover (KR-017) shows a member picker to assign a specific reviewer + a due date. Backend stores `reviewer_id` (existing) and new `reviewer_due_date`. The assigned reviewer receives an in-app notification.

**Analysis**
- `reviewer_id` column already exists on `articles`. New: `reviewer_due_date TIMESTAMP WITH TIME ZONE NULL`.
- Notification: use the existing notification mechanism (check how other notifications are fired in the app — likely via `EventService` and a notification listener). If no notification system exists for knowledge events, fire a `ARTICLE_REVIEW_REQUESTED` event to the `events` table; a future WI can wire it to in-app notifications.
- The member picker: a searchable dropdown of workspace members (existing `/api/v1/members` endpoint).

**Build**
1. Migration: `ALTER TABLE articles ADD COLUMN reviewer_due_date TIMESTAMP WITH TIME ZONE;`.
2. Add `reviewerDueDate` to `Article` entity and `ArticleUpdateRequest` DTO.
3. When `nextStatus = IN_REVIEW` in the transition popover: show `<MemberPicker label="Assign reviewer" />` and `<DatePicker label="Due by" />` fields. Pass selected values to the submit action.
4. In `ArticleService.submitForReview(id, reviewerId, reviewerDueDate, comment)`: set `article.reviewerId = reviewerId`, `article.reviewerDueDate = reviewerDueDate`, transition to IN_REVIEW, emit `ARTICLE_REVIEW_REQUESTED` event to `events` table with payload `{ articleId, reviewerId, reviewerDueDate, comment }`.
5. Article header in IN_REVIEW state: show a chip "Reviewer: [name] · Due [date]".
6. Notification: a notification service listener on `ARTICLE_REVIEW_REQUESTED` fires an in-app notification to the reviewer. If no in-app notification surface exists yet, log the event and leave the notification surface as a follow-up.

**Acceptance criteria**
- [ ] DRAFT→IN_REVIEW transition shows member picker and due-date picker.
- [ ] Submitting with a reviewer sets `reviewerId` and `reviewerDueDate` on the article.
- [ ] Article header shows reviewer name and due date in IN_REVIEW state.
- [ ] `ARTICLE_REVIEW_REQUESTED` event emitted to the events table with the reviewer's user ID and workspace ID.
- [ ] Unauthorized: only article author or workspace admin can assign a reviewer.
- [ ] Cross-tenant: reviewer must be a member of the same workspace (validated in service).

**Validation**
- Testcontainers IT: submit article for review with reviewerId → GET article → reviewerId and reviewerDueDate returned.
- Run app: click DRAFT badge → select IN_REVIEW → pick reviewer + due date → Confirm → header shows reviewer chip.

**Merge** — Branch: `feat/know-reviewer-assignment` · PR: `feat(knowledge): reviewer assignment and due date for article review`

---

### WI-KR-019 · Approval requirements
**Phase** P1 | **Effort** M | **Migration: V9X (article_approvals table)**  
**Rule books** RB-10 · RB-40

**Scope** — Space-level setting: N approvals required before Publish becomes active (default 1). Each reviewer independently Approves or Requests Changes. Badge on article shows "1/2 approved". Publish button activates only when required count reached.

**Analysis**
- New table `article_approvals`: `id, article_id, reviewer_id, workspace_id, decision (APPROVED/CHANGES_REQUESTED), comment, created_at`.
- Space-level setting: add `required_approvals INTEGER DEFAULT 1` to `knowledge_spaces` table (separate migration or combined).
- API: `POST /api/v1/articles/{id}/approvals` (body: `{ decision, comment }`); `GET /api/v1/articles/{id}/approvals`.
- Frontend: in IN_REVIEW state, assigned reviewers see "Approve" and "Request Changes" buttons. The article header shows "N/M approved" badge.
- When approval count reaches `space.required_approvals`, the Publish transition becomes available.

**Build**
1. Migration: `CREATE TABLE article_approvals (id UUID PK, article_id UUID FK, reviewer_id UUID, workspace_id UUID, decision VARCHAR(30), comment TEXT, created_at TIMESTAMPTZ); ALTER TABLE knowledge_spaces ADD COLUMN required_approvals INTEGER DEFAULT 1 NOT NULL;`. Add indexes on `article_id, workspace_id`.
2. `ArticleApproval` entity + `ArticleApprovalRepository` (workspace-scoped queries).
3. `ArticleApprovalService.approve(articleId, userId, decision, comment)`: RBAC check → upsert approval row → check if all required approvals met → if so, add `READY_TO_PUBLISH` marker (or just compute dynamically).
4. `ArticleController`: POST `/articles/{id}/approvals`, GET `/articles/{id}/approvals`.
5. Frontend: IN_REVIEW article header shows "Approve" / "Request Changes" buttons (visible to the assigned reviewer). Shows "N/M approved" badge for the author. Publish button in the transition popover is enabled only when approval count ≥ `space.requiredApprovals`.

**Acceptance criteria**
- [ ] Space setting `required_approvals = 2` requires two distinct reviewer approvals before Publish.
- [ ] Reviewer clicking "Approve" creates an approval row; badge updates to "1/2 approved".
- [ ] "Request Changes" creates an approval row with decision=CHANGES_REQUESTED; badge shows "Changes requested".
- [ ] Author cannot approve their own article.
- [ ] Publish button is disabled until required approvals are met.
- [ ] Cross-tenant: approval can only be added by a reviewer in the same workspace as the article.

**Validation**
- Testcontainers IT: POST approvals with required_approvals=2 → verify Publish not available after 1; available after 2.
- Run app: set space to require 2 approvals → submit for review → two users approve → Publish enables.

**Merge** — Branch: `feat/know-approvals` · PR: `feat(knowledge): article approval workflow with configurable reviewer count`

---

### WI-KR-020 · Scheduled publish
**Phase** P1 | **Effort** S | **Migration: V9X (scheduled_publish_at on articles)**  
**Rule books** RB-10 · RB-30

**Scope** — Date + time picker in the status transition popover when transitioning from IN_REVIEW to PUBLISHED. Sets `scheduled_publish_at`. A backend `@Scheduled` job publishes the article at that time. Badge shows "Publishing in X hours" while scheduled.

**Analysis**
- New column `scheduled_publish_at TIMESTAMP WITH TIME ZONE NULL` on `articles`.
- New `status` pseudo-state SCHEDULED (or reuse PUBLISHED as target with a `scheduled_publish_at` in the future; simpler). Decision: add a `SCHEDULED` status to the enum. Transition: IN_REVIEW → SCHEDULED (with date) → auto-transitions to PUBLISHED at the scheduled time.
- `@Scheduled(fixedDelay = 60000)` in `ArticleScheduledPublisher` service: query articles with `status=SCHEDULED AND scheduled_publish_at <= NOW()` (workspace-scoped); publish each; emit `ARTICLE_PUBLISHED` event.

**Build**
1. Migration: `ALTER TABLE articles ADD COLUMN scheduled_publish_at TIMESTAMP WITH TIME ZONE; ALTER TABLE articles ALTER COLUMN status TYPE VARCHAR(20);` — add 'SCHEDULED' as a valid value.
2. Add `SCHEDULED` to the status enum (or keep as string; check existing code pattern).
3. In transition popover for IN_REVIEW→PUBLISHED: add "Schedule for later" toggle. If toggled, show `<DateTimePicker>` and transition to SCHEDULED instead of PUBLISHED.
4. `ArticleService.schedulePublish(id, scheduledAt)`: validate `scheduledAt` is in the future; set status=SCHEDULED, set `scheduled_publish_at`.
5. `ArticleScheduledPublisher` (`@Component`): `@Scheduled(fixedDelay = 60000)` → query + publish due scheduled articles → emit events.
6. Frontend: SCHEDULED status badge shows "Scheduled · [datetime]" in amber; article header shows countdown "Publishing in X hours".
7. Cancel scheduled publish: clicking SCHEDULED badge → popover offers "Cancel schedule" → returns to IN_REVIEW.

**Acceptance criteria**
- [ ] DRAFT (or IN_REVIEW) → toggle "Schedule for later" → pick a time 1 hour from now → article status becomes SCHEDULED.
- [ ] Backend job publishes the article at the scheduled time (verify with a 1-minute-in-future schedule in a test).
- [ ] "Cancel schedule" returns the article to IN_REVIEW.
- [ ] `scheduled_publish_at` is stored in UTC; displayed in the user's local time on the frontend.
- [ ] Cross-tenant: scheduler queries are workspace-scoped.

**Validation**
- Testcontainers IT: set `scheduled_publish_at = NOW() + 5s` → run scheduler manually → article status becomes PUBLISHED.
- Run app: schedule a publish 1 hour from now → badge shows countdown → can cancel.

**Merge** — Branch: `feat/know-scheduled-publish` · PR: `feat(knowledge): scheduled article publish`

---

### WI-KR-021 · Article expiry / review-by date
**Phase** P1 | **Effort** S | **Migration: V9X (review_by_date on articles)**  
**Rule books** RB-10 · RB-30

**Scope** — "Review by" date field per article (editable in Properties panel — KR-011). Backend cron sets a `STALE` sub-status when the date passes without an update. Stale badge on article cards. Knowledge Health Dashboard (KR-096) aggregates stale articles.

**Analysis**
- New column `review_by_date DATE NULL` on `articles`.
- STALE is a display-computed state (not a separate DB enum status). Add a `stale` boolean computed column or a `stale` flag set by cron.
- Simpler: add `is_stale BOOLEAN DEFAULT FALSE` on articles; cron sets to true when `review_by_date < TODAY() AND status = PUBLISHED AND is_stale = FALSE`. Reset to false on article update.
- Combined with KR-009/KR-010 migration or its own.

**Build**
1. Migration: `ALTER TABLE articles ADD COLUMN review_by_date DATE; ADD COLUMN is_stale BOOLEAN DEFAULT FALSE NOT NULL;`.
2. `ArticleStaleMarker` `@Scheduled(cron = "0 0 6 * * *")`: query articles with `review_by_date < CURRENT_DATE AND status = 'PUBLISHED' AND is_stale = FALSE` (workspace-scoped); set `is_stale = true`; emit `ARTICLE_STALE` event per article.
3. Reset `is_stale = false` in `ArticleService` on any content/status update.
4. DTO: return `reviewByDate` and `isStale` fields.
5. Frontend: article cards show a `⚠ Stale` amber badge when `isStale=true`. Properties panel (KR-011) has an editable "Review by" date picker.
6. Existing analytics panel already shows "Stale" warning for articles >90 days since update — keep that; this WI adds the database-backed stale field.

**Acceptance criteria**
- [ ] Setting `review_by_date = yesterday` + running the cron marks the article as `is_stale=true`.
- [ ] Stale badge appears on the article card in the article list.
- [ ] Updating article content resets `is_stale=false`.
- [ ] `review_by_date` is editable in the Properties panel (KR-011 dependency — add to Properties panel if that WI is done; otherwise just via the API for now).
- [ ] Cross-tenant: stale marker cron queries are workspace-scoped.

**Validation**
- Testcontainers IT: set review_by_date = yesterday → run stale marker → article.isStale = true.
- Run app: set review-by to today's date - 1 day → trigger cron manually → stale badge appears.

**Merge** — Branch: `feat/know-article-expiry` · PR: `feat(knowledge): article review-by date and stale marker`

---

### WI-KR-022 · Duplicate / clone article
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-40

**Scope** — "Duplicate article" option in the article overflow (⋯) menu. Creates a copy of the article in the same space with DRAFT status, "(copy)" title suffix, all blocks preserved, and a fresh version history.

**Analysis**
- New endpoint: `POST /api/v1/articles/{id}/duplicate` → returns the new article DTO.
- Service: fetch source article → create a new `Article` with: `title = source.title + " (copy)"`, `status = DRAFT`, `contentBlocks = source.contentBlocks`, `content = source.content`, `contentFormat = source.contentFormat`, `templateType = source.templateType`, `spaceId = source.spaceId`, `parentId = null` (top-level copy), `versionNumber = 1`, new `id`, `createdAt = now()`.
- Option to include sub-articles: a query param `?includeChildren=true` recursively duplicates sub-articles. Default: false (simpler for P1).
- RBAC: must have `create_items` permission in the article's space.

**Build**
1. `ArticleController`: `POST /articles/{id}/duplicate` → calls `articleService.duplicate(id, currentUser)`.
2. `ArticleService.duplicate(sourceId, userId)`: fetch source (workspace-scoped 404 if not found or wrong tenant) → build new Article → save → emit `ARTICLE_CREATED` event → return new article DTO.
3. Frontend: in article overflow menu, add "Duplicate". On click, call API, then navigate to the new draft article.
4. After duplication, show a brief toast: "Duplicate created — you are now editing the copy."

**Acceptance criteria**
- [ ] Duplicating an article creates a new DRAFT with "(copy)" in the title and identical blocks.
- [ ] The original article is unchanged.
- [ ] The new article has `versionNumber = 1` (clean history).
- [ ] Unauthorized: users without `create_items` permission receive 403.
- [ ] Cross-tenant: source article from another workspace returns 404, not 403 (do not reveal existence).

**Validation**
- Testcontainers IT: POST /articles/{id}/duplicate → new article returned with title ending "(copy)" and status DRAFT.
- Run app: open any article → overflow menu → Duplicate → navigates to new draft.

**Merge** — Branch: `feat/know-duplicate-article` · PR: `feat(knowledge): duplicate/clone article`

---

### WI-KR-023 · Suggestions mode (track changes)
**Phase** P2 | **Effort** XL | **Migration: V9X (article_suggestions table)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — "Suggest changes" toggle in the editor. In suggestions mode, block edits are stored as pending suggestions (not applied directly). Article author sees colored diffs (insertions green, deletions red). Accept / Reject per suggestion.

**Analysis**
- This is the most complex WI in the roadmap. Full implementation requires: a suggestions data model, diff computation, inline diff UI, and accept/reject flow.
- Data model: `article_suggestions` table: `id, article_id, block_id, workspace_id, suggester_id, original_content, suggested_content, status (PENDING/ACCEPTED/REJECTED), created_at`.
- When suggestions mode is active: block edits go to `articleService.createSuggestion(articleId, blockId, newContent)` instead of `updateArticle`.
- Diff display: use `diff-match-patch` (Google, Apache 2.0 license) to compute character-level diffs. Render as inline `<ins>` (green) and `<del>` (red) in the block.
- Accept: apply the suggestion's `suggested_content` to the block. Reject: discard. Both update suggestion status.

**Build**
1. Migration: `CREATE TABLE article_suggestions (id UUID PK, article_id UUID FK NOT NULL, block_id VARCHAR(50) NOT NULL, workspace_id UUID NOT NULL, suggester_id UUID NOT NULL, original_content TEXT, suggested_content TEXT NOT NULL, status VARCHAR(20) DEFAULT 'PENDING', created_at TIMESTAMPTZ DEFAULT NOW())`.
2. Backend: `SuggestionController` + `SuggestionService` — create, list (by article, workspace-scoped), accept, reject endpoints.
3. Frontend: `suggestionMode` boolean state in BlockEditor. Toggle via a "Suggest" / "Editing" button in the block toolbar.
4. In suggestion mode: block `onChange` → call `createSuggestion` API instead of `updateBlock`.
5. `SuggestionDiffView.jsx`: for each block with pending suggestions, show diff-match-patch diffs with `<ins>` and `<del>` markers. Accept / Reject buttons per suggestion.
6. Suggestion count badge in the article header: "3 pending suggestions".

**Acceptance criteria**
- [ ] "Suggest" toggle visible in editor toolbar for users who don't own the article.
- [ ] In suggestion mode, editing a paragraph creates a suggestion row; the block content is NOT directly changed.
- [ ] Author sees the diff inline (green insertions, red deletions) with Accept / Reject buttons.
- [ ] Accepting applies `suggested_content` to the block and marks suggestion ACCEPTED.
- [ ] Rejecting marks it REJECTED without changing the block.
- [ ] Cross-tenant: suggestions only visible within the article's workspace.

**Validation**
- Testcontainers IT: create suggestion → list suggestions for article → accept it → GET article → block content updated.
- Run app: enable Suggest mode → edit a block → author sees diff → Accept → block updated.

**Merge** — Branch: `feat/know-suggestions` · PR: `feat(knowledge): track-changes suggestion mode for block editor`

---

### WI-KR-024 · Content health score
**Phase** P2 | **Effort** L | **No migration needed (AI Control Plane output)**  
**Rule books** RB-10 · RB-30 · RB-40 (AI Control Plane)

**Scope** — AI-computed (Haiku tier) 0–100 content health score displayed as a ring gauge in the article analytics panel. Score based on: completeness vs template type's expected sections, freshness (days since update), readability grade (from KR-013), broken references, and block diversity. Deterministic fallback: rule-based heuristics only.

**Analysis**
- AI Control Plane: `POST /api/v1/knowledge/ai/content-health` → accepts article content + template type → returns `{ score: 75, tips: ['Missing Rollback section', '3 headings with no sub-content'] }`. Haiku tier (classification task). Cached by article_id + version_number (don't re-run if unchanged).
- Fallback (if AI off): compute rule-based score: `freshness=30pts (1pt per day below 30 days stale), completeness=30pts (section count / expected section count), readability=20pts (100-fleschGrade*5), blockDiversity=20pts (block type count / 8)`. Sum to 100.
- Display: `<HealthScoreGauge score={score} tips={tips} />` — an SVG arc gauge. In the analytics side panel (existing panel).

**Build**
1. Backend: `KnowledgeAiService.computeHealthScore(article, workspaceId)` → call AI Control Plane with a structured prompt; parse response as `{ score, tips }`; cache result keyed by `(article.id, article.versionNumber)` in the existing AI response cache.
2. Fallback: `HealthScoreHeuristic.compute(article)` — rule-based formula above. Used when AI is off or budget exceeded.
3. New endpoint: `GET /api/v1/articles/{id}/health` → returns `{ score, tips, source: 'ai'|'heuristic' }`. Workspace-scoped, RBAC-gated.
4. Frontend: in the analytics side panel (existing `articlePanel === 'analytics'` section), add `<HealthScoreGauge>`.
5. `HealthScoreGauge.jsx`: SVG arc, colored: 80–100 green, 50–79 amber, 0–49 red. Shows score number in the center. Tips list below.

**Acceptance criteria**
- [ ] Analytics panel shows health score gauge with a 0–100 value.
- [ ] Tips list shows actionable improvement suggestions.
- [ ] `source: 'heuristic'` returned when AI is off (toggle AI off at workspace level → gauge still shows a score).
- [ ] Score is cached per (article_id, version_number); re-request within 1 minute returns the cached value without a new AI call.
- [ ] AI audit log records the call (timestamp, model tier, tokens).
- [ ] Cross-tenant: health endpoint 404s for articles not in the requester's workspace.

**Validation**
- Unit test: `HealthScoreHeuristic.compute(article)` returns a value between 0 and 100 for any input.
- Testcontainers IT: GET /articles/{id}/health with AI mocked → score returned; with AI off → heuristic source.
- Run app: open analytics panel → health gauge visible with score and tips.

**Merge** — Branch: `feat/know-health-score` · PR: `feat(knowledge): AI-powered content health score in analytics panel`

---

## Layer 4 — Comments & annotations
> References: Google Docs · Notion · Confluence · Linear comments  
> Stack surface: `knowledge-view.jsx`, `article_comments` table (existing), new `article_block_comments` table

---

### WI-KR-025 · Block-level comment threads
**Phase** P0 | **Effort** L | **Migration: V9X (article_block_comments table)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Every block in the article has a comment thread. A comment icon appears on block hover (edit mode) or always-visible (read mode). Clicking opens a comments panel anchored to the block. Comments stored in new `article_block_comments` table. Replies covered by KR-027.

**Analysis**
- Existing `article_comments` table stores article-level comments. Block-level comments are separate — anchored to a `block_id`.
- New table: `article_block_comments (id UUID PK, article_id UUID FK, block_id VARCHAR(50) NOT NULL, workspace_id UUID NOT NULL, author_id UUID NOT NULL, content TEXT NOT NULL, resolved BOOLEAN DEFAULT FALSE, parent_id UUID NULL, metadata JSONB, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`.
- API: `GET /api/v1/articles/{id}/block-comments?blockId={blockId}`, `POST`, `PATCH /{commentId}` (edit/resolve).
- Each block wrapper shows a `MessageSquare` icon on hover. Icon shows unresolved comment count. Clicking opens a right-side comments pane.

**Build**
1. Migration: CREATE TABLE with indexes on `(article_id, block_id)` and `(workspace_id)`.
2. `ArticleBlockComment` entity + `ArticleBlockCommentRepository` (workspace-scoped).
3. `ArticleBlockCommentService`: `createComment`, `listByBlock`, `resolveComment`, `editComment` — RBAC `view_items` for read, `view_items` for write (comment is a view-level action).
4. `ArticleBlockCommentController`: REST endpoints.
5. `BlockCommentBubble.jsx`: on block hover in edit mode / always in read mode. Unresolved count badge.
6. `BlockCommentsPanel.jsx`: right-side drawer; comment list; new comment textarea + Post button; Edit / Resolve buttons on own comments.

**Acceptance criteria**
- [ ] Every block shows a comment bubble; clicking opens the panel anchored to that block.
- [ ] Posting a comment creates a row with the correct `block_id`.
- [ ] Resolving a comment sets `resolved=true`; hidden by default, shown with "Show resolved" toggle.
- [ ] Unauthorized: 403 on all comment endpoints for users without article read access.
- [ ] Cross-tenant: `workspace_id` scoping enforced.

**Validation**
- Testcontainers IT: POST comment on block → GET by blockId → returned; PATCH resolve → `resolved=true`.
- Run app: hover a block → bubble; click → type comment → Post → appears in panel.

**Merge** — Branch: `feat/know-block-comments` · PR: `feat(knowledge): block-level comment threads`

---

### WI-KR-026 · Text-selection inline comments
**Phase** P0 | **Effort** L | **No new migration (uses article_block_comments.metadata)**  
**Rule books** RB-10 · RB-30

**Scope** — Selecting text in a paragraph/callout/quote block in read mode shows a "Comment" button in the selection toolbar (KR-002). Posts a comment with `metadata: { selectionStart, selectionEnd, selectedText }`. The text range is highlighted in read mode while the comment is unresolved.

**Analysis**
- Depends on KR-025 (block comments table already has `metadata JSONB`) and KR-002 (selection toolbar).
- Highlighting: in `BlockRenderer.jsx`, for text-bearing blocks, split content at `selectionStart/selectionEnd` and wrap the range in `<mark class="bg-yellow-200/60">` for each unresolved inline comment.
- Multiple overlapping ranges: merge before rendering.

**Build**
1. `SelectionToolbar.jsx` "Comment" button: calls `onInlineComment({ blockId, start, end, selectedText })`.
2. `knowledge-view.jsx` handler: opens `BlockCommentsPanel` pre-filled; POSTs with metadata.
3. `BlockRenderer.jsx`: for each block with inline comments (metadata.selectionStart set), inject `<mark>` spans at the right positions using a text-split helper.
4. Clicking a highlighted range opens the comments panel scrolled to that comment.

**Acceptance criteria**
- [ ] Selecting text in read mode shows "Comment" button in the selection toolbar.
- [ ] After posting, the selected text has a yellow `<mark>` highlight in read mode.
- [ ] Resolving the comment removes the highlight.
- [ ] Multiple inline comments on the same block all highlight their ranges.

**Validation**
- Vitest: render BlockRenderer with block having inline comment at chars 5-10 → `<mark>` wraps those chars.
- Run app: select text in read mode → Comment → post → yellow highlight appears.

**Merge** — Branch: `feat/know-inline-comments` · PR: `feat(knowledge): text-selection inline comment highlights`

---

### WI-KR-027 · Threaded replies
**Phase** P0 | **Effort** M | **No new migration (parent_id already in article_block_comments)**  
**Rule books** RB-30

**Scope** — Comments in `BlockCommentsPanel` can have threaded replies using the existing `parent_id` FK. "Reply" button under each root comment. Replies indented `ml-8` with `border-l-2 border-neutral-200`. Depth capped at 1 (replies cannot have sub-replies).

**Build**
1. Validate `parentId` in service: must reference a root comment (parentId IS NULL) in same article + workspace.
2. `BlockCommentsPanel.jsx`: group flat list into `{ root, replies[] }[]` by `parentId`.
3. Root comment: "Reply" button → inline sub-textarea.
4. Submit reply: POST with `parentId`.
5. "Show N more replies" collapse when >3 replies.
6. Resolving root also resolves all replies.

**Acceptance criteria**
- [ ] Replies render indented below parent.
- [ ] Depth 1 only: no Reply button on child comments.
- [ ] >3 replies collapse with "Show N more".
- [ ] Resolving root resolves all replies.

**Validation**
- Testcontainers IT: POST root → POST reply with parentId → GET block comments → reply nested under root.
- Run app: reply to a comment → indented reply appears.

**Merge** — Branch: `feat/know-threaded-replies` · PR: `feat(knowledge): threaded comment replies`

---

### WI-KR-028 · @mention in comments & blocks
**Phase** P0 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Typing `@` in a comment textarea or block content (text-bearing blocks in edit mode) triggers a workspace member picker dropdown. Selecting a member inserts `@username`. Backend parses comment content on save and emits `ARTICLE_MENTION` event per mentioned member.

**Build**
1. `MentionPicker.jsx`: `<Combobox>` overlay filtering `/api/v1/members` by typed query. Triggered on `@` at word boundary; closes on Escape or selection.
2. Wire into comment textarea and block content textareas.
3. Backend: regex `/@(\w+)/g` on comment content → lookup member → emit `ARTICLE_MENTION` event.
4. Render mentions: `<span class="text-brand-orange font-medium">@username</span>`.

**Acceptance criteria**
- [ ] `@` in comment opens member picker; selecting inserts `@username`.
- [ ] `ARTICLE_MENTION` event emitted per mentioned member.
- [ ] Picker only shows members of the requester's workspace.
- [ ] Mentions render in brand-orange.

**Validation**
- Testcontainers IT: POST comment with `@validuser` → ARTICLE_MENTION event in events table.
- Run app: type `@` in comment → picker; select → `@name` inserted.

**Merge** — Branch: `feat/know-mentions` · PR: `feat(knowledge): @mention in comments and block content`

---

### WI-KR-029 · Reactions on comments & articles
**Phase** P1 | **Effort** S | **Migration: V9X (article_reactions table)**  
**Rule books** RB-10 · RB-30

**Scope** — Emoji reactions (👍 ❤️ 😂 🎉 😮 👀) on articles and individual block comments. Toggle: clicking an existing reaction removes it. One reaction per emoji per user per target. Shown as emoji+count chips.

**Build**
1. Migration: `article_reactions (id UUID PK, workspace_id UUID, user_id UUID, target_type VARCHAR(20), target_id UUID, emoji VARCHAR(10), created_at TIMESTAMPTZ)`. Unique index on `(workspace_id, user_id, target_id, emoji)`.
2. `ArticleReactionService.toggle(...)` upsert/delete pattern.
3. `ArticleReactionController`: POST + DELETE.
4. GET endpoints: include `reactions: [{ emoji, count, reactedByMe }]` in DTOs.
5. `ReactionBar.jsx`: chips + `+` button opening 6-emoji picker.

**Acceptance criteria**
- [ ] Clicking 👍 adds reaction; second click removes it.
- [ ] Two users can both react with 👍 → count shows 2.
- [ ] Cross-tenant: reactions scoped to workspace.

**Validation**
- Testcontainers IT: POST reaction → GET → count 1; POST same emoji again → auto-delete → count 0.
- Run app: click 👍 on article → chip; click again → removed.

**Merge** — Branch: `feat/know-reactions` · PR: `feat(knowledge): emoji reactions on articles and comments`

---

### WI-KR-030 · Comment digest notifications
**Phase** P1 | **Effort** M | **No new migration**  
**Rule books** RB-10 · RB-40

**Scope** — Authors and article watchers (KR-067) receive a daily digest of unread comments. Digest emitted as a `COMMENT_DIGEST` event to the events table. Workspace-level setting: Off / Daily / Weekly (stored in workspace settings JSONB).

**Build**
1. `CommentDigestScheduler` `@Scheduled(cron = "0 0 8 * * *")`: query `article_block_comments` created in last 24h per workspace with `daily` digest setting → group by article → find author + watchers → emit `COMMENT_DIGEST` event per recipient.
2. `WorkspaceSettingsService.getKnowledgeCommentDigestFrequency(workspaceId)`.
3. Frontend: Knowledge space settings → "Comment digest" dropdown (Off / Daily / Weekly).

**Acceptance criteria**
- [ ] `off` suppresses events; `daily` emits at 08:00 UTC.
- [ ] `COMMENT_DIGEST` event has `{ recipientId, articles: [{id, title, newCommentCount}] }`.
- [ ] Scheduler queries workspace-scoped.

**Validation**
- Testcontainers IT: seed comments → call `commentDigestScheduler.digest()` manually → event in events table.

**Merge** — Branch: `feat/know-comment-digest` · PR: `feat(knowledge): daily comment digest notifications`

---

### WI-KR-031 · Comment draft auto-save
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-30

**Scope** — Comment textareas auto-save to `localStorage` keyed by `(articleId, blockId)`. Draft restored on panel reopen. "Draft · saved X ago" chip. "Clear draft" button. Drafts older than 7 days cleared on load.

**Build**
1. `useCommentDraft(articleId, blockId)` hook: reads/writes `know_comment_draft_${articleId}_${blockId}` with `{ content, savedAt }`.
2. In `BlockCommentsPanel.jsx`: use hook for new-comment textarea; debounced 800ms save; clear on submit.
3. Show draft chip + clear button.

**Acceptance criteria**
- [ ] Draft persists across panel close/reopen.
- [ ] Submit clears draft.
- [ ] Drafts >7 days cleared on load.

**Validation**
- Vitest: setDraft → unmount → remount → draft returned.
- Run app: type comment → close panel → reopen → draft pre-filled.

**Merge** — Branch: `feat/know-comment-draft` · PR: `feat(knowledge): comment draft auto-save to localStorage`

---

### WI-KR-032 · External reviewer comments
**Phase** P2 | **Effort** M | **Migration: V9X (article_review_tokens table)**  
**Rule books** RB-10 · RB-40

**Scope** — Generate a time-limited share link (7-day expiry) for external reviewers. The link shows the article in read-only mode with a restricted block-commenting surface. External comments tagged `external=true`. Token validated on a public controller (no auth required).

**Build**
1. Migration: `article_review_tokens (id UUID PK, article_id UUID, workspace_id UUID, created_by UUID, token VARCHAR(64) UNIQUE, expires_at TIMESTAMPTZ, used_count INTEGER DEFAULT 0)`. Also: `ALTER TABLE article_block_comments ADD COLUMN external BOOLEAN DEFAULT FALSE, ADD COLUMN reviewer_name VARCHAR(100)`.
2. `ArticleReviewTokenService`: `generateToken` (64-char random), `validateToken`.
3. `PublicArticleController` (no auth filter): GET article by token; POST external comment.
4. Token generation in article overflow menu → copy URL.
5. `/review?token=xxx` route: read-only article; prompts for reviewer name on first access (localStorage); comment bubbles post-only.
6. Internal view: external comments show `[External · ReviewerName]` badge.

**Acceptance criteria**
- [ ] External URL shows read-only article without auth.
- [ ] External comment saved with `external=true` and `reviewer_name`.
- [ ] Token expired → 410 Gone.
- [ ] Rate-limited: 20 req/min per token.
- [ ] Cross-tenant: token validates against article's workspace.

**Validation**
- Testcontainers IT: generate token → GET public article → 200; POST external comment → saved with external=true; expired token → 410.
- Run app: Share for review → incognito → enter name → post comment → visible internally.

**Merge** — Branch: `feat/know-external-review` · PR: `feat(knowledge): external reviewer share links with time-limited tokens`

---

## Layer 5 — Navigation & organization
> References: Notion · Confluence · Linear  
> Stack surface: `knowledge-view.jsx`, `knowledge-spaces-view.jsx`, new sidebar components

---

### WI-KR-033 · Persistent page tree sidebar
**Phase** P0 | **Effort** L | **Migration: V9X (sort_order on articles if missing)**  
**Rule books** RB-30 · RB-10

**Scope** — Notion-style collapsible page tree in the left panel of the Know section. Spaces at top level; articles and sub-articles below. Drag-to-reorder within the same parent. Icon + title per item. Collapsed/expanded state persists in localStorage.

**Analysis**
- New endpoint `GET /api/v1/knowledge-spaces/{id}/tree` returns nested `ArticleTreeNode[]` (depth-limited to 4).
- `sort_order INTEGER DEFAULT 0` column on articles (add in migration if absent).
- Drag-to-reorder: HTML5 draggable → `PUT /api/v1/articles/{id}` with updated `sort_order`.
- Virtual scrolling not needed for P0 (<200 articles per space).

**Build**
1. Migration (if needed): `ALTER TABLE articles ADD COLUMN sort_order INTEGER DEFAULT 0`.
2. `GET /api/v1/knowledge-spaces/{id}/tree` endpoint.
3. `PageTreeSidebar.jsx`: recursive `<PageTreeNode>` components. Collapsed state in `useLocalStorage`.
4. Drag-to-reorder using HTML5 draggable API; on drop → call reorder endpoint.
5. "New article" button at bottom of each space section.
6. Active article highlighted.

**Acceptance criteria**
- [ ] Tree shows all spaces with article hierarchies collapsed by default.
- [ ] Collapsed/expanded persists in localStorage.
- [ ] Active article highlighted.
- [ ] Drag-to-reorder persists after reload.
- [ ] Tree fetches only the active workspace's data.

**Validation**
- Testcontainers IT: GET /knowledge-spaces/{id}/tree → correct nested structure.
- Run app: expand/collapse nodes; drag to reorder; reload → state preserved.

**Merge** — Branch: `feat/know-page-tree` · PR: `feat(knowledge): persistent collapsible page tree sidebar`

---

### WI-KR-034 · Tags / labels
**Phase** P1 | **Effort** M | **Migration: V9X (knowledge_tags + article_tags tables)**  
**Rule books** RB-10 · RB-30

**Scope** — Workspace-scoped color-coded tags on articles. Tag management in space settings. Tag filter in article list. Tags in Properties panel (KR-011) and article cards.

**Build**
1. Migration: `knowledge_tags (id UUID PK, workspace_id UUID, name VARCHAR(50), color VARCHAR(20), created_by UUID, created_at TIMESTAMPTZ)` + `article_tags (article_id UUID, tag_id UUID, PRIMARY KEY(article_id, tag_id))`.
2. `KnowledgeTagService` + CRUD controller + assign/remove controller.
3. Article DTO: include `tags: [{id, name, color}]`.
4. `TagSelector.jsx`: chip list + `+` chip for new tag.
5. `TagFilter` multi-select in article list header.

**Acceptance criteria**
- [ ] Create / rename / delete workspace tags with color.
- [ ] Applying a tag saves the row and shows chip on article card.
- [ ] Tag filter narrows article list.
- [ ] Deleting a tag cascades to `article_tags`.
- [ ] Cross-tenant scoped.

**Validation**
- Testcontainers IT: create tag → assign to article → GET article → tags array populated.
- Run app: create "Policy" tag → apply → filter → only tagged articles shown.

**Merge** — Branch: `feat/know-tags` · PR: `feat(knowledge): workspace-scoped article tags`

---

### WI-KR-035 · Starred / favorites
**Phase** P1 | **Effort** S | **Migration: V9X (article_stars table)**  
**Rule books** RB-10 · RB-30

**Scope** — Per-user article starring. "Starred" section in the page tree sidebar. `StarButton` on article cards and header.

**Build**
1. Migration: `article_stars (user_id UUID, article_id UUID, workspace_id UUID, starred_at TIMESTAMPTZ, PRIMARY KEY(user_id, article_id))`.
2. `ArticleStarService.toggle(...)` + controller: POST star, DELETE star, GET starred.
3. Article DTO: `starredByMe: boolean`.
4. `StarButton.jsx` + "Starred" section in `PageTreeSidebar.jsx` (KR-033).

**Acceptance criteria**
- [ ] Clicking star toggles starred/unstarred per-user.
- [ ] "Starred" section lists the user's starred articles.
- [ ] Star state independent per user.
- [ ] Deleting an article cascades star rows.

**Validation**
- Testcontainers IT: POST star → GET starred → article in list; DELETE → absent.
- Run app: star article → Starred section; unstar → removed.

**Merge** — Branch: `feat/know-stars` · PR: `feat(knowledge): article starred/favorites`

---

### WI-KR-036 · Recently viewed
**Phase** P1 | **Effort** S | **No migration needed (client-side localStorage)**  
**Rule books** RB-30

**Scope** — "Recently viewed" section in the page tree sidebar showing the last 10 articles opened. Stored in localStorage keyed by `(workspaceId, userId)`. Cleared on logout. Deduplication; most recent first.

**Build**
1. `useRecentArticles(workspaceId, userId)` hook: reads/writes `know_recent_${workspaceId}_${userId}` → `[{ articleId, title, spaceId, icon, viewedAt }]`.
2. On `selectedArticle` change in `knowledge-view.jsx`: `addRecent(selectedArticle)`.
3. "Recently viewed" section in `PageTreeSidebar.jsx` showing up to 5; "See all" for 10.
4. `clearAll()` on logout.

**Acceptance criteria**
- [ ] Opening an article adds it to Recently viewed (most recent first, deduplicated).
- [ ] Up to 10 articles shown.
- [ ] Cleared on logout.
- [ ] Different workspaces independent.

**Validation**
- Vitest: addRecent x3 → getRecent() returns in recency order.
- Run app: open 5 articles → section shows 5 most recent.

**Merge** — Branch: `feat/know-recently-viewed` · PR: `feat(knowledge): recently viewed articles in sidebar`

---

### WI-KR-037 · Space home page
**Phase** P1 | **Effort** L | **Migration: V9X (home_article_id on knowledge_spaces)**  
**Rule books** RB-10 · RB-30

**Scope** — Designated "home" article per space. Opening a space auto-navigates to the home article. "Set as space home" option in article overflow. Home article shown with a house icon in the page tree.

**Build**
1. Migration: `ALTER TABLE knowledge_spaces ADD COLUMN home_article_id UUID REFERENCES articles(id) ON DELETE SET NULL`.
2. `KnowledgeSpaceService.setHomeArticle(spaceId, articleId, workspaceId)`.
3. `PUT /api/v1/knowledge-spaces/{id}` extended with `homeArticleId`.
4. Article overflow menu: "Set as space home".
5. `knowledge-view.jsx`: on space selected, auto-navigate to `space.homeArticleId` if set, else show welcome empty state with "Set a home page" CTA.
6. Home article node shows `<Home>` icon in page tree.

**Acceptance criteria**
- [ ] Setting home article persists `knowledge_spaces.home_article_id`.
- [ ] Clicking space name opens home article.
- [ ] House icon on home article in page tree.
- [ ] No home set → welcome empty state shown.
- [ ] `homeArticleId` must belong to the same space (service validation).

**Validation**
- Testcontainers IT: PUT space with homeArticleId → GET space → homeArticleId returned.
- Run app: set space home → click space name → opens home article.

**Merge** — Branch: `feat/know-space-home` · PR: `feat(knowledge): space home page designation`

---

### WI-KR-038 · Bulk operations
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30

**Scope** — Multi-select articles via checkboxes in the article list. Bulk action bar: Move to Space, Apply Tag, Archive, Delete. Confirm modal for destructive actions. Shift+click for range select.

**Build**
1. `selectedArticleIds: Set<string>` state in `knowledge-view.jsx`. Checkboxes on article rows (shown on hover).
2. `BulkActionBar.jsx`: appears when `selectedArticleIds.size > 0`. Actions: Move (space picker), Apply Tag (tag picker), Archive (confirm), Delete (confirm with "cannot be undone").
3. Backend: `POST /api/v1/articles/bulk-archive { ids }` and `POST /api/v1/articles/bulk-delete { ids }` — workspace-scoped, RBAC-gated.
4. Move and tag done client-side via `Promise.all`.

**Acceptance criteria**
- [ ] Checkboxes on article rows; bulk bar appears on select.
- [ ] Archive bulk-archives all selected.
- [ ] Delete shows confirm modal; confirming deletes.
- [ ] RBAC: bulk-delete 403 without `delete_items`.
- [ ] Cross-tenant: IDs from other workspaces silently skipped.

**Validation**
- Testcontainers IT: POST bulk-archive 3 IDs → all status=ARCHIVED.
- Run app: select 3 → Archive → all archived.

**Merge** — Branch: `feat/know-bulk-ops` · PR: `feat(knowledge): bulk operations on articles`

---

### WI-KR-039 · Article moves across spaces
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30

**Scope** — "Move to..." option in article overflow menu. Space picker within the workspace. Moves the article + all descendants recursively (recursive CTE UPDATE). Emits `ARTICLE_MOVED` event. RBAC: edit permission in both source and target spaces.

**Build**
1. `ArticleService.moveToSpace(articleId, newSpaceId, userId, workspaceId)`: recursive CTE `UPDATE articles SET space_id = :newSpaceId WHERE id = :id OR id IN (WITH RECURSIVE children AS ...)`. Emit event.
2. `POST /api/v1/articles/{id}/move { spaceId }`.
3. Article overflow "Move to..." → `<SpacePicker>` popover → confirm → call API → refresh page tree.

**Acceptance criteria**
- [ ] Move article + all sub-articles to target space.
- [ ] `ARTICLE_MOVED` event emitted.
- [ ] Cannot move to a space in another workspace.
- [ ] RBAC: requires edit in both spaces.

**Validation**
- Testcontainers IT: POST move → article + children have new space_id; event in events table.
- Run app: move article → disappears from source space; appears in target.

**Merge** — Branch: `feat/know-move-article` · PR: `feat(knowledge): move articles and sub-articles across knowledge spaces`

---

### WI-KR-040 · Backlinks pane
**Phase** P2 | **Effort** M | **Migration: V9X (article_links table)**  
**Rule books** RB-10 · RB-30

**Scope** — "Backlinks" tab in the article side panel listing all articles that link to the current article. Links detected by parsing `bookmark` blocks on save. Count badge on the tab.

**Build**
1. Migration: `CREATE TABLE article_links (source_article_id UUID NOT NULL, target_article_id UUID NOT NULL, workspace_id UUID NOT NULL, PRIMARY KEY(source_article_id, target_article_id))`. Index on `(target_article_id, workspace_id)`.
2. `ArticleLinkExtractor`: on `ArticleService.save`, parse `contentBlocks` for bookmark blocks whose URL matches another article's URL pattern → upsert into `article_links`.
3. `GET /api/v1/articles/{id}/backlinks` → query `article_links` for `target_article_id = id`.
4. Frontend: "Backlinks" tab in article side panel; list of source articles; count badge.

**Acceptance criteria**
- [ ] Article A with bookmark block to article B → B's Backlinks shows A.
- [ ] Backlinks update on article save.
- [ ] Scoped to workspace. Deleting A cascades its `article_links` rows.

**Validation**
- Testcontainers IT: save article A with bookmark URL = article B → GET B backlinks → A returned.
- Run app: bookmark link to article → save → target's Backlinks tab shows source.

**Merge** — Branch: `feat/know-backlinks` · PR: `feat(knowledge): backlinks pane`

---

## Layer 6 — Search & discovery
> References: Elasticsearch · Algolia · Notion AI Search · Confluence  
> Stack surface: `knowledge-view.jsx`, new search endpoints, PostgreSQL full-text search

---

### WI-KR-041 · Full-text search across content
**Phase** P0 | **Effort** L | **Migration: V9X (tsvector / text_content column + GIN index)**  
**Rule books** RB-10 · RB-40

**Scope** — Cross-article full-text search within the workspace. Search bar in Know section header (`Ctrl+K`). Results: article title, space name, excerpt. Uses PostgreSQL `tsvector` GIN index. Tenant-scoped.

**Analysis**
- Add `text_content TEXT` maintained via `@PrePersist/@PreUpdate` in the `Article` entity: `title + ' ' + content`. Create GIN index: `CREATE INDEX idx_articles_fts ON articles USING GIN(to_tsvector('english', coalesce(text_content,'')))`.
- API: `GET /api/v1/articles/search?q={query}&spaceId={optional}` using `WHERE workspace_id = :wid AND to_tsvector(@@ plainto_tsquery)`. Return `ts_headline` excerpts.

**Build**
1. Migration: add `text_content TEXT` column + GIN index.
2. `Article` entity `@PrePersist/@PreUpdate`: set `textContent = title + ' ' + coalesce(content,'')`.
3. `ArticleSearchService.search(query, workspaceId, spaceId)`.
4. `ArticleSearchController`: `GET /api/v1/articles/search`.
5. Frontend: search bar in Know header; on type (300ms debounce) call API; dropdown shows results.

**Acceptance criteria**
- [ ] Searching a word in article title or content returns that article.
- [ ] Results scoped to requesting user's workspace only.
- [ ] Empty query returns empty result, no error.
- [ ] `spaceId` filter narrows results.

**Validation**
- Testcontainers IT: index article with "Kubernetes deployment" → search "kubernetes" → article returned.
- Run app: search bar → type keyword → matching articles in dropdown.

**Merge** — Branch: `feat/know-search` · PR: `feat(knowledge): full-text article search with PostgreSQL GIN index`

---

### WI-KR-042 · Search result excerpts
**Phase** P0 | **Effort** S | **No new migration (extends KR-041)**  
**Rule books** RB-30

**Scope** — Search results include highlighted excerpts via PostgreSQL `ts_headline`. Matching terms wrapped in `<mark>`. Rendered safely via DOMPurify (allow `<mark>` only).

**Build**
1. Extend `ArticleSearchService` SELECT with `ts_headline('english', text_content, query, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2')`.
2. `ArticleSearchResult` DTO: add `excerpt: String`.
3. Frontend: `dangerouslySetInnerHTML` with `DOMPurify.sanitize(excerpt, { ALLOWED_TAGS: ['mark'] })`.
4. `<mark>` styled: `bg-brand-orange/20 text-brand-orange font-medium rounded`.

**Acceptance criteria**
- [ ] Excerpts show ~50 words of context with matching term highlighted.
- [ ] `<mark>` is the only HTML tag rendered; all others stripped.
- [ ] XSS: `<script>` in article content does not execute in excerpt.

**Validation**
- Testcontainers IT: search "kubernetes" → `excerpt` contains `<mark>Kubernetes</mark>`.
- Run app: search → result shows highlighted excerpt.

**Merge** — Branch: `feat/know-search-excerpts` · PR: `feat(knowledge): highlighted excerpts in search results`

---

### WI-KR-043 · Advanced search filters
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — "Advanced" toggle expands filter row: Space (multi-select), Author (member picker), Status (chips), Created date range, Updated date range, Tags. Filters passed as query params. Filter state reflected in URL.

**Build**
1. Add query params to `ArticleSearchController`: `status[]`, `authorId[]`, `spaceId[]`, `tagId[]`, `createdFrom`, `createdTo`, `updatedFrom`, `updatedTo`.
2. `ArticleSearchService.search(query, filters, workspaceId)`: dynamic WHERE clause.
3. `SearchFiltersRow.jsx`: visible when "Advanced" toggle on. Each filter component. "Clear all" button. State persisted to URL query params.

**Acceptance criteria**
- [ ] Status=PUBLISHED filter returns only published articles.
- [ ] Combined filters apply in AND logic.
- [ ] Filter state in URL (shareable).
- [ ] "Clear all" resets all filters.

**Validation**
- Testcontainers IT: search with `status=PUBLISHED` → only PUBLISHED returned.
- Run app: Advanced → Status=DRAFT → only drafts shown.

**Merge** — Branch: `feat/know-search-filters` · PR: `feat(knowledge): advanced search filters`

---

### WI-KR-044 · AI semantic search
**Phase** P1 | **Effort** M | **No migration needed (uses existing /api/v1/ai/kb/ask)**  
**Rule books** RB-10 · RB-40

**Scope** — "AI" mode toggle in the search bar. In AI mode, query sent to existing `/api/v1/ai/kb/ask` RAG endpoint. Response: AI-synthesised answer + citation cards above keyword results. Fallback to keyword search when AI is off. `AiMetaBadge` shows source.

**Build**
1. `SearchModeToggle.jsx`: Keyword | AI segmented control (localStorage-persisted).
2. AI mode: call `/api/v1/ai/kb/ask?q={query}&workspaceId={wid}` on submit; render `<SearchAIAnswer>`.
3. `SearchAIAnswer.jsx`: answer paragraph + "Sources" citation cards + `AiMetaBadge`.
4. Fallback display: "AI unavailable — keyword results shown instead" when `source = keyword_fallback`.

**Acceptance criteria**
- [ ] AI mode shows synthesised answer above keyword results.
- [ ] Citations link to source articles.
- [ ] AI off → fallback message shown.
- [ ] `AiMetaBadge` reflects ai/cached/fallback.

**Validation**
- Vitest: mock AI endpoint → render in AI mode → `<SearchAIAnswer>` renders.
- Run app: AI mode → ask question → answer + citations appear.

**Merge** — Branch: `feat/know-ai-search` · PR: `feat(knowledge): AI semantic search with citation cards`

---

### WI-KR-045 · Related articles recommendations
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — "Related" section in article analytics panel: 3–5 AI (Haiku, embedding similarity) or fallback keyword-overlap articles. Cached per `(articleId, versionNumber)`. `GET /api/v1/articles/{id}/related`.

**Build**
1. `ArticleRelatedService.findRelated(articleId, workspaceId)`: AI path (Control Plane embedding similarity) or fallback (keyword overlap FTS query against same-space articles).
2. `ArticleController`: GET /articles/{id}/related.
3. Frontend: "Related" tab in analytics panel. Up to 5 clickable article chips.

**Acceptance criteria**
- [ ] Shows 3–5 related articles when AI on.
- [ ] Fallback shows keyword-similar articles when AI off.
- [ ] Scoped to workspace. "No related articles" empty state.

**Validation**
- Testcontainers IT: GET /articles/{id}/related with AI mocked → list; with AI off → fallback list.
- Run app: analytics panel → Related tab → articles listed.

**Merge** — Branch: `feat/know-related-articles` · PR: `feat(knowledge): related articles recommendations`

---

### WI-KR-046 · Content knowledge graph
**Phase** P2 | **Effort** M | **No migration needed (uses article_links from KR-040)**  
**Rule books** RB-30 · RB-10

**Scope** — Force-directed graph view of article connections (backlinks + shared tags). `GET /api/v1/knowledge-spaces/{id}/graph`. D3.js force simulation. Hover tooltip; click → navigate. Cap at 200 nodes.

**Build**
1. `KnowledgeGraphController`: GET graph endpoint — query `article_links` for backlink edges; pairs sharing a tag for `shared_tag` edges.
2. `KnowledgeGraphView.jsx`: D3 force simulation on SVG canvas. Nodes colored by space. Backlinks = solid edges; shared tags = dashed.
3. Hover tooltip: title + status + tags. Click → navigate.
4. "Graph" button in Know header opens as full-panel overlay.

> ⚠️ Confirm D3.js (v7, BSD-3) or react-force-graph (MIT) license acceptance per RB-10 §9 before adding.

**Acceptance criteria**
- [ ] Graph shows article nodes and backlink / shared-tag edges.
- [ ] Hover shows title + status; click navigates.
- [ ] Scoped to workspace.
- [ ] Empty space → "No connections yet" message.

**Validation**
- Testcontainers IT: GET graph with linked articles → nodes and edges returned.
- Run app: Graph view → nodes render; hover → tooltip; click → navigate.

**Merge** — Branch: `feat/know-graph` · PR: `feat(knowledge): knowledge graph view`

---

### WI-KR-047 · Popular & trending section
**Phase** P2 | **Effort** S | **No migration needed (uses events table)**  
**Rule books** RB-30 · RB-10

**Scope** — Top 5 articles by view count in the last 7 days on the space home page. Computed from `ARTICLE_VIEWED` events. 1-hour cache. `GET /api/v1/knowledge-spaces/{id}/trending`.

**Build**
1. Ensure `ARTICLE_VIEWED` event is emitted in `ArticleService.getById`.
2. `TrendingArticlesService.getTopArticles(workspaceId, limit)`: query events table; cache 1h.
3. `GET /api/v1/knowledge-spaces/{id}/trending`.
4. `SpaceHomePage.jsx`: "Trending this week" subsection with view count.

**Acceptance criteria**
- [ ] Top 5 articles by 7-day view count shown on space home.
- [ ] Scoped to workspace.
- [ ] 1-hour cache on repeated requests.

**Validation**
- Testcontainers IT: emit 10 ARTICLE_VIEWED for A, 2 for B → GET trending → A first.
- Run app: open space home → "Trending" section visible.

**Merge** — Branch: `feat/know-trending` · PR: `feat(knowledge): trending articles on space home page`

---

### WI-KR-048 · Saved search views
**Phase** P2 | **Effort** M | **Migration: V9X (saved_searches table)**  
**Rule books** RB-10 · RB-30

**Scope** — Save a named search (query + filters) accessible from the page tree sidebar. "Save search" button appears when search is active. Running a saved search restores the query + filters.

**Build**
1. Migration: `saved_searches (id UUID PK, workspace_id UUID, user_id UUID, name VARCHAR(100), query TEXT, filters JSONB, created_at TIMESTAMPTZ)`.
2. `SavedSearchService` + `SavedSearchController`: GET/POST/DELETE.
3. "Save search" button in `SearchBar.jsx` (visible when active query or filters).
4. "Saved searches" section in `PageTreeSidebar.jsx`; click → populate + run search; `×` → delete.

**Acceptance criteria**
- [ ] "Save search" visible when active query/filters.
- [ ] Saved search appears in sidebar; click runs the stored query + filters.
- [ ] Delete removes from sidebar.
- [ ] Per-user (other users don't see them).

**Validation**
- Testcontainers IT: POST saved-search → GET → item returned for that user; different user → not returned.
- Run app: search "runbook" → save as "My runbooks" → sidebar link; click → search runs.

**Merge** — Branch: `feat/know-saved-searches` · PR: `feat(knowledge): saved search views in knowledge sidebar`

---

## Layer 7 — Data surface
> References: Notion Database · Excel · Airtable · Google Sheets  
> Stack surface: `BlockEditor.jsx`, `BlockRenderer.jsx`, existing `sheet` and `chart` block types

---

### WI-KR-049 · Database block — multi-view
**Phase** P1 | **Effort** XL | **Migration: V9X (knowledge_databases + knowledge_db_rows tables)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — New `database` block type. A database is a structured table of rows with typed columns (text, number, date, select, multi-select, person, URL, checkbox). Multiple views per database: Table, Board (kanban by select column), Gallery, List. View switcher in the block header.

**Analysis**
- The existing `sheet` block is a spreadsheet (formula grid). A `database` block is more like Notion's database — typed columns, multiple views, filters, relations. These are different.
- Backend: `knowledge_databases (id UUID PK, article_id UUID, workspace_id UUID, name VARCHAR(100), schema JSONB /* [{ id, name, type, options }] */, created_at TIMESTAMPTZ)` and `knowledge_db_rows (id UUID PK, database_id UUID, workspace_id UUID, data JSONB /* {columnId: value} */, sort_order INTEGER, created_at TIMESTAMPTZ)`.
- API: CRUD for databases and rows under `/api/v1/knowledge/databases` and `/api/v1/knowledge/databases/{id}/rows`.
- Effort is XL because it introduces an entirely new data model and four view renderers.

**Build**
1. Migration: both tables above. Indexes on `(article_id, workspace_id)` and `(database_id, workspace_id)`.
2. `KnowledgeDatabase` + `KnowledgeDbRow` entities + repositories.
3. `KnowledgeDatabaseService`: CRUD for databases; CRUD for rows (workspace-scoped, RBAC `view_items` + `edit_items`).
4. `KnowledgeDatabaseController`: REST endpoints.
5. Frontend `DatabaseBlock.jsx`: renders the database in the chosen view. View switcher toolbar: Table | Board | Gallery | List.
6. `DatabaseTableView.jsx`: column headers + sortable rows. Inline edit on cell click. "Add row" button.
7. `DatabaseBoardView.jsx`: columns = distinct values of the select-type "group by" column. Cards are rows; drag between columns updates the select value.
8. `DatabaseGalleryView.jsx`: card grid; first text column as title; first URL/image column as thumbnail.
9. `DatabaseListView.jsx`: simple ordered list of rows showing the primary text column.
10. Column type editors: text (`<input type="text">`), number (`<input type="number">`), date (`<DatePicker>`), select (inline dropdown), checkbox, URL, person (member picker).
11. "Add column" button: name + type picker.

**Acceptance criteria**
- [ ] Creating a `database` block in an article persists a `knowledge_databases` row.
- [ ] Adding rows creates `knowledge_db_rows` rows with JSONB data.
- [ ] All four views (Table, Board, Gallery, List) render correctly.
- [ ] Inline cell editing updates `knowledge_db_rows.data` via PATCH.
- [ ] Board view drag-and-drop updates the grouped select column value.
- [ ] RBAC: `edit_items` required to add/edit rows; `view_items` for read.
- [ ] Cross-tenant: database and row endpoints 404 for other workspaces.

**Validation**
- Testcontainers IT: create database → add 3 rows → GET rows → returned; PATCH row data → updated.
- Run app: insert database block → add columns → add rows → switch to Board view → drag row between columns.

**Merge** — Branch: `feat/know-database-block` · PR: `feat(knowledge): database block with multi-view (table, board, gallery, list)`

---

### WI-KR-050 · Database relations
**Phase** P1 | **Effort** L | **No new migration (extends knowledge_databases schema JSONB)**  
**Rule books** RB-10 · RB-30

**Scope** — A "Relation" column type in a database block that links rows to rows in another database within the same workspace (or work items from the existing `work_items` table). Relations stored as arrays of IDs in the row's JSONB data for the relation column.

**Analysis**
- Depends on KR-049 (database block).
- Relation column definition: `{ id, name, type: 'relation', relatedDatabaseId: uuid }` in the database schema.
- Row value for a relation column: `{ columnId: [rowId1, rowId2] }`.
- Bi-directional: when A relates to B, B's related database gains a "rollup" of A's references. Implementation for P1: unidirectional only (simplest).
- Work-item relations: relation column can also point to `work_items` table by setting `relatedDatabaseId = 'work_items'`. Rows store work item IDs.

**Build**
1. Relation column type: add `type: 'relation'` and `relatedDatabaseId: string` to column type options in `KnowledgeDatabaseService`.
2. `KnowledgeDatabaseRelationService.resolveRelations(databaseId, columnId, rowIds, workspaceId)`: fetch the related rows (or work items) by IDs, workspace-scoped.
3. Frontend: relation cell renders linked chips (related row titles). Clicking a chip opens the related row in a side panel. "Link existing" picker searches related database rows.
4. Work-item relation: `relatedDatabaseId = 'work_items'` → chip shows work item code + title; click navigates to work item detail.

**Acceptance criteria**
- [ ] Adding a relation column to a database persists `type: 'relation'` in the schema.
- [ ] Row relation cell shows chips for linked rows.
- [ ] Clicking a chip opens the related row (or work item).
- [ ] Relation picker searches and links existing rows in the related database.
- [ ] Cross-tenant: related database must be in the same workspace.

**Validation**
- Testcontainers IT: create relation column pointing to database B → add row A with relationValue=[rowB.id] → resolve → rowB returned.
- Run app: add relation column → link a row → chip appears; click → related row opens.

**Merge** — Branch: `feat/know-db-relations` · PR: `feat(knowledge): database relation column type`

---

### WI-KR-051 · Database filters / sorts / groups
**Phase** P1 | **Effort** M | **No new migration**  
**Rule books** RB-30 · RB-10

**Scope** — Filter, sort, and group-by controls in the database block header. Filters: column + operator + value (multi-condition, AND logic). Sort: column + asc/desc. Group by: select column (used by Board view — KR-049 already does this). Filter/sort state stored in `block.metadata.viewState` JSONB.

**Analysis**
- Depends on KR-049.
- Filter/sort logic: executed client-side (all rows loaded) for databases up to 500 rows. Server-side for larger databases — add query params to the rows endpoint for P2 scale.
- `viewState`: `{ activeView: 'table', filters: [{ columnId, operator, value }], sorts: [{ columnId, direction }], groupBy: columnId }`.

**Build**
1. `DatabaseFilterBar.jsx`: "Filter" + "Sort" + "Group by" buttons in database block header. Each opens a popover.
2. Filter popover: add condition rows (column selector + operator + value input). "And" logic between conditions.
3. Sort popover: column + Ascending/Descending toggle. Multiple sorts ordered.
4. Group by: dropdown of select-type columns (only). Applies to Board view.
5. Apply filters/sorts client-side using a `filterAndSort(rows, viewState)` function.
6. Save `viewState` to `block.metadata.viewState` via `updateBlock`.

**Acceptance criteria**
- [ ] Adding a filter "Name contains 'bug'" hides rows where Name does not match.
- [ ] Multiple filters combine with AND logic.
- [ ] Sort by a number column descending reorders the table.
- [ ] Group by a select column switches the board view grouping.
- [ ] Filter/sort state persists after save/reload (stored in block metadata).

**Validation**
- Vitest: `filterAndSort(rows, { filters: [{ columnId: 'status', op: 'eq', value: 'Open' }] })` → only Open rows returned.
- Run app: add filter → table narrows; sort → reordered; save → reload → filter still active.

**Merge** — Branch: `feat/know-db-filters` · PR: `feat(knowledge): database block filters, sorts, and group-by`

---

### WI-KR-052 · Enhanced Sheet block
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — Upgrade the existing `sheet` block with: column resize (drag header divider), row height toggle (compact / normal / tall), freeze first row (header row), cell type detection (number, date, text) for right-alignment and formatting, keyboard navigation (Tab, Shift+Tab, arrow keys between cells), and copy-paste range support.

**Analysis**
- The existing `sheet` block renders a grid. Enhancements are all frontend-only changes to the sheet editor component (`SheetBlockEditor.jsx` or equivalent in BlockEditor.jsx).
- Column widths stored in `block.metadata.columnWidths: { [colIndex]: number }`.
- Row height stored in `block.metadata.rowHeight: 'compact'|'normal'|'tall'`.
- Frozen header: `block.metadata.freezeHeader: boolean`.

**Build**
1. Column resize: drag handle on column header boundary. On mouseup → update `metadata.columnWidths[colIndex]`. Apply width as `width: {px}` on each cell in the column.
2. Row height toggle: button in sheet block toolbar cycling compact (24px) / normal (36px) / tall (52px). Stored in metadata.
3. Freeze header: toggle in toolbar. When enabled, the `<thead>` gets `position: sticky; top: 0; z-index: 1`.
4. Cell type auto-detection: if all non-empty values in a column are numeric, right-align the column (`text-align: right`) and format numbers with locale commas.
5. Keyboard navigation: Tab → next cell in row; Shift+Tab → previous; Enter → next row same column; arrow keys → move focus. Implement via `onKeyDown` on cell inputs and a `focusedCell: [row, col]` state.
6. Copy-paste range: `onCopy` captures the selected range to clipboard as tab-delimited text. `onPaste` parses tab-delimited text and fills cells from the pasted position.

**Acceptance criteria**
- [ ] Dragging a column header border resizes the column; width persists after reload.
- [ ] Row height toggle cycles through compact / normal / tall.
- [ ] Freeze header: first row sticks to top when scrolling a tall sheet.
- [ ] Numeric columns right-aligned with formatted values.
- [ ] Tab / arrow key navigation moves focus between cells.
- [ ] Copy a 2×3 range → paste elsewhere → cells filled correctly.

**Validation**
- Vitest: render sheet with all-numeric column → column header has `text-align: right` computed style.
- Run app: open sheet block → drag column header → resize visible; Tab through cells → focus moves.

**Merge** — Branch: `feat/know-sheet-enhanced` · PR: `feat(knowledge): enhanced sheet block with resize, freeze, keyboard nav`

---

### WI-KR-053 · Enhanced Chart block
**Phase** P2 | **Effort** L | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — Upgrade the existing `chart` block with: 6 chart types (bar, line, pie, donut, scatter, area), a chart configuration panel (X-axis, Y-axis, series, color, legend toggle, title), live preview as config changes, and responsive rerender on block width change.

**Analysis**
- The existing chart block uses an internal chart component. This WI extends the configuration options, adds new types, and makes the config panel more user-friendly.
- Chart types beyond bar/line/pie require the underlying chart library to support them. Confirm existing library (Recharts? Chart.js?) supports scatter and area.
- Configuration stored in `block.metadata.chartConfig: { type, title, xAxis, yAxis, series, showLegend, colors }`.

**Build**
1. `ChartConfigPanel.jsx`: a right-side panel (appears when chart block is in edit mode). Fields: Chart type (icon grid of 6), Title (text), X-axis (column selector from block.content rows), Y-axis (column selector + aggregation: sum/avg/count), Series (optional — for multi-series), Color palette (5 preset palettes), Legend toggle.
2. Add scatter and area chart renderers (if library supports — extend existing chart component).
3. Responsive: use `ResizeObserver` on the chart container; re-render chart when container width changes by >20px.
4. Live preview: `useDeferredValue` or debounced update so the chart re-renders 200ms after config change.

**Acceptance criteria**
- [ ] All 6 chart types (bar, line, pie, donut, scatter, area) render correctly.
- [ ] Config panel changes reflect in the chart live (with 200ms debounce).
- [ ] Legend toggle shows/hides the chart legend.
- [ ] Chart re-renders responsively when the block container is resized.
- [ ] Config persists in `block.metadata.chartConfig` after save.

**Validation**
- Vitest: render chart block with `chartConfig.type = 'pie'` → pie chart SVG rendered.
- Run app: switch chart type → chart updates; resize window → chart reflows.

**Merge** — Branch: `feat/know-chart-enhanced` · PR: `feat(knowledge): enhanced chart block with 6 types and config panel`

---

### WI-KR-054 · Pivot table block
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New `pivot` block type. Takes BQL query data (reuses the existing `bqlwidget` data pipeline) and renders a 2D pivot table: row dimension, column dimension, and measure (COUNT/SUM/AVG). Configurable via a settings panel.

**Analysis**
- Reuses the existing server-side pivot resolver `POST /api/v1/widget-data/pivot` (already used by `bqlwidget` blocks).
- `pivot` block metadata: `{ bqlQuery: string, rowDimension: string, colDimension: string, measure: 'COUNT'|'SUM'|'AVG', measureField: string }`.
- Frontend renders an HTML table with sticky header row and first column. Grand totals in the last row/column.

**Build**
1. Add `pivot` to `TOOLBAR_GROUPS` (Data section).
2. `PivotBlockEditor.jsx`: BQL query textarea + row/col dimension selectors + measure selector. "Run" button.
3. On run: POST to `/api/v1/widget-data/pivot` with the config → returns `{ dimensions, measures, rows }`.
4. `PivotBlockRenderer.jsx`: renders the 2D HTML table. Sticky header and first column via CSS. Grand total row + column computed on the frontend.
5. Empty state: "No data returned by the query."

**Acceptance criteria**
- [ ] A BQL query with row + col dimensions renders a 2D pivot table.
- [ ] Grand total row and column computed correctly.
- [ ] Sticky header row and first column in a scrollable pivot.
- [ ] Empty query returns empty state gracefully.
- [ ] Workspace-scoped: pivot endpoint enforces `workspaceId`.

**Validation**
- Vitest: render `<PivotBlockRenderer data={mockPivotData} />` → table cells match expected pivot values.
- Run app: insert pivot block → enter BQL → Run → 2D table rendered.

**Merge** — Branch: `feat/know-pivot-block` · PR: `feat(knowledge): pivot table block type`

---

### WI-KR-055 · Live data refresh on BQL widgets
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10 · RB-40

**Scope** — BQL widget blocks (and pivot blocks) can be set to auto-refresh at 30s / 1m / 5m / 15m intervals. A "Refresh" icon button in the block header triggers an immediate refresh. Last-refreshed timestamp shown. The SSE `/realtime/stream` channel notifies when relevant data changes.

**Build**
1. `block.metadata.refreshInterval: null | 30 | 60 | 300 | 900` (seconds). A settings dropdown in the BQL widget block toolbar.
2. `useAutoRefresh(blockId, intervalSeconds, fetchFn)` hook: runs `fetchFn` on mount and every `intervalSeconds`. Tracks `lastRefreshedAt`.
3. "Refresh" button in block header (icon: `RefreshCw` from lucide) — triggers `fetchFn()` immediately, spins the icon for 500ms.
4. SSE: listen on `realtime/stream` for events matching the BQL query's entity type (e.g., `WORK_ITEM_UPDATED`). On matching event, trigger a refresh (debounced 2s to batch rapid events).
5. Last-refreshed timestamp: `text-xs text-neutral-400 "Updated 30s ago"` in block footer.

**Acceptance criteria**
- [ ] Auto-refresh interval setting persists in block metadata.
- [ ] With 30s interval: block data refreshes every 30 seconds.
- [ ] "Refresh" button triggers immediate refresh with spinning icon feedback.
- [ ] Last-refreshed timestamp updates after each refresh.
- [ ] SSE event triggers refresh when relevant data changes (debounced).

**Validation**
- Vitest: mock `fetchFn`; mount `useAutoRefresh` with 30s interval; advance timers 30s → `fetchFn` called once.
- Run app: set 30s interval → wait 30s → chart updates with fresh data.

**Merge** — Branch: `feat/know-live-refresh` · PR: `feat(knowledge): live auto-refresh for BQL widget and pivot blocks`

---

### WI-KR-056 · Embedded dashboard block
**Phase** P2 | **Effort** L | **No migration needed**  
**Rule books** RB-30 · RB-10 · RB-40

**Scope** — An `embedded_dashboard` block type that embeds an entire bSmart dashboard (from the main Dashboards section) inside a Knowledge article. The dashboard renders at reduced scale with all its BQL widgets live. Read-only in the article context.

**Analysis**
- Depends on KR-055 (live refresh) for widget data.
- Dashboard data: reuse the existing `GET /api/v1/dashboards/{id}` endpoint to fetch the dashboard's widget layout and config. Render the dashboard widgets inside the block.
- `block.metadata.dashboardId: string`.
- Security: the embedded dashboard is subject to the same RBAC as a regular dashboard view — the requester must have access to the referenced dashboard. Validate server-side.

**Build**
1. Add `embedded_dashboard` to block types and `TOOLBAR_GROUPS` (a "Connect" group if one exists, otherwise Data).
2. `EmbeddedDashboardBlock.jsx`: fetches dashboard by `metadata.dashboardId` → renders a scaled grid of widgets (same widget components used in the dashboard view, at 70% scale via CSS `transform: scale(0.7)`).
3. Dashboard picker popover: searchable list of dashboards the user has access to, when inserting the block.
4. Live refresh: each embedded widget refreshes at its configured interval (reuses KR-055 hook).
5. Read-only: no edit controls on embedded widgets.

**Acceptance criteria**
- [ ] Inserting an `embedded_dashboard` block and selecting a dashboard renders the dashboard widgets.
- [ ] Widgets are live (BQL data fetched and refreshed per KR-055 intervals).
- [ ] Dashboard is read-only in the article context.
- [ ] RBAC: embedding a dashboard the user doesn't have access to returns 403 from the dashboard endpoint.
- [ ] Cross-tenant: `dashboardId` must belong to the same workspace.

**Validation**
- Testcontainers IT: GET /dashboards/{id} with valid user → dashboard returned; with unauthorized → 403.
- Run app: embed a dashboard → widgets render in the article with live data.

**Merge** — Branch: `feat/know-embedded-dashboard` · PR: `feat(knowledge): embedded dashboard block in articles`

---

## Layer 8 — Design & visual surface
> References: Miro · MS Whiteboard · Lucid · Figma  
> Stack surface: `BlockEditor.jsx`, `BlockRenderer.jsx`, existing `whiteboard` and `mermaid` blocks

---

### WI-KR-057 · Whiteboard shapes library
**Phase** P1 | **Effort** L | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — Expand the existing `whiteboard` block's sticky-notes-only canvas to a full shapes library: rectangles, rounded rectangles, circles/ellipses, diamonds, parallelograms, triangles, cylinders, cloud shapes, plus text-only boxes. Shapes are draggable, resizable (corner handles), and support fill color + border color + text label.

**Analysis**
- Current whiteboard block: sticky notes on an SVG canvas (drag, resize, color). Shapes are an extension of the existing data model.
- `whiteboard` block content: `{ elements: [{ id, type: 'sticky'|'rect'|'circle'|'diamond'|..., x, y, width, height, fillColor, borderColor, label, fontSize }] }`.
- No schema change needed — extends the existing JSONB content structure.
- Shapes rendered as SVG `<rect>`, `<circle>`, `<polygon>`, etc. Resizable via drag handles on corners/edges.
- Shape insertion: toolbar at the top of the whiteboard canvas (icon buttons for each shape type).

**Build**
1. Extend `WhiteboardElement` type definitions: add `type` values for each shape.
2. Shape renderers in `WhiteboardCanvas.jsx` (or equivalent): SVG element per shape type. Text label overlaid as `<foreignObject>` with an editable `<div contenteditable>`.
3. Resize handles: 8 handles (corners + edge midpoints) visible on selection. Dragging updates `width/height` (and repositions accordingly for centered shapes).
4. Shape toolbar above the canvas: icon buttons for each type. Clicking a tool → next click on canvas inserts the shape at cursor position.
5. Color pickers: fill color (preset palette from brand tokens) + border color. Applied to the selected shape.
6. Keyboard shortcuts: `R` = rect, `C` = circle, `D` = diamond, `T` = text box, `Esc` = deselect/back to pointer tool.

**Acceptance criteria**
- [ ] Each shape type (rect, circle, diamond, parallelogram, triangle, cylinder, cloud, text box) inserts correctly on the canvas.
- [ ] Shapes are draggable within the canvas bounds.
- [ ] Resizing via corner handles updates width/height and persists on save.
- [ ] Text labels editable by double-clicking a shape.
- [ ] Fill and border color pickers use brand token colors only.
- [ ] Keyboard shortcuts `R`, `C`, `D`, `T` activate the correct tool.

**Validation**
- Vitest: render WhiteboardCanvas with a rect element → SVG `<rect>` present with correct dimensions.
- Run app: open whiteboard block → click Circle tool → click canvas → circle appears; drag → moves; resize → bigger.

**Merge** — Branch: `feat/know-whiteboard-shapes` · PR: `feat(knowledge): shapes library for whiteboard block`

---

### WI-KR-058 · Connector lines
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-30

**Scope** — Connector lines between whiteboard elements (shapes, stickies). Hover a shape → connection point dots appear on edge midpoints. Drag from a dot to another element creates a connector line. Connectors: straight, elbow (right-angle), curved. Arrowhead options: none, open, filled.

**Analysis**
- Depends on KR-057 (shapes).
- Connector element: `{ id, type: 'connector', fromId, toId, fromAnchor: 'top'|'right'|'bottom'|'left', toAnchor, style: 'straight'|'elbow'|'curved', arrowEnd: 'none'|'open'|'filled', label: string }`.
- SVG rendering: `<path>` or `<line>` connecting from-anchor midpoint to to-anchor midpoint. Elbow: right-angle SVG path. Curved: cubic Bézier.
- Reconnecting: dragging an arrowhead to a different element updates `toId/toAnchor`.
- Connectors move with their connected elements (derived positions on render).

**Build**
1. Extend whiteboard element types to include `connector`.
2. On shape hover: show 4 anchor dots (top/right/bottom/left edge midpoints) in CSS.
3. Drag from anchor dot: draw a preview line following the cursor. On mouseup over another shape → create connector element.
4. `ConnectorRenderer.jsx`: SVG `<path>` for each connector, computing `d` attribute from fromAnchor → toAnchor positions.
5. Connector toolbar (appears when connector is selected): style picker (straight/elbow/curved) + arrowhead picker + label input.

**Acceptance criteria**
- [ ] Hovering a shape shows 4 anchor dots.
- [ ] Dragging from a dot to another shape creates a connector line.
- [ ] Connector moves when either connected shape moves.
- [ ] Style (straight/elbow/curved) and arrowhead toggles work.
- [ ] Double-clicking a connector allows editing its label.

**Validation**
- Vitest: render whiteboard with two shapes and one connector → SVG `<path>` present connecting the two shapes.
- Run app: hover shape → drag from anchor to another shape → connector appears.

**Merge** — Branch: `feat/know-whiteboard-connectors` · PR: `feat(knowledge): connector lines between whiteboard elements`

---

### WI-KR-059 · Whiteboard zoom / pan / snap
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-30

**Scope** — Whiteboard canvas supports zoom (Ctrl+scroll or pinch-to-zoom), pan (middle-mouse drag or Space+drag), and snap-to-grid (optional grid toggle). Zoom range 25%–400%. Zoom indicator and reset button.

**Analysis**
- Depends on KR-057 (whiteboard canvas).
- Zoom/pan as CSS transform on the canvas container: `transform: scale(zoom) translate(panX, panY)`.
- Canvas coordinate mapping: mouse events must translate screen coords to canvas coords: `canvasX = (screenX - containerRect.left) / zoom - panX`.
- Snap-to-grid: when enabled, dragged elements snap to 8px grid (`Math.round(x / 8) * 8`).

**Build**
1. `zoom` and `pan: { x, y }` state in the whiteboard block component.
2. `onWheel` (with Ctrl): `zoom = clamp(zoom * (1 - delta * 0.001), 0.25, 4)`.
3. Pinch: `onTouchMove` two-finger pinch → compute scale from touch distance change.
4. Pan: `onMouseDown` with middle button (button=1) or Space+left: set `isPanning = true`; `onMouseMove` updates pan.
5. Coordinate mapping helper: all element position reads/writes go through `screenToCanvas(x, y, zoom, pan)`.
6. Zoom indicator: `text-xs` badge "75%" bottom-right of canvas. "Fit all" button (scales to fit all elements in view).
7. Grid toggle: button in canvas toolbar. When on, draw SVG grid lines (`<defs><pattern>` approach). Snap enabled when grid is on.

**Acceptance criteria**
- [ ] Ctrl+scroll zooms in/out within 25%–400%.
- [ ] Space+drag pans the canvas.
- [ ] Elements retain their correct positions after zoom/pan (coordinate mapping correct).
- [ ] Zoom indicator shows current zoom %.
- [ ] "Fit all" button scales/pans to show all elements.
- [ ] Grid toggle shows/hides grid lines; when on, element placement snaps to 8px grid.

**Validation**
- Vitest: render whiteboard, simulate Ctrl+wheel → zoom state changes from 1 to ~1.1.
- Run app: Ctrl+scroll → canvas zooms; Space+drag → canvas pans; elements stay in position.

**Merge** — Branch: `feat/know-whiteboard-zoom` · PR: `feat(knowledge): whiteboard zoom, pan, and snap-to-grid`

---

### WI-KR-060 · Mind map block
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New `mindmap` block type. A tree-structured radial diagram: a central idea with child nodes, grandchild nodes, etc. Add/edit/delete nodes inline. Rendered as an SVG tree layout. Keyboard-first: Tab adds a child, Enter adds a sibling, Delete removes.

**Analysis**
- Mind map data: `{ root: { id, text, children: [MindMapNode...] } }` stored as block content JSON.
- Layout algorithm: a simple radial tree layout (distribute children at equal angles). Or a right-to-left tree (like Excalidraw's mind map). Implement a simple top-down tree layout for P1 (easier to implement; radial for a follow-up).
- Top-down tree: left child subtree on the left side, right child subtree on the right side of the root (mind map convention). Actually, simplest: a right-branching tree (root left, children cascade right).
- SVG lines connect parent to child nodes with Bézier curves.

**Build**
1. Add `mindmap` to block types and toolbar (Visual / Diagram group).
2. `MindMapBlock.jsx`: state = `MindMapNode` tree. Insert mode: click "+" on a node adds a child node.
3. `MindMapLayout(root)`: computes `{ x, y }` for each node using a simple recursive tree layout algorithm (fixed vertical spacing, width based on label length).
4. `MindMapRenderer.jsx` (read mode): SVG output, nodes as rounded rects, edges as Bézier `<path>`.
5. `MindMapEditor.jsx` (edit mode): same SVG with editable `<foreignObject>` inputs on nodes.
6. Keyboard: focused node + Tab → add child; Enter → add sibling; Delete → remove node (with children); arrow keys → navigate between nodes.

**Acceptance criteria**
- [ ] `/mindmap` slash command inserts a mind map block with a central root node.
- [ ] Clicking `+` on a node adds a child; it's immediately editable.
- [ ] Tab adds a child, Enter adds a sibling, Delete removes the selected node.
- [ ] Tree layout recomputes when nodes are added/removed.
- [ ] Read mode renders the mind map as a clean SVG tree.
- [ ] Data persists in block content JSON after save.

**Validation**
- Vitest: `MindMapLayout({ id: 'root', text: 'A', children: [{ id: '1', text: 'B', children: [] }] })` → root has y < child y (root above child).
- Run app: insert mindmap → add nodes → save → reload → mind map intact.

**Merge** — Branch: `feat/know-mindmap` · PR: `feat(knowledge): mind map block type`

---

### WI-KR-061 · Flowchart builder
**Phase** P2 | **Effort** L | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — A `flowchart` block type: drag-and-drop flowchart builder with standard ANSI flowchart shapes (process, decision, start/end, input/output, connector). Shapes connect with directional arrows. Auto-layout (top-down) option. Export to Mermaid syntax.

**Analysis**
- Depends on KR-057 (whiteboard shapes) and KR-058 (connectors). The flowchart builder is a specialized configuration of the whiteboard canvas with flowchart-specific shapes and auto-layout.
- Flowchart shapes: process (rectangle), decision (diamond), start/end (stadium/pill), input/output (parallelogram), connector (small circle).
- Auto-layout: arrange shapes in a top-down flow based on connector graph. Use a simple Sugiyama-style layer assignment (simplified): topological sort → assign layer → center each layer horizontally.
- Mermaid export: generate `graph TD` Mermaid syntax from the element graph.

**Build**
1. `FlowchartBlock.jsx`: a specialized whiteboard canvas pre-loaded with the flowchart shape palette.
2. Shape palette: 5 flowchart shapes as icon buttons; clicking → activates insert tool.
3. Reuse KR-057 shape renderer and KR-058 connector renderer.
4. Auto-layout button: calls `autoLayoutFlowchart(elements)` — topological sort + layer assignment → updates x/y positions.
5. "Export to Mermaid" button: calls `flowchartToMermaid(elements)` → puts Mermaid code in a code block or clipboard.

**Acceptance criteria**
- [ ] Inserting a `flowchart` block shows the flowchart shape palette.
- [ ] All 5 flowchart shapes are insertable and connectable.
- [ ] Auto-layout arranges shapes top-down in a readable flow.
- [ ] "Export to Mermaid" generates valid `graph TD` Mermaid syntax.
- [ ] Flowchart data persists in block content JSON.

**Validation**
- Vitest: `flowchartToMermaid([start, process, decision, end], [connectors])` → valid Mermaid string.
- Run app: build a flowchart → Auto-layout → neat top-down arrangement; Export → Mermaid code shown.

**Merge** — Branch: `feat/know-flowchart` · PR: `feat(knowledge): flowchart builder block type`

---

### WI-KR-062 · Math / LaTeX block
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New `math` block type. A textarea for LaTeX math syntax (e.g., `E = mc^2`, `\sum_{i=1}^{n} x_i`). Rendered as beautiful math using KaTeX (MIT license). Inline math also supported inside paragraph blocks via `$...$` syntax.

**Build**
1. Add `katex` to `works-frontend/package.json` (MIT, confirm per RB-10 §9).
2. Add `math` to block types and toolbar (Visual group).
3. `MathBlock.jsx` (edit): a `<textarea>` for LaTeX input + live preview below. Error display if KaTeX throws.
4. `MathBlockRenderer.jsx` (read): `katex.renderToString(content, { throwOnError: false, displayMode: true })` → `dangerouslySetInnerHTML` after DOMPurify (allowlist KaTeX output tags: `<span>`, `<svg>`, `<math>`).
5. Inline math in paragraphs: detect `$...$` in paragraph content during `renderMd` and pass inner content through `katex.renderToString` with `displayMode: false`.

**Acceptance criteria**
- [ ] Inserting a math block and typing `E = mc^2` → KaTeX renders the formula.
- [ ] `\frac{a}{b}` renders as a proper fraction.
- [ ] Invalid LaTeX shows an error message (not a crash).
- [ ] Inline `$E=mc^2$` in a paragraph renders inline math.
- [ ] KaTeX output is sanitized; no XSS possible.

**Validation**
- Vitest: render `<MathBlockRenderer content="E = mc^2" />` → contains a `<span class="katex">` element.
- Run app: insert math block → type `\int_0^\infty e^{-x} dx` → rendered formula shown.

**Merge** — Branch: `feat/know-math-block` · PR: `feat(knowledge): math/LaTeX block type via KaTeX`

---

### WI-KR-063 · Rich embed block
**Phase** P2 | **Effort** S | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New `embed` block type. Paste any URL (YouTube, Loom, Figma, Google Maps, Typeform, Spotify, GitHub Gist) — the block auto-detects the provider and renders an embed. Falls back to a link card if the URL is not embeddable. URL allow-listed against a safe provider list.

**Analysis**
- Security: only allow-listed domains can be embedded as iframes. Maintain `EMBED_PROVIDERS = [{ pattern: /youtube\.com|youtu\.be/, embedUrl: (url) => buildYouTubeEmbedUrl(url) }, ...]`.
- Non-matching URLs → fall back to `<BookmarkBlockRenderer>` (link card with title + description from OG tags).
- OG tag fetching: `GET /api/v1/knowledge/link-preview?url={url}` (existing or new; check if the `bookmark` block already has this).

**Build**
1. `EMBED_PROVIDERS` array in `src/lib/embed-providers.js`: 8 providers with regex + embed URL builders.
2. `EmbedBlock.jsx` (edit): URL input; on submit detects provider; shows preview/embed.
3. `EmbedBlockRenderer.jsx` (read): if matched provider → `<iframe>` with `sandbox="allow-scripts allow-same-origin"`, `loading="lazy"`, `referrerpolicy="no-referrer"`; if no match → link card.
4. Resize handle to set embed height (stored in `metadata.height`).

**Acceptance criteria**
- [ ] Pasting a YouTube URL renders a YouTube embed.
- [ ] Pasting an unknown URL renders a link card.
- [ ] Only allow-listed domains render as iframes.
- [ ] `sandbox` attribute is present on all iframes.
- [ ] Embed height is resizable and persists.

**Validation**
- Vitest: `detectProvider('https://www.youtube.com/watch?v=abc')` → returns 'youtube' provider.
- Run app: paste YouTube URL → video embed renders; paste random URL → link card.

**Merge** — Branch: `feat/know-embed-block` · PR: `feat(knowledge): rich embed block with provider auto-detection`

---

### WI-KR-064 · Whiteboard export
**Phase** P2 | **Effort** S | **No migration needed**  
**Rule books** RB-30

**Scope** — Export the whiteboard block canvas as PNG or SVG. "Export" button in the whiteboard block toolbar. PNG via `html-to-image` or `canvas.toDataURL`. SVG via serializing the existing SVG canvas.

**Build**
1. "Export" button in whiteboard block toolbar → dropdown: "PNG" / "SVG".
2. PNG: use `html-to-image` library (MIT) to capture the whiteboard SVG container as a PNG. Trigger download via `<a download>`.
3. SVG: serialize the whiteboard SVG element via `new XMLSerializer().serializeToString(svgEl)`. Wrap in a `Blob` and trigger download.
4. Filename: `whiteboard-{articleTitle}-{date}.png/.svg`.

> ⚠️ Confirm `html-to-image` (MIT) license per RB-10 §9 before adding.

**Acceptance criteria**
- [ ] "Export as PNG" downloads a rasterized PNG of the whiteboard canvas.
- [ ] "Export as SVG" downloads the vector SVG.
- [ ] Exported PNG/SVG includes all shapes, connectors, and text labels.
- [ ] Filename includes article title and date.

**Validation**
- Run app: draw 3 shapes on whiteboard → Export PNG → download opens; image shows all 3 shapes.

**Merge** — Branch: `feat/know-whiteboard-export` · PR: `feat(knowledge): whiteboard export as PNG and SVG`

---

## Layer 9 — Collaboration & social
> References: Notion · Google Docs · Confluence · Linear  
> Stack surface: SSE `/realtime/stream`, `knowledge-view.jsx`, new endpoints

---

### WI-KR-065 · Real-time presence indicators
**Phase** P1 | **Effort** L | **No migration needed (uses existing SSE)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Show which workspace members are currently viewing the same article. Avatar row in the article header: up to 4 avatars + "+N more" overflow. Presence sent via the existing SSE `/realtime/stream`. Presence clears 30s after the last heartbeat.

**Analysis**
- SSE already exists at `/realtime/stream`. Check if the presence mechanism exists (it's mentioned in KNOW-STUDIO.md as planned but not confirmed as shipped).
- Client publishes presence: `POST /api/v1/articles/{id}/presence` every 20s while the article is open. Server stores presence in a short-TTL Redis list or in-memory map.
- Server broadcasts presence updates to all connected SSE clients viewing the same article via the existing SSE mechanism.
- Presence data: `{ articleId, userId, userDisplayName, userAvatar }`. TTL: 30s (last heartbeat + 30s).

**Build**
1. `ArticlePresenceController`: `POST /api/v1/articles/{id}/presence` (upsert presence); returns list of current presences.
2. Presence store: in-memory `ConcurrentHashMap<articleId, Map<userId, PresenceRecord>>` with a scheduled cleanup removing entries older than 30s. Or use the existing SSE infrastructure if presence tracking already exists.
3. SSE: on POST presence, broadcast `PRESENCE_UPDATE` event to all clients subscribed to the article.
4. Frontend: in `knowledge-view.jsx`, on article open: start a `setInterval` (20s) posting presence. On article close: POST a "leave" event or just let TTL expire.
5. Listen for `PRESENCE_UPDATE` SSE events: update `activePresences: PresenceRecord[]` state.
6. `PresenceAvatarRow.jsx`: renders up to 4 avatars + overflow; tooltip shows full list of names.

**Acceptance criteria**
- [ ] Opening an article in two browsers shows both users' avatars in the article header.
- [ ] Closing one browser → that user's avatar disappears within 30s.
- [ ] Up to 4 avatars shown; "+N more" for additional users.
- [ ] Presence scoped to the article (not visible on other articles).
- [ ] Cross-tenant: presence endpoint workspace-scoped.

**Validation**
- Testcontainers IT: POST presence for 2 users → GET presence → both returned; wait 31s without heartbeat → user removed.
- Run app: open same article in two tabs → both avatars visible in header.

**Merge** — Branch: `feat/know-presence` · PR: `feat(knowledge): real-time presence indicators for articles`

---

### WI-KR-066 · Article public share link
**Phase** P1 | **Effort** M | **Migration: V9X (public_share_tokens on articles)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — A PUBLISHED article can be shared via a public URL accessible without login. "Share" button in the article header → generates a public share link. The public view renders the article read-only. Space admin can revoke the link (regenerates a new token).

**Analysis**
- Different from the external reviewer link (KR-032) which is time-limited and for review only. The public share link is permanent (until revoked) and for any viewer.
- New column `public_share_token VARCHAR(64) UNIQUE NULL` on `articles`. Generated on first share.
- Public route `/p/{token}` renders the article read-only (no auth required). Published articles only.
- Revoking: deletes the token from the DB; the old URL returns 404.

**Build**
1. Migration: `ALTER TABLE articles ADD COLUMN public_share_token VARCHAR(64) UNIQUE;`.
2. `ArticleService.generateShareLink(articleId, workspaceId)`: validate article is PUBLISHED; generate 64-char token; save to DB; return token.
3. `ArticleService.revokeShareLink(articleId, workspaceId)`: set `public_share_token = NULL`.
4. `PublicController` (no auth): `GET /p/{token}` → fetch article by token → return DTO (no workspace data exposed beyond article content).
5. Frontend: "Share" button in article header (only when PUBLISHED). Opens a popover with the public URL + "Copy link" button + "Revoke" button (for admins).
6. Public route `/p/:token` in React router: renders article in read-only mode (no sidebar, no editor).

**Acceptance criteria**
- [ ] "Share" button visible on PUBLISHED articles only.
- [ ] Generates a public URL; copy-to-clipboard works.
- [ ] Opening the public URL without authentication shows the article.
- [ ] DRAFT articles: `/p/{token}` returns 404 (not published).
- [ ] Revoking invalidates the old token (old URL → 404).
- [ ] Rate limit on the public endpoint to prevent scraping.

**Validation**
- Testcontainers IT: generate share link for PUBLISHED article → GET /p/{token} → 200 with article data; revoke → GET → 404.
- Run app: publish article → Share → copy link → open in incognito → article visible.

**Merge** — Branch: `feat/know-public-share` · PR: `feat(knowledge): public share link for published articles`

---

### WI-KR-067 · Article subscriptions / watch
**Phase** P1 | **Effort** S | **Migration: V9X (article_watchers table)**  
**Rule books** RB-10 · RB-30

**Scope** — Users can "Watch" an article to receive notifications (via the events table) when it's updated, status-changed, or commented on. "Watch" button in the article header. Watchers feed into KR-030 (comment digest).

**Analysis**
- Reuse the work item watchers pattern (V89 per memory) — composite-PK follower rows.
- New table `article_watchers (user_id UUID, article_id UUID, workspace_id UUID, watched_at TIMESTAMPTZ, PRIMARY KEY(user_id, article_id))`.
- Events that notify watchers: `ARTICLE_UPDATED`, `ARTICLE_STATUS_CHANGED`, `ARTICLE_BLOCK_COMMENT_ADDED`. The notification service picks up these events and emits notifications to watchers.

**Build**
1. Migration: `article_watchers` table. Index on `(article_id, workspace_id)`.
2. `ArticleWatcherService.toggle(userId, articleId, workspaceId)` — upsert/delete.
3. `ArticleWatcherController`: POST watch, DELETE watch.
4. Article DTO: `watchedByMe: boolean`, `watcherCount: integer`.
5. `WatchButton.jsx` in article header: eye icon + count. Filled when watching.
6. In `ArticleService`: on ARTICLE_UPDATED / STATUS_CHANGED / block comment added → query `article_watchers` for the article → emit notifications to each watcher.

**Acceptance criteria**
- [ ] "Watch" button in article header; clicking toggles watch state.
- [ ] Watcher count shown on the button.
- [ ] Watchers listed in `article_watchers` table.
- [ ] `ARTICLE_UPDATED` event triggers notification events to watchers.
- [ ] Cross-tenant: watching only possible within the same workspace.

**Validation**
- Testcontainers IT: watch article → update article → notification event emitted to watcher.
- Run app: watch an article → watcher count increments; update article → event in events table.

**Merge** — Branch: `feat/know-watchers` · PR: `feat(knowledge): article watch/subscribe for notifications`

---

### WI-KR-068 · Follow a space
**Phase** P1 | **Effort** S | **Migration: V9X (space_followers table)**  
**Rule books** RB-10 · RB-30

**Scope** — Users can "Follow" a knowledge space to receive digest notifications when new articles are published in it. "Follow" button on the space home page (KR-037) and in the page tree sidebar header. Follows feed into the comment/activity digest.

**Build**
1. Migration: `space_followers (user_id UUID, space_id UUID, workspace_id UUID, followed_at TIMESTAMPTZ, PRIMARY KEY(user_id, space_id))`.
2. `SpaceFollowerService.toggle(...)` + controller.
3. Space DTO: `followedByMe: boolean`, `followerCount: integer`.
4. `FollowButton.jsx` on space home.
5. `ArticleService.publishArticle`: emit `SPACE_ARTICLE_PUBLISHED` event → notification service notifies space followers.

**Acceptance criteria**
- [ ] "Follow" button on space home page toggles follow state.
- [ ] Publishing an article emits `SPACE_ARTICLE_PUBLISHED` event to space followers.
- [ ] Cross-tenant scoped.

**Validation**
- Testcontainers IT: follow space → publish article → SPACE_ARTICLE_PUBLISHED event in events with follower's userId.
- Run app: follow a space → publish article → event in events table.

**Merge** — Branch: `feat/know-space-follow` · PR: `feat(knowledge): follow a knowledge space`

---

### WI-KR-069 · Embed article anywhere
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Any article can be embedded in another article via the `workitem` or a new `article_ref` block. Also provide an iframe embed snippet for embedding in external tools (Confluence, SharePoint, Notion). The iframe snippet only works for PUBLISHED articles with a public share link (KR-066).

**Build**
1. New `article_ref` block type: stores `{ articleId, displayMode: 'card'|'inline' }` in metadata. Card mode shows title + excerpt + status chip. Inline mode embeds the article's block content read-only.
2. `/embed/{token}` route: a minimal-chrome read-only view of a published article, suitable for iframing. Uses the public share token from KR-066.
3. "Embed" option in the article share popover (KR-066): shows iframe snippet code `<iframe src="/embed/{token}" ...></iframe>`.
4. `ArticleRefBlockRenderer.jsx`: fetches the referenced article via API; renders title+excerpt card or inline blocks.

**Acceptance criteria**
- [ ] Inserting an `article_ref` block and selecting an article shows the article card/inline embed.
- [ ] Iframe embed snippet available in the Share popover for published articles.
- [ ] `/embed/{token}` renders the article with minimal chrome (no sidebar, no auth).
- [ ] `article_ref` block shows "Article not found" if the referenced article is deleted.
- [ ] RBAC: `article_ref` block can only reference articles in the same workspace.

**Validation**
- Run app: insert article_ref block → pick article → card renders; share popover → iframe snippet shown.

**Merge** — Branch: `feat/know-embed-article` · PR: `feat(knowledge): embed article anywhere via article_ref block and iframe snippet`

---

### WI-KR-070 · Live co-editing cursors
**Phase** P2 | **Effort** XL | **No migration needed (SSE infrastructure)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Show other users' cursors in the block editor in real-time (which block they're editing, their position within it). Uses the existing SSE `/realtime/stream`. Cursors are colored per user and labeled with the user's name.

**Analysis**
- This is the most technically complex collaboration feature. True character-level cursor sharing requires operational transformation (OT) or CRDT (e.g., Yjs). For P2, a simplified block-level cursor is acceptable: "User A is editing block XYZ."
- Block-level cursor: when a user focuses a block's textarea, broadcast `CURSOR_UPDATE { userId, blockId }` via a POST to the presence endpoint or a dedicated cursor endpoint. SSE pushes this to other viewers. Other viewers see a colored border around the block with the user's avatar.
- Simpler than character-level OT — this avoids conflict resolution complexity. Character-level cursors are a P3 item if needed.

**Build**
1. `POST /api/v1/articles/{id}/cursor { blockId }` — broadcasts via SSE to other connected viewers of the same article.
2. Frontend: on block textarea `onFocus`, POST cursor update. On `onBlur`, POST `{ blockId: null }` (cursor cleared).
3. Listen for `CURSOR_UPDATE` SSE events: maintain `remoteCursors: Map<userId, blockId>` state.
4. In BlockEditor: for each block, check `remoteCursors` for any userId → blockId match; if found, render a colored `ring-2` border + avatar label in the block header.
5. User color assignment: deterministic color from user ID hash (6 preset brand-adjacent colors).

**Acceptance criteria**
- [ ] User A editing block 1 → User B sees a colored ring on block 1 with A's avatar.
- [ ] User A moving to block 2 → User B sees the ring move to block 2.
- [ ] User A leaving → ring disappears within 5s.
- [ ] Up to 5 concurrent cursors shown (overflow hidden).
- [ ] Cursors scoped to the same article.

**Validation**
- Run app: open article in two tabs → edit a block in tab 1 → tab 2 shows colored ring on that block.

**Merge** — Branch: `feat/know-co-editing-cursors` · PR: `feat(knowledge): live co-editing block cursor indicators via SSE`

---

### WI-KR-071 · Activity timeline tab
**Phase** P2 | **Effort** M | **No migration needed (uses events table)**  
**Rule books** RB-10 · RB-30

**Scope** — An "Activity" tab in the article side panel showing a chronological timeline of all events for the article: created, edited, status changed, commented, published, shared, mentioned, viewed. Driven by the `events` table filtered by `entity_type=ARTICLE AND entity_id={articleId}`.

**Build**
1. `GET /api/v1/articles/{id}/activity?page={n}&size=20` — queries `events` table filtered by article + workspace, ordered by `created_at DESC`.
2. `ArticleActivityController` → `ArticleActivityService` (workspace-scoped, RBAC `view_items`).
3. Frontend "Activity" tab: `<ActivityTimeline>` component. Each event: avatar + action text + timestamp. Infinite scroll (load more on scroll to bottom).
4. Event-type → human-readable text: `ARTICLE_CREATED → "Created this article"`, `ARTICLE_STATUS_CHANGED → "Changed status to PUBLISHED"`, `ARTICLE_BLOCK_COMMENT_ADDED → "Commented on a block"`, etc.

**Acceptance criteria**
- [ ] Activity tab shows all events for the article in reverse chronological order.
- [ ] Events include: create, edit, status change, comment, publish, share.
- [ ] Infinite scroll loads more events.
- [ ] Events scoped to the requesting user's workspace.
- [ ] Unauthorized: 403 for users without read access to the article.

**Validation**
- Testcontainers IT: emit 5 article events → GET /articles/{id}/activity → 5 events returned in reverse order.
- Run app: open Activity tab → timeline of events visible with user avatars and action text.

**Merge** — Branch: `feat/know-activity-timeline` · PR: `feat(knowledge): article activity timeline tab`

---

### WI-KR-072 · Version diff viewer
**Phase** P2 | **Effort** M | **No migration needed (uses existing article_versions)**  
**Rule books** RB-10 · RB-30

**Scope** — The existing version history panel (version list + restore) gains a "Compare" view: select any two versions and see a side-by-side or inline diff of their block content. Additions highlighted green, deletions red.

**Analysis**
- `article_versions` table already stores version snapshots. This WI adds diff computation and display.
- Diff algorithm: `diff-match-patch` (Google, Apache 2.0) applied at the block level: diff the full serialized content of each version. Or block-by-block comparison (smarter): match blocks by ID, then diff content within each matched block.
- Display: side-by-side for wide screens, unified inline diff for narrow screens.

**Build**
1. `GET /api/v1/articles/{id}/versions/{v1}/diff/{v2}` → returns `{ added: Block[], removed: Block[], modified: [{ blockId, before: string, after: string, diff: DiffChunk[] }] }`. (Or compute client-side from the two version snapshots.)
2. Client-side approach (simpler — no new endpoint): fetch both version snapshots, compute diff in browser using `diff-match-patch`. Avoids new backend endpoint complexity.
3. `VersionDiffView.jsx`: version picker (two dropdowns for v1 and v2). Diff view: for each block, if same ID in both versions: show inline diff (green `<ins>`, red `<del>`); if only in v1: full red block; if only in v2: full green block.
4. "Restore to v2" button navigates to the existing version restore flow.

**Acceptance criteria**
- [ ] Version picker shows two dropdowns for selecting v1 and v2.
- [ ] Comparing two versions shows added/removed/modified blocks highlighted.
- [ ] Modified blocks show character-level diff (green insertions, red deletions).
- [ ] "Restore" button from the diff view restores to the selected version.

**Validation**
- Vitest: compute diff between two block arrays with one changed paragraph → modified block has diffChunks.
- Run app: select two versions → Compare → diff view shows changes.

**Merge** — Branch: `feat/know-version-diff` · PR: `feat(knowledge): version diff viewer for article history`

---

## Layer 10 — AI premium
> References: Grammarly · Notion AI · ChatGPT · DeepL  
> Stack surface: `knowledge-view.jsx`, `knowledge-ai.js`, AI Control Plane (RB-40 §2)

All WIs in this layer route through the AI Control Plane. Haiku tier for classification/short tasks; Sonnet for generation. Every call has a deterministic fallback. Per-workspace budget caps apply (80% → Haiku only, 100% → AI off). Every call logged.

---

### WI-KR-073 · AI document outline generator
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — "Generate outline" AI button in an empty article (or after clearing blocks). User enters a topic/prompt + optional template type. AI generates a structured outline of H1/H2 headings + brief descriptions. User clicks "Insert outline" to populate the article with heading and paragraph blocks.

**Analysis**
- AI Control Plane endpoint: `POST /api/v1/knowledge/ai/compose` with `mode: 'outline'`, `prompt: userInput`, `templateType: optional`. Returns `{ blocks: Block[] }` — a list of heading + paragraph blocks.
- Deterministic fallback: a template-based outline generator using the `templateType` to return a standard structure. If `templateType = RUNBOOK`, return the standard runbook outline (`{H1: Overview, H2: Prerequisites, H2: Steps, H2: Verification, H2: Rollback}`).
- UI: "✨ Generate outline" button in the empty-article empty state (below the title, when blocks array is empty). Clicking opens a modal: topic input + template type selector + Generate button.

**Build**
1. Extend `POST /api/v1/knowledge/ai/compose` to support `mode: 'outline'` if not already done.
2. Deterministic fallback: `OutlineTemplates` map by `templateType` → default heading structure.
3. `GenerateOutlineModal.jsx`: topic `<input>`, template type `<select>`, Generate button. On submit: POST to compose endpoint; show spinner; on response: render preview of proposed headings.
4. "Insert outline" button in the preview: calls `setBlocks(response.blocks)` in the parent BlockEditor.
5. `AiMetaBadge` shows AI tier / fallback status.

**Acceptance criteria**
- [ ] "Generate outline" button visible in empty article state.
- [ ] Entering a topic and clicking Generate returns a heading structure.
- [ ] "Insert outline" inserts the blocks into the editor.
- [ ] Fallback: AI off → a standard template outline returned based on `templateType`.
- [ ] AI audit log records the call.
- [ ] `AiMetaBadge` shows ai/cached/deterministic_fallback.

**Validation**
- Testcontainers IT: POST compose with mode=outline and prompt "Kubernetes deployment" → blocks array returned with heading types.
- Run app: new article → Generate outline → insert → headings appear in editor.

**Merge** — Branch: `feat/know-ai-outline` · PR: `feat(knowledge): AI document outline generator`

---

### WI-KR-074 · AI grammar & style check
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — "Check writing" button in the block editor toolbar. Scans the full article content for grammar/spelling/style issues. Returns a list of issues with position, suggested fix, and severity. User can Accept or Dismiss each issue. Inline underlines highlight issues in the block content.

**Analysis**
- AI Control Plane: `POST /api/v1/knowledge/ai/compose` with `mode: 'check_writing'`, full article text. Returns `{ issues: [{ blockId, start, end, text, suggestion, severity: 'error'|'warning'|'info' }] }`.
- Deterministic fallback: a rule-based checker using a small list of common errors (passive voice patterns, overly long sentences, prohibited words list). Returns basic style issues without AI.
- UI: a floating "Writing issues" panel that lists all issues. Clicking an issue scrolls to the block and highlights the range.

**Build**
1. Extend compose endpoint: `mode: 'check_writing'`. Fallback: `WritingCheckRules.check(text)`.
2. `WritingCheckRules.check(text)`: check for overly long sentences (>40 words), double spaces, common confusable pairs (its/it's), passive voice marker words. Returns `Issue[]`.
3. `CheckWritingPanel.jsx`: triggered by "Check writing" toolbar button. Fetches and displays issues. Each issue: severity icon + text snippet + suggestion + Accept/Dismiss buttons.
4. Accept: replaces `block.content[start:end]` with suggestion via `updateBlock`.
5. Inline underlines: squiggly underline CSS on highlighted text ranges in BlockRenderer (read-only check mode, not edit mode — too complex in textarea).

**Acceptance criteria**
- [ ] "Check writing" button triggers AI check; issues panel shows results.
- [ ] Issues list includes grammar/style issues with severity.
- [ ] Clicking an issue scrolls to the relevant block.
- [ ] "Accept" applies the suggestion to the block content.
- [ ] Fallback: AI off → rule-based issues still returned.
- [ ] AI audit log records the call.

**Validation**
- Unit test: `WritingCheckRules.check("Its a great day")` → returns issue at chars 0-2 with suggestion "It's".
- Run app: Check writing on an article with grammatical issues → issues panel shows them.

**Merge** — Branch: `feat/know-ai-grammar` · PR: `feat(knowledge): AI grammar and style check`

---

### WI-KR-075 · AI auto-tagging
**Phase** P1 | **Effort** S | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — On article publish (or on demand via "Auto-tag" button), AI suggests up to 5 tags based on article content. If suggested tags match existing workspace tags (KR-034), they are applied automatically. New suggested tags are shown as chips for the user to accept/reject.

**Analysis**
- AI Control Plane: `POST /api/v1/knowledge/ai/compose` with `mode: 'suggest_tags'`, article content. Returns `{ suggestedTags: string[] }`. Haiku tier.
- Deterministic fallback: extract the top-5 TF-IDF keywords from the article content and match against existing workspace tag names.
- Auto-apply: tags that exactly match existing workspace tags (case-insensitive) are applied automatically. New tags are surfaced for user decision.

**Build**
1. Extend compose endpoint: `mode: 'suggest_tags'`.
2. Fallback: `TfIdfTagger.suggest(articleContent, workspaceTags)` → return top-5 matching tags.
3. On `ArticleService.publishArticle`: call `aiService.suggestTags(article)` → auto-apply matching tags; emit `ARTICLE_TAGGED` event.
4. "Auto-tag" button in Properties panel (KR-011): calls the tag suggestion endpoint → shows `TagSuggestionChips` for user to accept/reject individually.
5. `TagSuggestionChips.jsx`: green chips with ✓ and × buttons per suggested tag.

**Acceptance criteria**
- [ ] Publishing an article auto-applies tags matching existing workspace tags.
- [ ] "Auto-tag" button shows suggestion chips for new tags.
- [ ] Accepting a new tag chip creates the tag (if it doesn't exist) and applies it.
- [ ] Fallback: AI off → TF-IDF keyword suggestions.
- [ ] AI audit log records the call.

**Validation**
- Unit test: `TfIdfTagger.suggest("Kubernetes deployment runbook", ["kubernetes", "devops", "sales"])` → returns ["kubernetes"].
- Run app: publish article about "Kubernetes" → "kubernetes" tag auto-applied if it exists.

**Merge** — Branch: `feat/know-ai-autotag` · PR: `feat(knowledge): AI auto-tagging on article publish`

---

### WI-KR-076 · AI readability score
**Phase** P1 | **Effort** S | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — "Simplify" AI action that rewrites selected text for a target reading grade (Flesch-Kincaid Grade 6, 8, or 12). Accessible via the floating selection toolbar (KR-002) and the AI compose bar. Returns rewritten text for user to Accept or Discard. Uses the readability score from KR-013 as context.

**Analysis**
- AI Control Plane: `POST /api/v1/knowledge/ai/compose` with `mode: 'simplify'`, `targetGrade: 6|8|12`, selected text. Returns `{ simplified: string }`.
- Deterministic fallback: sentence splitting + contracting long words using a Flesch readability formula. Returns a best-effort simplification rule-based transformation.

**Build**
1. Extend compose endpoint: `mode: 'simplify'`, `targetGrade`.
2. Fallback: split sentences at >30 words, replace common complex words (utilize→use, etc.). Return modified text.
3. In `SelectionToolbar.jsx` (KR-002): add "Simplify" option with a sub-menu for Grade 6/8/12.
4. On result: open a diff preview modal (original vs. simplified). "Accept" → replace selection via `wrapSelection`. "Discard" → close.

**Acceptance criteria**
- [ ] Selecting text → "Simplify" → grade picker → AI returns simplified version.
- [ ] Diff preview modal shows original vs. simplified.
- [ ] "Accept" replaces the selected text in the block.
- [ ] Fallback: AI off → rule-based simplification returned.
- [ ] `AiMetaBadge` on the modal shows source.

**Validation**
- Run app: select a complex paragraph → Simplify → Grade 6 → preview appears; Accept → text replaced.

**Merge** — Branch: `feat/know-ai-simplify` · PR: `feat(knowledge): AI text simplification for target reading grade`

---

### WI-KR-077 · Meeting notes assistant
**Phase** P1 | **Effort** L | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — A "Meeting Notes" template type + a dedicated AI assist: paste raw meeting transcript or bullet points → AI generates structured meeting notes (Attendees, Agenda, Key Decisions, Action Items, Next Steps). Action items can be converted to work items with one click.

**Analysis**
- Template type: `MEETING_NOTES` added to the template catalog.
- AI: `POST /api/v1/knowledge/ai/compose` with `mode: 'meeting_notes'`, `rawInput: string`. Returns blocks: heading "Attendees", heading "Key Decisions", heading "Action Items" (checklist), heading "Next Steps".
- Action items → work items: a "Create work items" button on checklist blocks in meeting notes articles. Each checked item becomes a `POST /api/v1/work-items` call.
- Deterministic fallback: parse `rawInput` for `@mention` patterns (attendees), bullet points with "Action:" prefix (action items), and paragraph breaks (sections).

**Build**
1. Add `MEETING_NOTES` to `KnowledgeTemplateType` enum. Add a template in the templates catalog.
2. Extend compose endpoint: `mode: 'meeting_notes'`.
3. Fallback: `MeetingNotesParser.parse(rawInput)` — heuristic extraction of sections.
4. `MeetingNotesAssistant.jsx`: a panel in the article header when `templateType = MEETING_NOTES`. Has a "Paste transcript" textarea + "Generate notes" button.
5. On generate: call compose API → set blocks to the returned structure.
6. "Create work items" button on checklist blocks: iterates unchecked items → POST to `/api/v1/work-items` with title = item text, tags the new work items with the article title as description.

**Acceptance criteria**
- [ ] `MEETING_NOTES` template shows the "Generate notes" assistant panel.
- [ ] Pasting a transcript and generating creates structured blocks (Attendees, Decisions, Action Items, Next Steps).
- [ ] "Create work items" converts unchecked action items to work items.
- [ ] Fallback: AI off → heuristic parser extracts sections.
- [ ] Created work items link back to the article via `article_work_item_links`.

**Validation**
- Unit test: `MeetingNotesParser.parse("Action: Deepak to deploy by Friday")` → action items array contains the item.
- Run app: new Meeting Notes article → paste transcript → Generate → structured notes appear; click Create work items → items created.

**Merge** — Branch: `feat/know-meeting-notes` · PR: `feat(knowledge): meeting notes assistant with action item → work item conversion`

---

### WI-KR-078 · AI content gap analysis
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — "Analyze gaps" AI button in the analytics panel. Compares the article's content against the expected sections for its `templateType` and against related articles in the same space. Returns a list of missing or thin sections and suggests content to add. Haiku tier. Cached per version.

**Build**
1. `GET /api/v1/articles/{id}/content-gaps` → AI Control Plane call with article content + template schema + peer article summaries. Returns `{ gaps: [{ section, reason, suggestedContent }] }`.
2. Fallback: compare `block.type === 'heading1/2/3'` list against the expected heading list for the `templateType`. Missing headings = gaps. No AI needed.
3. Frontend: "Analyze gaps" button in analytics panel → gap list with each gap's section + reason + "Add section" button (inserts a heading + placeholder paragraph block at the bottom).

**Acceptance criteria**
- [ ] "Analyze gaps" returns a list of missing sections for the article's template type.
- [ ] "Add section" inserts the missing section as blocks.
- [ ] Fallback: AI off → heading-based heuristic gaps returned.
- [ ] Result cached per (article_id, versionNumber).

**Validation**
- Unit test: template RUNBOOK expects [Overview, Prerequisites, Steps, Verification, Rollback]. Article missing Rollback → gap returned.
- Run app: open RUNBOOK article → Analyze gaps → missing section shown; Add section → block inserted.

**Merge** — Branch: `feat/know-ai-gaps` · PR: `feat(knowledge): AI content gap analysis for articles`

---

### WI-KR-079 · AI duplicate detection
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — When creating or saving an article, AI checks for duplicate or near-duplicate articles in the same workspace. A warning banner appears if a similar article is found (>80% similarity), with a link to the existing article and options to Merge (open both side-by-side) or Continue creating. Sonnet tier.

**Build**
1. `POST /api/v1/articles/{id}/check-duplicate` — called on article save. AI embedding similarity check against workspace articles. Returns `{ duplicates: [{ articleId, title, similarity }] }`.
2. Fallback: `MinHashDuplicateChecker.check(newContent, existingArticles)` — shingling + MinHash for near-duplicate detection.
3. Frontend: in `ArticleService.save()` response, if duplicates found → show `<DuplicateWarningBanner>` at the top of the editor. "View existing" opens the existing article in a new tab; "Continue anyway" dismisses the banner.

**Acceptance criteria**
- [ ] Saving an article very similar to an existing one shows the duplicate warning.
- [ ] Warning links to the similar article with a similarity % shown.
- [ ] "Continue anyway" dismisses without blocking save.
- [ ] Fallback: AI off → MinHash heuristic detects near-duplicates.
- [ ] Detection scoped to the workspace.

**Validation**
- Unit test: `MinHashDuplicateChecker.check(textA, [textA])` → similarity = 1.0.
- Run app: save a nearly identical article → duplicate warning banner appears.

**Merge** — Branch: `feat/know-ai-duplicate` · PR: `feat(knowledge): AI duplicate article detection on save`

---

### WI-KR-080 · AI translation (10 locales)
**Phase** P2 | **Effort** L | **Migration: V9X (article_translations table)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Translate a PUBLISHED article to any of 10 supported locales (en, es, fr, de, pt, ja, zh, ko, ar, hi). Translation stored as a separate article linked to the original via `parent_id`. A language switcher badge in the article header. Sonnet tier.

**Build**
1. Migration: no new table needed — use `parent_id` + `locale VARCHAR(5)` column on `articles`. Add `locale VARCHAR(5) DEFAULT 'en' NOT NULL` and update search/list queries to filter by locale or return all.
2. `ArticleService.translate(articleId, targetLocale, userId)`: AI Control Plane translate call → create new article with `locale = targetLocale`, `parent_id = sourceArticle.id`, `status = DRAFT`, same title + translated blocks.
3. Endpoint: `POST /api/v1/articles/{id}/translate { locale }`.
4. Language switcher: in the article header, a locale badge (e.g., `EN`). Clicking opens a popover of available translated versions. "Translate to..." option calls the translate endpoint.
5. Translation is a new article — all existing features (comments, versions, etc.) apply to it normally.

**Acceptance criteria**
- [ ] "Translate to French" creates a new article with `locale='fr'` and French block content.
- [ ] Language switcher shows available translations; clicking navigates to the translated article.
- [ ] Translation is workspace-scoped; another workspace cannot access the translated article.
- [ ] AI audit log records the Sonnet call.
- [ ] Fallback: if AI translation is off, show "Translation unavailable — AI is disabled for this workspace."

**Validation**
- Testcontainers IT: POST translate with locale=es → new article created with locale=es and parent_id=original.
- Run app: translate article to Spanish → language switcher shows EN + ES; click ES → Spanish article opens.

**Merge** — Branch: `feat/know-ai-translate` · PR: `feat(knowledge): AI article translation into 10 locales`

---

## Layer 11 — Export & integration
> References: Confluence · SharePoint · Slack · Notion  
> Stack surface: `knowledge-view.jsx`, new export endpoints, integration config

---

### WI-KR-081 · PDF export (server-side)
**Phase** P1 | **Effort** L | **No migration needed (new endpoint only)**  
**Rule books** RB-10 · RB-30

**Scope** — Server-side PDF export for articles via `GET /api/v1/articles/{id}/export/pdf`. Renders blocks to HTML then converts to PDF using a Java-compatible PDF library (Flying Saucer / Apache PDFBox). Returns `application/pdf`. RBAC-gated to `view_items`.

> ⚠️ **Stop and ask Deepak** before implementing the PDF library dependency — this requires the approval checklist (RB-10 §9). Detail the candidates (Flying Saucer: BSD, Apache PDFBox: Apache 2.0, OpenHTML: LGPL) and the chosen one in the PR description.

**Build**
1. `ArticleHtmlSerializer.serialize(article, blocks)`: produces a self-contained HTML string with inline CSS from the design tokens (using a separate `print.css` stylesheet).
2. `ArticlePdfExporter.export(html)`: pass HTML to the approved PDF library. Return byte array.
3. `ExportController`: `GET /api/v1/articles/{id}/export/pdf` → `Content-Disposition: attachment; filename="{title}.pdf"`. RBAC `view_items`. Workspace-scoped.
4. Frontend: "Export PDF" in article overflow menu → triggers GET request → browser download.

**Acceptance criteria**
- [ ] GET /articles/{id}/export/pdf returns a valid PDF.
- [ ] PDF contains all article blocks (headings, paragraphs, tables, code blocks).
- [ ] 403 for unauthorized users; 404 for cross-tenant articles.
- [ ] PDF filename = article title + `.pdf`.
- [ ] Code blocks render in monospace; headings in correct hierarchy.

**Validation**
- Testcontainers IT: GET export/pdf with valid auth → Content-Type=application/pdf; with unauthorized → 403.
- Run app: Export PDF → browser downloads a valid PDF; open PDF → content matches article.

**Merge** — Branch: `feat/know-export-pdf` · PR: `feat(knowledge): server-side PDF export for articles`

---

### WI-KR-082 · DOCX export
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30

**Scope** — DOCX export via `GET /api/v1/articles/{id}/export/docx` using the `docx` npm package (MIT) called from a small Node.js utility invoked server-side via `ProcessBuilder`, or a pure Java DOCX library (Apache POI, Apache 2.0). Returns `.docx`.

> ⚠️ **Stop and ask Deepak** for library choice: Apache POI (Java, no new runtime) vs. Node.js `docx` package (requires Node sidecar). Apache POI is strongly preferred for the monolith stage.

**Build**
1. `ArticleDocxSerializer.serialize(article, blocks)`: using Apache POI, map blocks to XWPF elements: heading1/2/3 → `XWPFParagraph` with Word heading styles; paragraph → normal paragraph; code → monospace style; table → `XWPFTable`; checklist item → `XWPFParagraph` with checkbox bullet.
2. `ExportController`: `GET /api/v1/articles/{id}/export/docx`. Same RBAC as PDF.
3. Frontend: "Export Word" in export dropdown.

**Acceptance criteria**
- [ ] GET /articles/{id}/export/docx returns a valid `.docx` file.
- [ ] Headings have correct Word heading styles (Heading 1, 2, 3).
- [ ] Tables render as Word tables.
- [ ] Code blocks in monospace font.
- [ ] 403 for unauthorized; 404 for cross-tenant.

**Validation**
- Testcontainers IT: GET export/docx → Content-Type=application/vnd.openxmlformats-officedocument.wordprocessingml.document.
- Run app: Export Word → download; open in Word → headings and tables correctly styled.

**Merge** — Branch: `feat/know-export-docx` · PR: `feat(knowledge): DOCX article export via Apache POI`

---

### WI-KR-083 · Markdown export
**Phase** P1 | **Effort** S | **No migration needed (client-side)**  
**Rule books** RB-30

**Scope** — Client-side Markdown export (GFM) via `blocksToMarkdown(blocks)` utility. "Export Markdown" in export dropdown → triggers browser download of `.md` file. Covered partially in KR-015 — this WI ensures it's completed as a standalone deliverable if KR-015 is not yet merged.

**Build**
1. `src/lib/export.js: blocksToMarkdown(blocks)`: map each block type → GFM markdown:  
   - `heading1` → `# {content}\n`, `heading2` → `## {content}\n`, `heading3` → `### {content}\n`  
   - `paragraph` → `{content}\n\n`  
   - `quote` → `> {content}\n`  
   - `callout` → `> **Note:** {content}\n`  
   - `checklist` → `- [ ] {content}\n` / `- [x] {content}\n` based on `metadata.checked`  
   - `code` → `` ```{language}\n{content}\n``` ``  
   - `table` → GFM pipe table syntax  
   - `divider` → `---\n`  
   - Other blocks: fallback to `[Block: {type}]\n`
2. Download: `const blob = new Blob([md], { type: 'text/markdown' }); <a href={URL.createObjectURL(blob)} download="{title}.md">`.

**Acceptance criteria**
- [ ] `blocksToMarkdown` serializes all 22 block types correctly (or gracefully for non-text blocks).
- [ ] Download button triggers a `.md` file download with the correct filename.
- [ ] Markdown is valid GFM (headings, tables, code fences, checkboxes).

**Validation**
- Vitest: `blocksToMarkdown([{ type: 'heading1', content: 'Title' }, { type: 'paragraph', content: 'Hello' }])` → `# Title\n\nHello\n\n`.
- Run app: Export Markdown → download; open in VS Code → formatted markdown visible.

**Merge** — Branch: `feat/know-export-markdown` · PR: `feat(knowledge): GFM Markdown export for articles`

---

### WI-KR-084 · Email article
**Phase** P1 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — "Send by email" option in the article share/overflow menu. A modal: recipient email addresses (comma-separated), subject (pre-filled with article title), optional message. Sends the article as a well-formatted HTML email via the backend email service. PUBLISHED articles only (or include a "view in app" link for drafts).

**Build**
1. `POST /api/v1/articles/{id}/send-email { recipients: string[], subject: string, message: string }`.
2. Backend: `ArticleEmailService.send(article, recipients, subject, message)`: render article blocks to HTML email template (inline CSS, email-safe HTML — tables for layout, no flexbox). Use the existing email sending infrastructure (JavaMailSender or equivalent). RBAC: `view_items`. Validate recipients: RFC 5322 format; max 10 recipients.
3. Email template: article title as H1, blocks as paragraphs/tables. Footer: "Sent from bSmart Works · View article" link (public share URL if available, else app URL).
4. Frontend: "Send by email" in share popover. Modal with recipient input + subject + optional message field.

**Acceptance criteria**
- [ ] Sending to a valid email delivers an HTML email with the article content.
- [ ] Max 10 recipients enforced; 400 if exceeded.
- [ ] Invalid email format rejected (400).
- [ ] Unauthorized: 403 for users without `view_items`.
- [ ] Cross-tenant: only articles in the requester's workspace can be sent.

**Validation**
- Testcontainers IT: POST send-email with valid recipients → no error; with invalid email → 400; with 11 recipients → 400.
- Run app: Send by email → enter test email → send → email received with article content.

**Merge** — Branch: `feat/know-email-article` · PR: `feat(knowledge): send article by email`

---

### WI-KR-085 · Slack share integration
**Phase** P2 | **Effort** M | **Migration: V9X (workspace_integrations: slack_webhook_url)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — "Share to Slack" option in the article share menu. Sends a Slack message with the article title, status, excerpt, and a link to the article. Configured via a workspace-level Slack incoming webhook URL. PUBLISHED articles only (or any, with status badge).

**Build**
1. `workspace_integrations` table (or `workspace_settings` JSONB): add `slack_webhook_url VARCHAR(500)`.
2. `SlackIntegrationService.sendArticle(article, webhookUrl)`: POST to the Slack webhook URL with a `Block Kit` message: article title, status badge, 100-char excerpt, "View article" button link.
3. `POST /api/v1/articles/{id}/share-to-slack` → `SlackIntegrationService`.
4. Workspace settings: Slack section → webhook URL input + "Test" button.
5. Frontend: "Share to Slack" in article share popover (only visible if webhook configured).

**Acceptance criteria**
- [ ] Workspace admin configures Slack webhook URL in settings.
- [ ] "Share to Slack" posts a formatted message to the configured Slack channel.
- [ ] No webhook configured → "Share to Slack" option hidden.
- [ ] Slack webhook URL stored encrypted (or at least not returned in GET workspace API).
- [ ] Cross-tenant: webhook URL from another workspace cannot be used.

**Validation**
- Testcontainers IT: POST share-to-slack with a mock Slack webhook server → request received by mock.
- Run app: configure webhook → share article → Slack message appears in the channel.

**Merge** — Branch: `feat/know-slack-share` · PR: `feat(knowledge): Share article to Slack via incoming webhook`

---

### WI-KR-086 · Print stylesheet
**Phase** P2 | **Effort** S | **No migration needed**  
**Rule books** RB-30

**Scope** — `@media print` rules in `src/index.css` (or a dedicated `print.css`) that produce a clean, readable printed output for any article: sidebar hidden, side panels hidden, editor chrome hidden, content centered 720px, headings page-break safe, tables not split across pages, code blocks with visible borders.

**Build**
1. Add `@media print { ... }` in `src/index.css`:
   - `.sidebar, .side-panel, .editor-toolbar, .block-controls, .block-add-button { display: none !important; }`
   - `.article-content { max-width: 720px; margin: 0 auto; }`
   - `h1, h2, h3 { page-break-after: avoid; }`
   - `table, pre, blockquote { page-break-inside: avoid; }`
   - `pre { border: 1px solid #ccc; padding: 8px; white-space: pre-wrap; }`
   - Remove box shadows, background colors (except semantic colors), animations.
2. Add a print preview button in the export menu that calls `window.print()`.
3. Test with a real print preview in Chrome and Firefox.

**Acceptance criteria**
- [ ] `window.print()` produces a clean article output (no sidebar, no toolbars).
- [ ] Content centered at ~720px.
- [ ] Headings do not have page breaks after them.
- [ ] Tables and code blocks do not split across pages.
- [ ] Links show their href in parentheses: `a[href]::after { content: ' (' attr(href) ')' }`.
- [ ] No console errors in print mode.

**Validation**
- Run app: open article → Export → Print → browser print preview shows clean output.

**Merge** — Branch: `feat/know-print-css` · PR: `feat(knowledge): print stylesheet for clean article printing`

---

### WI-KR-087 · Public REST API for published articles
**Phase** P2 | **Effort** M | **No migration needed**  
**Rule books** RB-10 · RB-40

**Scope** — A public REST API allowing external systems to query PUBLISHED articles in a workspace by space, tag, or search keyword. Authenticated via workspace API keys (existing or new). Rate-limited. Returns article DTO with block content.

**Analysis**
- Workspace API keys: check if a workspace API key mechanism exists. If not, add a simple `workspace_api_keys (key_hash VARCHAR(64), workspace_id UUID, name VARCHAR(100), created_by UUID, created_at TIMESTAMPTZ, last_used_at TIMESTAMPTZ)`. Key is shown once on creation.
- Rate limit: 100 req/min per API key.
- Only PUBLISHED articles with `status = PUBLISHED` are returned.

**Build**
1. Migration (if needed): `workspace_api_keys` table.
2. API key auth filter: `X-API-Key: {key}` header → hash → lookup `workspace_api_keys` → resolve workspace.
3. `PublicArticleApiController`: `GET /api/public/v1/articles?spaceId={}&tagId={}&q={}&page={}&size={}`. Returns `[ArticlePublicDTO]` — title, status, icon, tags, excerpt, createdAt, updatedAt, publicUrl (if share link active).
4. `GET /api/public/v1/articles/{id}` — returns full article with blocks.
5. Rate limiting: Spring's `RateLimiter` or a token bucket per API key.
6. Workspace settings: "API Keys" section — create/revoke keys.

**Acceptance criteria**
- [ ] `GET /api/public/v1/articles` with a valid API key returns published articles for the workspace.
- [ ] `q={query}` filters by full-text search.
- [ ] DRAFT/ARCHIVED articles not returned.
- [ ] Invalid API key → 401.
- [ ] Rate limit exceeded → 429.
- [ ] Cross-tenant: API key resolves to exactly one workspace.

**Validation**
- Testcontainers IT: create API key → GET /api/public/v1/articles → published articles returned; DRAFT not included; invalid key → 401.
- Run app: create API key → call with curl → articles returned.

**Merge** — Branch: `feat/know-public-api` · PR: `feat(knowledge): public REST API for published articles`

---

### WI-KR-088 · Publish webhook
**Phase** P2 | **Effort** M | **Migration: V9X (workspace_webhooks table)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — Workspace-level webhook that fires on `ARTICLE_PUBLISHED` and `ARTICLE_ARCHIVED` events. Payload: `{ event, articleId, title, status, spaceId, publicUrl, timestamp }`. HMAC-SHA256 signature in the `X-bSmart-Signature` header. Configurable via workspace settings.

**Build**
1. Migration: `workspace_webhooks (id UUID PK, workspace_id UUID, url VARCHAR(500), secret VARCHAR(64), events TEXT[] /* ['ARTICLE_PUBLISHED'] */, active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ)`.
2. `WebhookService.fire(workspaceId, event, payload)`: fetch active webhooks matching `event`; POST to each URL with JSON body + `X-bSmart-Signature: sha256={HMAC(secret, body)}`. Retry once on failure. Fire asynchronously (Spring `@Async`).
3. `EventService` hook: on `ARTICLE_PUBLISHED` event → call `webhookService.fire(...)`.
4. Workspace settings: "Webhooks" section — add webhook URL, secret (auto-generated), event selection checkboxes.
5. "Test" button: fires a test payload to the webhook URL.

**Acceptance criteria**
- [ ] Publishing an article fires the configured webhook with the correct payload.
- [ ] `X-bSmart-Signature` header is a valid HMAC-SHA256 of the body using the webhook's secret.
- [ ] Inactive webhooks are not fired.
- [ ] Webhook failure (non-2xx response) retried once; then logged as failed.
- [ ] "Test" button fires a test payload immediately.

**Validation**
- Testcontainers IT: configure webhook to a mock HTTP server → publish article → mock server receives request with correct HMAC signature.
- Run app: configure webhook → publish article → check webhook delivery log.

**Merge** — Branch: `feat/know-webhooks` · PR: `feat(knowledge): publish webhook notifications for articles`

---

## Layer 12 — Unique bSmart features
> These WIs have no direct equivalent in Notion, Confluence, or other tools.  
> They embed bSmart's work management context directly into the knowledge layer.

---

### WI-KR-089 · Sprint ceremony notes template
**Phase** Unique | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — A `SPRINT_CEREMONY` template type in the knowledge templates catalog. Pre-populated structure for each ceremony type (Planning, Daily Standup, Review, Retrospective). Template selection in the "New article" flow. BQL widget blocks pre-wired to sprint data (stories, capacity, velocity). 

**Build**
1. Add `SPRINT_CEREMONY` to `KnowledgeTemplateType` enum and the templates catalog.
2. Four sub-templates: `SPRINT_PLANNING`, `SPRINT_REVIEW`, `SPRINT_RETRO`, `DAILY_STANDUP`.
3. Each sub-template has pre-filled blocks: title (H1 with sprint name placeholder), agenda checklist, BQL widget blocks pre-configured for sprint metrics (e.g., `{type: 'bqlwidget', metadata: {bql: 'SELECT id, title, status FROM work_items WHERE sprint_id = @currentSprint', displayType: 'table'}}`).
4. "New sprint ceremony note" quick action in the Sprint detail view (a `SaveToKnowButton` variant with the `SPRINT_CEREMONY` template pre-selected).
5. Template gallery updated to show the new template with a preview.

**Acceptance criteria**
- [ ] "Sprint Ceremony Notes" template appears in the template gallery.
- [ ] Selecting it creates an article with the ceremony-specific block structure.
- [ ] BQL widget blocks in the template auto-query the current sprint's data when the sprint is active.
- [ ] "New ceremony note" quick action from the Sprint detail view creates and opens the article.

**Validation**
- Run app: New article → Templates → Sprint Ceremony → article created with pre-filled structure; BQL widget shows sprint data.

**Merge** — Branch: `feat/know-sprint-ceremony-template` · PR: `feat(knowledge): sprint ceremony notes template`

---

### WI-KR-090 · Decision log block
**Phase** Unique | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New `decision` block type. A structured decision record: Date, Decision statement, Options considered (checklist), Decision made (highlighted), Rationale, Consequences, Decision maker (member picker), Stakeholders (@mention). Renders as a styled card in read mode. Indexed for search (KR-041).

**Build**
1. `decision` block content structure: JSON with fields above (stored in `block.content` as JSON string, or spread across `metadata`). Decide: store as JSON in `content` (simpler for search indexing).
2. Add `decision` to `TOOLBAR_GROUPS` (a "Knowledge" or "bSmart" group).
3. `DecisionBlockEditor.jsx`: structured form with labeled fields. Options considered: a mini-checklist (built-in). Decision made: a textarea with prominent styling.
4. `DecisionBlockRenderer.jsx`: a card with a `Scale` icon header, the decision statement bold, a "Why" section, consequences section, and member chips for decision maker + stakeholders.
5. `text_content` pre-update hook: include the `decision` block's fields in the serialized text for FTS indexing.

**Acceptance criteria**
- [ ] `/decision` slash command inserts a decision block.
- [ ] All fields (date, statement, options, rationale, consequences, decision maker, stakeholders) editable.
- [ ] Read mode renders as a clean decision card.
- [ ] Decision blocks appear in search results (KR-041) when searching for decision content.
- [ ] `@mention` in Stakeholders field triggers the mention picker (KR-028).

**Validation**
- Vitest: render `<DecisionBlockRenderer block={decisionBlock} />` → card with decision statement bold.
- Run app: `/decision` → fill out block → save → read mode shows decision card.

**Merge** — Branch: `feat/know-decision-block` · PR: `feat(knowledge): decision log block type`

---

### WI-KR-091 · Retrospective block
**Phase** Unique | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New `retro` block type. A four-quadrant retrospective board: What went well (green), What didn't (red), What to improve (amber), Action items (blue). Each quadrant contains a mini-list of sticky-note-style items. Items can be voted on (👍 count). Action items can be converted to work items (like KR-077).

**Build**
1. `retro` block content: `{ quadrants: { wentWell: RetroItem[], didntWork: RetroItem[], improve: RetroItem[], actions: RetroItem[] } }` where `RetroItem = { id, text, votes: number, assignee: userId|null }`.
2. Add `retro` to toolbar (bSmart group).
3. `RetroBlockEditor.jsx`: 2×2 grid of quadrant columns. Each quadrant: header + list of item textareas + "+ Add item" button. Each item: text + 👍 button (increments votes) + delete button.
4. Actions quadrant: each item has an "assignee" member picker + "→ Work item" button.
5. "→ Work item" converts the action item to a `POST /api/v1/work-items`.
6. `RetroBlockRenderer.jsx` (read mode): same 2×2 layout as a card grid; votes shown; assignee shown.

**Acceptance criteria**
- [ ] `/retro` inserts a retrospective block with 4 quadrants.
- [ ] Items can be added to each quadrant; voted on with 👍.
- [ ] Action items can be assigned to members.
- [ ] "→ Work item" on an action creates a work item linked to the article.
- [ ] Read mode shows the 4-quadrant layout with votes.

**Validation**
- Vitest: render `<RetroBlockRenderer block={retroBlock} />` → 4 quadrant sections present.
- Run app: `/retro` → add items → vote → convert action → work item created.

**Merge** — Branch: `feat/know-retro-block` · PR: `feat(knowledge): retrospective block type with voting and work-item conversion`

---

### WI-KR-092 · Release notes auto-generator
**Phase** Unique | **Effort** L | **No migration needed (uses events table + work_items)**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — A "Generate release notes" AI feature on `RELEASE_NOTES` template articles. Input: a sprint or a date range. AI queries closed work items in the period, groups them by type (Feature, Bug, Improvement), and generates a structured release notes article. One click to create from any sprint's completion view.

**Build**
1. `RELEASE_NOTES` template type: `KnowledgeTemplateType` enum value. Template in the catalog.
2. `POST /api/v1/knowledge/ai/generate-release-notes { sprintId? dateFrom? dateTo? }`:
   - Fetch closed `work_items` in the period (workspace-scoped).
   - Call AI Control Plane (Sonnet) to group and summarize by category.
   - Return `{ blocks: Block[] }` — a structured release notes document.
   - Fallback: group items by `work_item_type` using deterministic rules; generate a templated text without AI.
3. Frontend: "Generate release notes" button on the Sprint completion screen (a `SaveToKnowButton` variant with pre-filled data). Also available as a template wizard in the Knowledge section.
4. Created article has `templateType = RELEASE_NOTES`, title = "v{version} Release Notes — {date}", and linked work items via `article_work_item_links`.

**Acceptance criteria**
- [ ] "Generate release notes" for a sprint creates a RELEASE_NOTES article with work items grouped by type.
- [ ] Article is linked to all included work items.
- [ ] Fallback: AI off → deterministic grouping + template text generated.
- [ ] AI audit log records the Sonnet call.
- [ ] Cross-tenant: only work items from the requester's workspace included.

**Validation**
- Testcontainers IT: POST generate-release-notes with sprintId → article created with blocks and work item links.
- Run app: from Sprint view → Generate release notes → article created with grouped features/bugs.

**Merge** — Branch: `feat/know-release-notes-gen` · PR: `feat(knowledge): AI release notes generator from sprint work items`

---

### WI-KR-093 · OKR documentation block
**Phase** Unique | **Effort** L | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New `okr` block type. A structured OKR display: Objective statement (H2), then Key Results as a numbered list each with a progress bar (0–100%), owner (member chip), and target/current values. Linked to a BQL widget showing current work items aligned to each KR. AI generates a status summary ("On track / At risk / Off track") based on KR progress.

**Build**
1. `okr` block content: `{ objective: string, keyResults: [{ id, text, target: number, current: number, unit: string, ownerId: string, linkedBql?: string }] }`.
2. Add `okr` to toolbar (bSmart group).
3. `OkrBlockEditor.jsx`: objective textarea + dynamic list of KR rows. Each KR: text input + target/current number inputs + unit input + owner member picker + optional BQL link.
4. `OkrBlockRenderer.jsx` (read mode): Objective as H2; each KR as a row with progress bar, current/target chip, owner chip, and status badge (computed: ≥70% = on track, 40–69% = at risk, <40% = off track).
5. AI status summary: `POST /api/v1/knowledge/ai/compose mode='okr_summary'` → returns a 2-sentence status summary for the whole OKR block. Shown as a callout below the OKR list.

**Acceptance criteria**
- [ ] `/okr` inserts an OKR block with one Objective and one Key Result.
- [ ] Key Results show progress bars with computed status badges.
- [ ] Owner member chips link to the member's profile.
- [ ] AI summary callout shows "On track / At risk / Off track" with reasoning.
- [ ] Read mode renders a clean OKR card.

**Validation**
- Vitest: render OKR block with KR at 80% progress → status badge shows "On track".
- Run app: `/okr` → fill in objective and KRs → save → read mode shows progress bars and AI summary.

**Merge** — Branch: `feat/know-okr-block` · PR: `feat(knowledge): OKR documentation block with progress tracking`

---

### WI-KR-094 · Risk register block
**Phase** Unique | **Effort** M | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — New `risk_register` block type. A structured table of risks: Risk description, Likelihood (Low/Med/High), Impact (Low/Med/High), Risk score (Likelihood × Impact, computed), Mitigation, Owner, Status (Open/Mitigated/Accepted). Color-coded by risk score. Sortable by score.

**Build**
1. `risk_register` block content: `{ risks: [{ id, description, likelihood: 1|2|3, impact: 1|2|3, mitigation: string, ownerId: string, status: 'OPEN'|'MITIGATED'|'ACCEPTED' }] }`. Risk score = `likelihood × impact` (1–9).
2. Add `risk_register` to toolbar (bSmart group).
3. `RiskRegisterBlockEditor.jsx`: add row button + table with inline editable cells for each field. Likelihood and impact as 3-point dropdowns. Owner as member picker.
4. `RiskRegisterBlockRenderer.jsx` (read mode): table with color-coded rows: score 7–9 = red, 4–6 = amber, 1–3 = green. "Sort by score" toggle.
5. Risk score formula: `score = likelihood × impact`. Label: 1-2 Low, 3-4 Medium, 5-6 High, 7-9 Critical.

**Acceptance criteria**
- [ ] `/risk` inserts a risk register block with one empty risk row.
- [ ] Risk score auto-computed from likelihood × impact.
- [ ] Rows color-coded by risk level in read mode.
- [ ] "Sort by score" sorts descending.
- [ ] Owner member picker filters to workspace members.
- [ ] Risk status (Open/Mitigated/Accepted) shown as a chip.

**Validation**
- Vitest: compute score for likelihood=3, impact=3 → score=9, label="Critical".
- Run app: `/risk` → add risks → read mode shows color-coded table sorted by score.

**Merge** — Branch: `feat/know-risk-register` · PR: `feat(knowledge): risk register block type`

---

### WI-KR-095 · RACI matrix template
**Phase** Unique | **Effort** S | **No migration needed**  
**Rule books** RB-30 · RB-10

**Scope** — A `RACI_MATRIX` template type and a dedicated `raci` block type. Block displays a grid: tasks (rows) × stakeholders (columns) with RACI role assignment cells (R, A, C, I, or empty). Color-coded: R=blue, A=orange, C=green, I=neutral. Editable inline.

**Build**
1. `raci` block content: `{ tasks: string[], stakeholders: [{userId, name}], assignments: { [taskId]: { [stakeholderId]: 'R'|'A'|'C'|'I'|null } } }`.
2. Add `raci` to toolbar (bSmart group).
3. `RaciBlockEditor.jsx`: a scrollable grid. Row = task; column = stakeholder. Each cell: a small dropdown (R/A/C/I/—). "Add task" button adds a row. "Add stakeholder" uses the member picker.
4. `RaciBlockRenderer.jsx` (read mode): same grid, cells are colored badges.
5. `RACI_MATRIX` template type in the catalog with a pre-filled example grid.

**Acceptance criteria**
- [ ] `/raci` inserts a RACI block with one task and one stakeholder.
- [ ] Cells show R/A/C/I badges with correct colors.
- [ ] Adding tasks and stakeholders dynamically expands the grid.
- [ ] Template in the gallery with a usage example.

**Validation**
- Vitest: render `<RaciBlockRenderer block={raciBlock} />` → cell badges with correct RACI labels.
- Run app: `/raci` → add tasks and stakeholders → assign roles → read mode shows color-coded grid.

**Merge** — Branch: `feat/know-raci-matrix` · PR: `feat(knowledge): RACI matrix block type and template`

---

### WI-KR-096 · Knowledge health dashboard
**Phase** Unique | **Effort** L | **No migration needed**  
**Rule books** RB-10 · RB-30 · RB-40

**Scope** — A new "Knowledge Health" page in the Know section (accessible from the space settings or a dedicated nav item). Aggregates health metrics across all spaces in the workspace: stale articles (KR-021), articles with no views in 30 days, articles with 0 comments, orphaned articles (no parent, no backlinks), coverage by template type. Shown as a dashboard with cards, charts, and a filterable table. Workspace admin only.

**Analysis**
- All data is derivable from existing tables: `articles`, `events` (views), `article_block_comments`, `article_links` (backlinks). No new tables needed.
- New endpoint: `GET /api/v1/knowledge/health-dashboard?workspaceId=...` returns an aggregated DTO.
- RBAC: workspace admin only (`WORKSPACE_ADMIN` role check in service).
- Chart: article health breakdown (healthy / at risk / stale / orphaned) — a donut chart using the existing chart component.

**Build**
1. `KnowledgeHealthService.computeHealthDashboard(workspaceId)`:
   - `staleCount`: `SELECT COUNT(*) FROM articles WHERE workspace_id = :wid AND is_stale = TRUE`.
   - `noViewsCount`: articles with no `ARTICLE_VIEWED` events in last 30 days.
   - `noCommentsCount`: articles with 0 `article_block_comments` rows.
   - `orphanedCount`: articles with `parent_id IS NULL` AND no `article_links` targeting them.
   - `coverageByType`: `SELECT template_type, COUNT(*) FROM articles WHERE workspace_id = :wid GROUP BY template_type`.
   - Returns `KnowledgeHealthDTO`.
2. `GET /api/v1/knowledge/health-dashboard`.
3. Frontend `KnowledgeHealthView.jsx`: 4 metric cards (Stale, No views, No comments, Orphaned). Donut chart of health breakdown. Table: "Articles needing attention" — shows stale/orphaned/no-views articles with direct links. Filter by space or template type.
4. "Fix" quick actions on each article row: Update status → navigates to the article; Assign reviewer → opens the reviewer picker inline.

**Acceptance criteria**
- [ ] Knowledge Health page shows correct counts for stale, no-views, no-comments, orphaned articles.
- [ ] Donut chart shows health breakdown.
- [ ] "Articles needing attention" table lists articles with issues and links to them.
- [ ] Filter by space or template type narrows the table.
- [ ] RBAC: only workspace admins can access this page; other roles receive 403.
- [ ] Cross-tenant: all queries workspace-scoped.

**Validation**
- Testcontainers IT: seed stale articles + orphaned articles + articles with no comments → GET health dashboard → correct counts.
- Run app: open Knowledge Health → metrics cards show correct numbers; click a stale article → navigates to it.

**Merge** — Branch: `feat/know-health-dashboard` · PR: `feat(knowledge): knowledge health dashboard for workspace admins`

---

## Appendix — Dependency graph (key edges)

```
KR-002 (floating toolbar) → needs KR-001 (inline marks)
KR-005 (text color) → needs KR-001, KR-002
KR-011 (properties panel) → benefits from KR-021, KR-034
KR-014 (TOC pane) → needs block IDs on headings (already in BlockRenderer)
KR-017 (status badge) → prerequisite for KR-018, KR-019, KR-020
KR-025 (block comments) → prerequisite for KR-026, KR-027, KR-028, KR-030, KR-031, KR-032
KR-026 (inline comments) → needs KR-002 (selection toolbar), KR-025
KR-033 (page tree) → benefits from KR-010 (icons), KR-034 (tags), KR-035 (stars), KR-036 (recent)
KR-034 (tags) → needed by KR-011, KR-038, KR-043, KR-046, KR-075
KR-037 (space home) → benefits from KR-033, KR-047
KR-041 (full-text search) → prerequisite for KR-042, KR-043, KR-044, KR-045
KR-049 (database block) → prerequisite for KR-050, KR-051
KR-057 (whiteboard shapes) → prerequisite for KR-058, KR-059, KR-061, KR-064
KR-066 (public share link) → prerequisite for KR-069 (embed), KR-087 (public API token)
KR-067 (watchers) → needed by KR-030 (digest)
KR-073-KR-080 (AI) → all depend on AI Control Plane being operational
KR-089-KR-096 (unique) → mostly standalone; KR-092 benefits from KR-073 (AI)
```

## Appendix — Migration order reference

All migrations must use the next sequential V-number as of the execution session. **Confirm the current high-water mark in `CLAUDE.md §6` before starting any WI that creates a migration.** Do NOT rely on migration numbers written in this document — they say "V9X" as a placeholder.

When multiple WIs in the same session create migrations, order them by WI number (KR-009 before KR-010, etc.) and assign sequential V-numbers.

---

*End of KNOW-ROADMAP.md — 96 WIs, 12 layers, ready for per-session execution.*
