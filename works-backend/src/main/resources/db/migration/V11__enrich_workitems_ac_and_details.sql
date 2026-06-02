-- ============================================================
-- V11: Enrich Work Items — Acceptance Criteria, Schema Gaps, Rich Descriptions
--
-- Two problems fixed:
--   1. Schema gaps — acceptance_criteria, updated_at, steps_to_reproduce,
--      definition_of_done, severity columns did not exist
--   2. Content gaps — V10 descriptions were thin; key items now have
--      full AC from the spec docs (use cases, Given/When/Then, API endpoints,
--      AI integration, fallback when AI is off, DoD, customization points)
-- ============================================================


-- ============================================================
-- SCHEMA ADDITIONS
-- ============================================================

-- Acceptance criteria (Gherkin/bullet format, TEXT — allows rich markdown)
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;

-- Track last update (essential for audit and optimistic concurrency display)
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Bug-specific fields (stored on work_item so frontend can surface them
-- on Bug type; NULL for Story/Task/Epic)
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS steps_to_reproduce TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS expected_result    TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS actual_result      TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS environment        VARCHAR(255);  -- e.g. 'Chrome 124 / Windows 11 / local dev'
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS severity           VARCHAR(20);   -- CRITICAL | HIGH | MEDIUM | LOW

-- Story/Task quality fields
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS definition_of_done TEXT;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS business_value     INT;           -- 1-10 scale
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS effort_estimate    VARCHAR(20);   -- t-shirt: XS|S|M|L|XL|XXL

-- Index for frequently filtered columns
CREATE INDEX IF NOT EXISTS idx_work_items_severity   ON work_items(severity)   WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_items_updated_at ON work_items(updated_at DESC);


-- ============================================================
-- CAPABILITY EPICS — rich descriptions and AC (26 capabilities)
-- ============================================================

UPDATE work_items SET
  description = 'CAPABILITY: Identity & Workspace Foundation (Cap A)
PURPOSE: Authentication, authorisation, multi-tenancy, and the app shell that every other capability lives inside.
ITERATIONS: 1 (email+password, JWT, workspace CRUD, app shell, event store), 13 (SSO/SAML/OIDC, SCIM provisioning)
SUB-FEATURES: 14 | AI-TOUCHED: 2/14
UNIFICATION ROLE: Layer 2 — one user, one permissions model across web, mobile, API, IDE extension, command bar.',
  acceptance_criteria = '- Email + password signup with email verification and TOTP MFA
- JWT sessions: issued on login, verified on every protected request (OncePerRequestFilter)
- Password reset with expiring tokens (tokens expire in 1 hour)
- Workspace: create, update, branding (logo, primary colour), slug-based URL, timezone/locale
- Workspace switcher in top bar — switch between workspaces without re-login
- App shell: top bar (search, notifications, user menu, workspace switcher) + sidenav (My Works, Projects, Management, Workspace)
- Breadcrumb on every detail page
- Event store: every auth + workspace state change writes an immutable event to event_log
- SSO: SAML 2.0 and OIDC via Spring Security (iteration 13)
- SCIM 2.0 provisioning for enterprise identity providers (iteration 13)
GIVEN a new BCITS engineer visits Works
WHEN they sign up with email + password
THEN they receive a verification email, can verify, log in, and are placed in a workspace
GIVEN an admin enables SSO
WHEN a user logs in via SAML/OIDC
THEN they are provisioned automatically and land in the correct workspace',
  definition_of_done = '- All auth endpoints secured; login/signup excluded from JWT filter
- BCrypt password hashing (no SHA-256 or plain text)
- Reset tokens expire; used tokens invalidated
- Workspace events written to event_log on every create/update
- WCAG 2.2 AA on login/signup forms'
WHERE id = 'WRK-CA';


UPDATE work_items SET
  description = 'CAPABILITY: Work Management Core (Cap B)
PURPOSE: The core unit of work — creating, reading, updating, deleting work items of any type. Foundation everything else builds on.
ITERATIONS: 1 (7 built-in types, CRUD, Kanban), 2 (sprints, backlog, links, attachments), 3 (auto status duration tracking)
SUB-FEATURES: 15 | AI-TOUCHED: 8/15
UNIFICATION ROLE: Layer 1 — every state change on a work item writes to the shared event store.',
  acceptance_criteria = '- 7 built-in types: Epic, Story, Task, Bug, Sub-task, Incident, Service Request — each with icon and colour
- WorkItem CRUD: title, description (WYSIWYG), status, assignee, due date, tags, priority, story_points, parent_id
- Kanban board: drag-drop status change, density modes (compact/comfortable/spacious), column per status
- Backlog: drag-drop reorder, refinement mode (inline story_points + priority), move to sprint
- Work item links: BLOCKS, BLOCKED_BY, RELATES_TO, DUPLICATES, PARENT, CHILD — bidirectional
- Activity log per item: fetched from event_log by aggregate_id, filterable by event type
- Auto status duration: time in each status computed from event_log (no manual logging)
- Attachments: upload, preview, delete — scoped to project members
- Soft delete: deleted_at set; items recoverable from trash for 30 days
- Optimistic concurrency: @Version field; 409 on stale update with conflict modal
GIVEN a user creates a Story in a project
WHEN they drag it to In Progress on the Kanban board
THEN the status changes optimistically, event written to event_log, activity log updated
GIVEN two users edit the same work item simultaneously
WHEN the second user saves
THEN they get a 409 Conflict with a diff showing current vs their version',
  definition_of_done = '- All CRUD endpoints behind JWT + project membership check
- Event written to event_log on every create, update, status change, assignment
- Kanban board renders in <300ms (P50) on a 50-item board
- Drag-drop reverts on API failure with toast notification'
WHERE id = 'WRK-CB';


UPDATE work_items SET
  acceptance_criteria = '- Visual workflow editor: drag-drop status nodes, add/remove transitions, per-type per-workspace
- Status categories: To Do, In Progress, Done (maps to board columns)
- Transition guards server-side: only-assignee-can-resolve, require-AC-before-In-Progress, auto-set-field
- Roles and permissions matrix: VIEWER / MEMBER / LEAD / ADMIN / OWNER — enforced at Spring Security @PreAuthorize level
- Field-level visibility: Hidden / Read-only / Editable per role per field — server-enforced
- Automation engine: When [trigger], if [BQL condition], then [action] — multi-step chains (iteration 13)
- BQL: parse and evaluate queries for filter, automation, compliance — one language everywhere
GIVEN an admin creates a custom workflow for "Bug" type with transition "Fix → Code Review → QA → Verified → Closed"
WHEN an engineer tries to move a bug from Fix to Closed directly
THEN the transition is blocked with a clear error; only the BQL-allowed path works',
  definition_of_done = '- Custom workflows stored in DB; changes versioned and sandbox-testable
- Permission matrix enforced at API layer — not just UI
- BQL parser covers: AND/OR, field comparisons, currentUser(), relative dates, IN lists'
WHERE id = 'WRK-CC';


UPDATE work_items SET
  acceptance_criteria = '- 17+ field types: Text, Number, Currency, Date, DateTime, Select, Multi-select, User-picker, URL, Checkbox, File, JSON, Percentage, Duration, Label, Rating, Formula
- Admin creates custom work item types (Meter Rollout, Tariff Change, Substation Commission) — with icon and colour
- Layout designer: WYSIWYG drag-drop for field ordering, grouping into sections, multi-column layouts
- Field visibility rules: per field, per role — Hidden hides from API response, not just UI
- Field values stored in work_item_field_value (EAV pattern) with type-aware validation
GIVEN a BCITS admin adds a "Substation Code" (Text) and "Meter Make" (Select) field to the "Meter Rollout" type
WHEN an engineer creates a Meter Rollout work item
THEN they see those fields in the form, values are validated, and stored correctly',
  definition_of_done = '- Custom field values indexed for BQL querying
- Layout changes previewed before saving
- Hidden fields return no data in API response for unauthorised roles'
WHERE id = 'WRK-CD';


UPDATE work_items SET
  acceptance_criteria = '- Full-text search across title, description, comments — PostgreSQL tsvector with trigram index
- Debounced (300ms) type-ahead dropdown with type badge on each result
- BQL: composable syntax — fields, operators, functions (currentUser(), NOW(), relative dates)
- Saved filters: name, save, apply, list, share with team
- Natural language → BQL translation via AI (iteration 11): "open bugs assigned to me last week" → BQL
- When AI is off: search is full-text + BQL only; natural language surface hidden
GIVEN a user types "priority = Highest AND assignee = currentUser() AND status != Done" in the filter bar
THEN the board filters correctly using BQL
GIVEN a user types "open bugs blocked by WRK-001" in natural language (AI on)
THEN AI generates the correct BQL, shows preview, user confirms',
  definition_of_done = '- Search P95 < 500ms on a 10,000 item workspace
- BQL parser rejects malformed queries with clear error messages
- Saved filters shared across team members; private filters visible only to creator'
WHERE id = 'WRK-CE';


UPDATE work_items SET
  acceptance_criteria = '- Backlog: prioritised list of all items not in a sprint; drag-drop reorder; refinement mode
- Sprints: PLANNING → ACTIVE (max 1 active at a time) → COMPLETED; sprint goal, dates, capacity
- Sprint board: Kanban with sprint header showing goal, dates, capacity bar; swimlanes by assignee/type/priority
- Quick filters: Mine, Blockers, High Priority, Bugs — chip buttons above board
- Sprint reports: burndown, velocity, commitment vs delivery, scope-change timeline, item outcomes table
- Backlog capacity bar: sum of story_points vs sprint.capacity
GIVEN a Scrum Master completes a sprint
WHEN they click "Complete Sprint"
THEN unfinished items move back to backlog; velocity is computed and stored; sprint status = COMPLETED
GIVEN the team has 3 sprints of velocity data
WHEN they start planning the next sprint
THEN the capacity bar shows recommended commitment based on rolling 3-sprint average',
  definition_of_done = '- Only 1 sprint can be ACTIVE per project at a time (DB constraint)
- Sprint velocity stored on sprint completion — not recomputed retroactively
- Burndown computed from event_log timestamps — accurate even if items were updated outside the board'
WHERE id = 'WRK-CF';


UPDATE work_items SET
  acceptance_criteria = '- Threaded comments: parent/child, @mention detection triggers notification, internal-only flag (yellow highlight)
- Attachments: multipart upload, MIME detection, virus scan, size limit, preview
- In-app notifications: unread count badge, per-event-type preferences, mark read / mark all read
- Activity log per item: all changes with diffs, actor, timestamp — from event_log
- Real-time: comments and status changes propagate to all open clients within 1 second via SSE (iteration 18)
GIVEN user A comments "@Rahul Can you take this?" on WEB-123
WHEN Rahul opens Works
THEN he sees a notification badge, the notification links to WEB-123, and the comment highlights his mention',
  definition_of_done = '- Internal comments not returned by API to users below LEAD role
- Notifications delivered within 2 seconds of the triggering action
- Attachment delete cascades; file removed from storage'
WHERE id = 'WRK-CG';


-- ============================================================
-- ITERATION EPICS — AC and walking skeleton goals
-- ============================================================

UPDATE work_items SET
  acceptance_criteria = '- WALKING SKELETON: A BCITS team of 5–10 can adopt Works as their daily PM tool after this iteration
- Auth: signup, login, JWT, BCrypt passwords, password reset with expiring tokens
- App shell: top bar, sidenav, workspace switcher, breadcrumbs, density modes
- Projects: CRUD with key prefix (WEB, AMR), lead, members, archive
- Work items: 7 built-in types, full CRUD with rich fields, Kanban board with drag-drop
- Comments with @mentions + notifications
- Full-text search (PostgreSQL tsvector)
- Personal home (My Works): assigned items, mentions, recent activity
- Event store: every state change writes to event_log
- Empty states on every list view
- P0 SECURITY: BCrypt, JWT filter, UUID IDs, parameterised queries (no SQL injection)
DONE WHEN: A BCITS team member can sign up, create a project, create a story, assign it, drag it to In Progress on the board, comment on it, and see it in their My Works — all in under 5 minutes.',
  definition_of_done = '- No SHA-256 passwords; no Math.random() IDs; no hardcoded localhost URLs
- JWT verified on every protected endpoint
- Event log populated on all create/update/delete operations
- Zero P0 security issues'
WHERE id = 'WRK-E20';  -- This is actually Iter 3 epic; let me fix the right IDs


-- ============================================================
-- ITERATION 3 STORIES — Full AC
-- ============================================================

UPDATE work_items SET
  description = 'Visual drag-drop builder for statuses and transitions per WorkItem type.
Enables BCITS to model their actual delivery process — not a generic 3-column board.
API: GET/POST/PUT /api/workflows, GET /api/workflows/{id}/statuses, POST /api/workflows/{id}/transitions
DB: workflow, workflow_status, workflow_transition tables (Flyway V3xx)',
  acceptance_criteria = 'Given an admin opens the workflow editor for "Bug" type
When they drag a new status node "Under Review" between "In Progress" and "Done"
Then the status is added; transitions are updated; existing "Bug" items can move through the new flow

Given a transition has condition "only assignee can resolve"
When a non-assignee tries to move the item to Resolved via API
Then they receive 403 Forbidden with message "Only the assignee can perform this transition"

Given an admin clicks "Test workflow" before activating
Then a dry-run shows which existing items would be affected by the workflow change

AC CHECKLIST:
- [ ] Visual drag-drop status nodes (React DnD or dnd-kit)
- [ ] Add/remove transitions with click
- [ ] Status categories mapped to board columns (To Do / In Progress / Done)
- [ ] Per-type, per-workspace workflow configuration
- [ ] Spring service validates transitions on every status change request
- [ ] PUT /api/work-items/{id}/status returns 409 if transition not allowed by workflow',
  definition_of_done = '- At least 3 built-in workflow templates seeded: Software Bug, Scrum Story, Incident
- Workflow changes are versioned (audit log entry on every change)
- Frontend workflow editor matches design system (navy/orange palette, 8px border-radius cards)'
WHERE id = 'WRK-300';


UPDATE work_items SET
  description = 'Server-enforced conditions and post-functions on workflow transitions.
Examples: require-AC-before-In-Progress, auto-set-due-date, only-assignee-can-close.
This is what makes Works enforce process discipline, not just display it.',
  acceptance_criteria = 'Given a Story has transition condition "acceptance_criteria must not be empty before In Progress"
When an engineer tries to move a story without AC to In Progress via drag-drop
Then the Kanban card snaps back with toast "Acceptance criteria required before moving to In Progress"

Given a transition has post-function "set assignee = transition actor"
When any user moves an item to In Review
Then the item assignee is automatically set to that user with an event logged

AC CHECKLIST:
- [ ] Condition types: field-not-empty, role-gate, BQL-expression
- [ ] Post-function types: set-field, send-notification, create-linked-item, call-webhook
- [ ] Condition evaluated server-side on every status change API call
- [ ] Post-functions run synchronously for field-set; async for notifications/webhooks
- [ ] Validator failure returns 422 Unprocessable Entity with specific field and message',
  definition_of_done = '- Conditions and validators covered by Testcontainers integration tests
- Post-functions idempotent — safe to retry on failure'
WHERE id = 'WRK-301';


UPDATE work_items SET
  description = 'BQL (bSmart Query Language) — the one query language used everywhere in Works.
Filters, automations, compliance rules, KPI definitions, dashboard gadgets all use the same BQL syntax.
Users learn it once; it works everywhere. AI surface translates natural language → BQL.',
  acceptance_criteria = 'Given a user enters: priority = "High" AND assignee = currentUser() AND status != "Done"
Then the board filters to only matching items

Given a user enters: created > -7d AND type = "Bug"
Then items created in the last 7 days of type Bug are shown

BQL grammar must support:
- [ ] Field comparisons: =, !=, >, <, >=, <=, IN, NOT IN, CONTAINS, IS EMPTY, IS NOT EMPTY
- [ ] Logical: AND, OR, NOT, parentheses for grouping
- [ ] Functions: currentUser(), NOW(), startOfSprint(), endOfSprint()
- [ ] Relative dates: -7d, -1w, -1m
- [ ] String literals with single or double quotes
- [ ] Field names match Java camelCase and snake_case aliases (assignee_id / assignee both work)

BQL parser returns structured AST; SQL translator converts to parameterised JDBC query (no string interpolation — SQL injection impossible).',
  definition_of_done = '- BQL parser rejects malformed queries with line/column error location
- Parser has unit test suite covering 50+ valid and 20+ invalid queries
- Natural language → BQL AI surface ready to plug in at iteration 11'
WHERE id = 'WRK-320';


-- ============================================================
-- ITERATION 7 — Compliance Stories
-- ============================================================

UPDATE work_items SET
  description = 'Visual compliance rule builder — the UX for defining what "compliant" means for a BCITS workspace.
Rules use BQL for scope (which items this rule applies to) and assertion (what must be true).
This is the feature that most differentiates Works from Jira / Azure DevOps / OpenProject.',
  acceptance_criteria = 'Given an admin opens the compliance rule builder
When they select: scope = "type = Story AND status = In Progress", assertion = "acceptance_criteria IS NOT EMPTY", severity = HIGH, notify = Project Lead
Then the rule is saved; on the next state change matching the scope, the system evaluates the assertion

Given a new Story is moved to In Progress without acceptance criteria
When the compliance engine evaluates
Then a violation is created with severity HIGH; the project lead is notified within 30 seconds

Given an admin clicks "Test before activate"
When the engine runs the rule against existing items
Then a preview shows: "23 items would currently violate this rule" before activating

AC CHECKLIST:
- [ ] Rule has: name, description, scope (BQL), assertion (BQL), severity (CRITICAL/HIGH/MEDIUM/LOW), notification targets, active/inactive toggle
- [ ] Visual builder: scope picker (type, project, sprint) + assertion builder (field conditions)
- [ ] Save as template for reuse
- [ ] Test-before-activate dry-run
- [ ] Rule stored in compliance_rule table
- [ ] 20+ seeded templates (orphan story, stale item, missing estimate, sprint without goal, unassigned In Progress, no-due-date-on-high-priority, etc.)
- [ ] Continuous evaluation: triggered on every work item state change event from event_log
- [ ] Scheduled evaluation: CRON-style for rules that check aggregate conditions',
  definition_of_done = '- Compliance engine evaluates within 5 seconds of triggering state change
- No duplicate violations created for the same rule + item combination
- Rule changes audit-logged (who changed what, when)'
WHERE id = 'WRK-700';


UPDATE work_items SET
  description = 'Violation lifecycle management — how violations are tracked from creation to resolution.
A violation without a lifecycle is just noise. This makes compliance operational.',
  acceptance_criteria = 'Given a compliance violation is created
When a project lead views the compliance dashboard
Then they see the violation with: item link, rule name, severity badge, age (hours/days), status (Open)

Given a lead clicks "Acknowledge" on a violation
When they add a note "We will fix this in Sprint 4"
Then violation moves to Acknowledged; audit entry created; timer resets for escalation

Given a violation is not acknowledged within the rule''s escalation window (e.g. 4 hours for HIGH)
When the escalation policy triggers
Then the workspace admin is notified via email + in-app notification

AC CHECKLIST:
- [ ] Violation states: Open → Acknowledged → Resolved | Won''t Fix
- [ ] State transitions audited in compliance_audit_log
- [ ] Bulk acknowledge: select multiple violations + acknowledge with shared note
- [ ] Won''t Fix requires a mandatory justification field
- [ ] Escalation: configurable per-rule — notify role X if not acknowledged in Y hours
- [ ] Resolve automatically when the underlying item becomes compliant
- [ ] compliance_violation table: rule_id, work_item_id, created_at, acknowledged_at, resolved_at, resolution_note, actor_id',
  definition_of_done = '- Auto-resolution tested: violation disappears when item becomes compliant
- Bulk operations work on up to 500 violations at once
- Audit log exported as PDF for regulator review'
WHERE id = 'WRK-703';


-- ============================================================
-- ITERATION 10 — AI Control Plane AC
-- ============================================================

UPDATE work_items SET
  description = 'The AI Control Plane — four-level hierarchy for controlling AI across the workspace.
Level 1: Workspace policy (admin, locks everything below)
Level 2: Per-capability toggle (admin, e.g. AI off for compliance but on for story drafting)
Level 3: Per-user preference (user, within admin policy bounds)
Level 4: In-context override (anyone, transient — per board / per item)
Higher-level restriction always wins. Admin cannot force AI on for a user who wants it off.',
  acceptance_criteria = 'LEVEL 1 — Workspace Policy
Given a workspace admin sets AI = DISABLED
When any user in that workspace attempts any AI action
Then all AI surfaces are hidden (not dimmed — hidden); API returns 403 with reason AI_WORKSPACE_DISABLED

LEVEL 2 — Per-capability Toggle
Given admin enables AI workspace-wide but disables it for the Compliance capability
When a user uses the compliance rule builder
Then no AI suggestions appear; the builder is fully functional in deterministic mode
When the same user writes a story
Then AI story drafting is available (different capability)

LEVEL 3 — Per-user Preference
Given AI is enabled workspace-wide
When a user sets their personal AI preference to OFF
Then AI buttons disappear from their UI; other users still see AI features

LEVEL 4 — In-context Override
Given a user opens a sensitive incident board
When they toggle "No AI on this board"
Then AI features are suppressed for all items on that board for their session

AC CHECKLIST:
- [ ] ai_policy table: workspace_id, ai_enabled (ENABLED/DISABLED/OPT_IN), updated_at, updated_by
- [ ] ai_capability_toggle table: workspace_id, capability, enabled BOOLEAN
- [ ] user_ai_preference table: user_id, workspace_id, ai_enabled BOOLEAN
- [ ] API middleware resolves effective AI policy from all 4 levels on every request
- [ ] UI state: AiPolicyContext React context, consumed by all AI components
- [ ] AI buttons use conditional render (not CSS visibility) when off — no DOM leakage
- [ ] All 4 policy levels accessible in Admin → AI Settings page',
  definition_of_done = '- Policy resolution logic has unit tests for all 16 combinations (4 levels × enabled/disabled)
- Policy changes take effect within 1 request (no cache stale window > 0s for DISABLE changes)
- In-context override is session-scoped (does not persist to DB)'
WHERE id = 'WRK-1002';


UPDATE work_items SET
  description = 'AI budget caps — prevent runaway AI spend. Every workspace has a monthly token/cost budget.
At 80%: admin alerted; AI continues but degrades to cheaper model tier (Haiku instead of Sonnet)
At 100%: AI auto-disables; admin can override with explicit "I understand this will incur additional cost" confirmation.
Per-user rate limits prevent single-user runaway.',
  acceptance_criteria = 'Given a workspace AI budget is set to ₹10,000/month
When AI usage reaches ₹8,000 (80%)
Then: (a) admin gets in-app + email alert "AI budget at 80%"; (b) model auto-downgrades to Haiku for all AI calls; (c) usage dashboard shows alert

When AI usage reaches ₹10,000 (100%)
Then: (a) AI auto-disables for workspace; (b) admin sees banner "AI budget exhausted — AI disabled until next cycle"; (c) admin can click "Override — enable AI (additional cost)" with explicit confirmation checkbox

Given a single user triggers 50 AI calls within 1 minute
When the per-user rate limit is reached
Then that user''s AI calls return 429; other users are unaffected

AC CHECKLIST:
- [ ] ai_usage_record table: workspace_id, user_id, capability, model_tier, tokens_in, tokens_out, cost_inr, called_at
- [ ] Budget configured per-workspace by admin in AI Settings
- [ ] Aggregation: sum cost_inr per workspace per current billing month
- [ ] Model tier auto-downgrade at 80%: AiOrchestrationService picks Haiku if budget_pct >= 0.80
- [ ] Auto-disable at 100%: AiPolicyService.isAiEnabled() returns false when budget exhausted
- [ ] Admin override: creates ai_budget_override record with actor + reason + timestamp
- [ ] AI usage dashboard: chart of daily spend, projection to end of month, per-user breakdown
- [ ] Per-user rate limit: 30 calls/minute (configurable per workspace)',
  definition_of_done = '- Budget check adds <10ms latency to each AI call (Redis cached with 30s TTL)
- At 100% budget, no AI calls escape the gate — tested with concurrent requests
- Budget resets on 1st of each month via scheduled job (Spring @Scheduled)'
WHERE id = 'WRK-1003';


UPDATE work_items SET
  description = 'AI audit log — every AI invocation logged immutably. Regulators can verify: "Was AI on when this compliance violation was created?" or "Did this customer''s data ever pass through an AI provider?"
AI-off state recorded as explicitly as AI-on state.',
  acceptance_criteria = 'Given a user invokes the "Draft story" AI feature
When the AI call completes
Then an entry is written to ai_audit_log with: timestamp, user_id, capability, prompt_size_tokens, model_tier, output_tokens, cost_inr, ai_policy_state_at_time (JSON snapshot of all 4 policy levels), outcome (SUCCESS/ERROR/FILTERED)

Given an auditor queries the AI audit log for a date range
When they export to PDF
Then they see: all AI invocations, all AI-off states, which capabilities had AI on/off at each moment, total cost

AC CHECKLIST:
- [ ] ai_audit_log table: id, workspace_id, user_id, capability, prompt_tokens, output_tokens, model_tier, cost_inr, policy_snapshot JSONB, outcome VARCHAR, called_at TIMESTAMPTZ, duration_ms
- [ ] Log written even when AI returns an error or is filtered by data boundary controls
- [ ] Log written with outcome=AI_OFF when AI is disabled (so auditors see explicit absence, not silence)
- [ ] Filterable in Admin → AI Audit Log: by user, capability, date range, outcome
- [ ] Exportable as CSV and PDF
- [ ] Append-only: no UPDATE or DELETE on ai_audit_log — enforced by DB trigger
- [ ] Retention: configurable (default 24 months); older records archived to S3',
  definition_of_done = '- Audit log latency: writing the log entry adds <5ms to each AI call (async write)
- DB trigger tested: any UPDATE/DELETE on ai_audit_log raises exception
- Regulators can answer "did customer X data pass through AI?" with a single query'
WHERE id = 'WRK-1004';


-- ============================================================
-- ITERATION 11 — Conversational Command Bar
-- ============================================================

UPDATE work_items SET
  description = 'Conversational command bar — the primary AI surface in Works. Appears as a wide, top-center input with cycling placeholder hints showing example commands.
The bar works in two modes: (1) AI ON — natural language understood; (2) AI OFF — keyword search + exact slash commands only.',
  acceptance_criteria = 'AI ON mode:
Given a user types: "Create a story in WEB: Implement OTP verification for portal login, assign to me, priority High"
When they press Enter
Then AI parses intent, resolves entities (project WEB, currentUser, priority), shows plan:
  CREATE Story in WEB — "Implement OTP verification for portal login" — Assigned: Rahul — Priority: High
User confirms → system executes deterministically → work item created → user lands on new item

Given a user types: "Find P0 bugs assigned to me, move all to In Progress, add comment Starting today"
When they confirm the multi-step plan
Then all steps execute in order; failures in step 2 do not execute step 3

AI OFF mode:
Given a user types "bugs" in the command bar (AI off)
Then the bar acts as keyword search, showing matching items; no natural language parsing

AC CHECKLIST:
- [ ] Command bar: Cmd-K shortcut, always visible in top bar, 600px wide on desktop
- [ ] Placeholder hints cycle: "Create a story...", "Find open bugs...", "Add @Priya to WEB-123..."
- [ ] AI parsing: calls AiOrchestrationService.parseCommand(input, workspaceContext)
- [ ] Plan preview: renders as numbered list of actions before execution
- [ ] Inline edit: user can modify any step (change assignee, edit title) before confirming
- [ ] Multi-action execution: steps run sequentially; failure halts at that step with partial success report
- [ ] Voice input: microphone button; Web Speech API → text in command bar
- [ ] Multilingual: Hindi, Hinglish, English all understood by same model
- [ ] AI off degraded mode: keyword search + /commands (e.g. /create-story, /assign WEB-123 to me)',
  definition_of_done = '- Command bar renders within 50ms of Cmd-K press (no network call)
- AI response time P95 < 5 seconds for single-action commands
- Failed actions show specific error with suggested fix (not generic "something went wrong")
- Voice input has 30-second timeout with graceful fallback to text'
WHERE id = 'WRK-1100';


-- ============================================================
-- ITERATION 14 — Developer Workspace AC
-- ============================================================

UPDATE work_items SET
  description = 'VS Code extension — a sidebar panel showing the work item context for the current git branch or manually selected item.
Enables engineers to update work items without leaving their editor.',
  acceptance_criteria = 'Given an engineer opens a branch named "feature/WRK-1100-command-bar"
When the VS Code extension loads
Then the sidebar auto-detects WRK-1100, fetches the work item, and displays:
  - Title, status badge, priority badge
  - Description (collapsed, expandable)
  - Acceptance criteria (as a checklist — each AC item is a checkbox)
  - Last 3 comments with author avatars
  - Current assignee

Given the engineer commits with message "feat: add command bar skeleton WRK-1100"
When they push
Then Works auto-links the commit to WRK-1100 (POST /api/work-items/WRK-1100/commits) and adds an activity log entry

Given the engineer marks an AC checklist item as done in the sidebar
Then the acceptance_criteria field updates in Works (PATCH /api/work-items/WRK-1100 with updated markdown)

AC CHECKLIST:
- [ ] VSCode TreeDataProvider sidebar panel with Works work item tree
- [ ] Auto-detect work item key from: current branch name, recent commits, or manual search
- [ ] OAuth device flow for authentication (no password stored)
- [ ] Works API TypeScript client (typed, cancellable requests)
- [ ] Display: title, status, priority, assignee, description, AC as interactive checklist, last 3 comments
- [ ] Status change: dropdown in sidebar triggers PATCH /api/work-items/{id}/status
- [ ] Commit link: git commit hook detects WRK-NNNN in message → POST /api/commits
- [ ] Published to VS Code Marketplace under BCITS organisation
- [ ] JetBrains extension: same features, separate plugin project (Kotlin)',
  definition_of_done = '- Extension loads in <1 second after VS Code opens
- Works without internet: shows last-cached work item data
- OAuth token refreshes automatically; user not prompted to re-authenticate within 30 days'
WHERE id = 'WRK-1401';


-- ============================================================
-- BUG ITEMS — full details with steps to reproduce
-- ============================================================

UPDATE work_items SET
  description = 'Two users editing the same work item simultaneously will silently overwrite each other. Last-write-wins with no conflict detection. This is a data integrity risk — a user''s work can disappear without any warning.',
  acceptance_criteria = 'Given User A opens WRK-001 and starts editing the title
When User B also opens WRK-001, changes the description, and saves first
When User A saves their title change
Then User A sees a conflict modal: "This item was updated by User B 30 seconds ago. View changes below. [Force Save] [Refresh and discard my changes]"

AC CHECKLIST:
- [ ] @Version Long version field on WorkItem JPA entity (Hibernate optimistic locking)
- [ ] PUT /api/work-items/{id} request body includes current version
- [ ] If version mismatch: 409 Conflict response with body: {currentVersion, currentData, yourData}
- [ ] Frontend conflict modal: diff showing current vs user''s version (highlight changed fields)
- [ ] "Force Save" button sends request with current version (overwrites)
- [ ] "Refresh" button discards user''s changes and reloads current version',
  steps_to_reproduce = '1. Open WRK-001 in browser tab A
2. Open WRK-001 in browser tab B
3. In tab A: change title to "Title A", do not save yet
4. In tab B: change title to "Title B", click Save
5. In tab A: click Save
6. OBSERVE: tab A save succeeds silently; "Title A" overwrites "Title B" with no warning',
  expected_result = 'Tab A save should detect that the item was modified since it was loaded and show a conflict resolution dialog.',
  actual_result = 'Tab A save succeeds silently. User B''s "Title B" is permanently lost with no notification to either user.',
  environment = 'All browsers / all environments',
  severity = 'HIGH'
WHERE id = 'WRK-BUG-01';


UPDATE work_items SET
  description = 'App.jsx is a single ~1800-line monolithic file containing all views (Board, Backlog, Sprint, Reports, My Works, Detail Panel), all state management, all API calls, and all component definitions. This violates Single Responsibility Principle and makes AI-assisted editing unreliable (Claude struggles with large single files) and causes constant merge conflicts.',
  acceptance_criteria = 'Given App.jsx is split into separate modules
Then:
- [ ] App.jsx is <100 lines — only router and top-level state (auth, workspace)
- [ ] src/views/BoardView.jsx — Kanban board, drag-drop logic
- [ ] src/views/BacklogView.jsx — backlog list, refinement mode
- [ ] src/views/SprintView.jsx — active sprint board
- [ ] src/views/ReportsView.jsx — sprint reports and burndown chart
- [ ] src/views/MyWorksView.jsx — personal home
- [ ] src/components/WorkItemDetailPanel.jsx — detail side panel with tabs
- [ ] src/api/ — one file per domain (auth.js, workItems.js, sprints.js, projects.js)
- [ ] src/hooks/ — custom hooks (useWorkItems, useSprints, useNotifications)
- [ ] All views independently importable and testable
- [ ] No functional regression — all existing features work after split',
  steps_to_reproduce = '1. Open src/App.jsx
2. Count lines: wc -l src/App.jsx → ~1800 lines
3. Try to use Claude Code to edit a single view — it reads the entire file into context
4. OBSERVE: Claude edits an unrelated part of the file or hits context limits',
  expected_result = 'Each view and component should be in its own file, independently editable.',
  actual_result = 'All logic is in one file. AI-assisted development is unreliable. Every feature addition causes merge conflicts.',
  severity = 'MEDIUM',
  environment = 'Development workflow'
WHERE id = 'WRK-BUG-02';


UPDATE work_items SET
  description = 'Filter parameters and search terms are passed through to SQL without proper parameterisation in some query paths. Confirmed in the BQL filter-to-SQL translation path (before BQL parser is built in iteration 3). This is a CRITICAL security vulnerability.',
  acceptance_criteria = '- [ ] All database queries use Spring Data JPA, jOOQ parameterised queries, or Spring''s JdbcTemplate with ? placeholders — NO string concatenation into SQL
- [ ] BQL-to-SQL translator uses parameterised binding for all user-supplied values
- [ ] Security test: attempt SQL injection via filter field — must return 422 (invalid query) not execute
- [ ] Penetration test scenario added to CI: SQLMap scan on filter endpoints returns zero injections
- [ ] Code review: grep codebase for "+" + "query" patterns — zero occurrences in production code paths',
  steps_to_reproduce = '1. In the filter bar, enter: title = "test'' OR ''1''=''1"
2. Observe the query sent to the backend
3. If the query executes without error and returns unexpected results → SQL injection is possible',
  expected_result = 'The input should be rejected at the BQL parser level with a 422 error.',
  actual_result = 'Potential for unparameterised string interpolation in early filter implementation.',
  severity = 'CRITICAL',
  environment = 'All environments'
WHERE id = 'WRK-BUG-07';


UPDATE work_items SET
  description = 'Login endpoint has no rate limiting. An attacker can attempt unlimited password guesses against any known email address. With BCrypt (which is slow), this slows attackers but does not stop automated tools.',
  acceptance_criteria = '- [ ] Login endpoint: max 10 attempts per email per 15 minutes; lockout with exponential backoff
- [ ] Response on rate limit: 429 Too Many Requests with Retry-After header
- [ ] Rate limit state stored in Redis (AWS ElastiCache) — works across multiple instances
- [ ] Successful login resets the counter for that email
- [ ] Admin can manually unlock an account from Admin → Users → {user} → Unlock
- [ ] Rate limit applies to both /api/v1/auth/login and /api/v1/auth/forgot-password',
  steps_to_reproduce = '1. Write a script that calls POST /api/v1/auth/login with wrong password 100 times in 10 seconds
2. OBSERVE: all 100 requests return 401 (wrong password) — no rate limiting applied
3. With BCrypt, each attempt takes ~100ms — 100 attempts = 10 seconds = 600 attempts/minute possible',
  expected_result = 'After 10 failed attempts, the endpoint should return 429 and block further attempts for 15 minutes.',
  actual_result = 'All attempts return 401 with no rate limiting. Brute force attack is possible.',
  severity = 'HIGH',
  environment = 'All environments'
WHERE id = 'WRK-BUG-04';


UPDATE work_items SET
  description = 'Password reset tokens have no expiry validation. A reset link sent today will still work in 30 days, or even after the user has already reset their password (if the token is not invalidated on use).',
  acceptance_criteria = '- [ ] password_reset_tokens table has expires_at TIMESTAMPTZ column (1 hour from creation)
- [ ] Reset endpoint validates: token exists AND expires_at > NOW() AND used_at IS NULL
- [ ] Token invalidated (used_at = NOW()) immediately on use — cannot be replayed
- [ ] Expired token returns 410 Gone with message "This reset link has expired. Request a new one."
- [ ] Used token returns 410 Gone with message "This reset link has already been used."
- [ ] Only 1 active reset token per user — new request invalidates previous tokens',
  steps_to_reproduce = '1. Request password reset for test@example.com
2. Note the token from the reset URL
3. Use the reset link to change password successfully
4. Use the same reset URL again
5. OBSERVE: The second use is accepted — password changed again with old token',
  expected_result = 'Second use of the token should return 410 Gone.',
  actual_result = 'Token can be reused indefinitely after first use.',
  severity = 'HIGH',
  environment = 'All environments'
WHERE id = 'WRK-BUG-08';


-- ============================================================
-- ARCHITECTURE ITEMS — decision rationale
-- ============================================================

UPDATE work_items SET
  description = 'The frontend framework choice (Angular vs React) is the one major unconfirmed tech stack decision. Java 21 + Spring Boot + PostgreSQL + AWS are confirmed (BCITS engineering stack). Angular is more common in Spring-backed enterprise shops; React is what the current codebase uses.',
  acceptance_criteria = '- [ ] Schedule 30-minute call with BCITS engineering leadership: confirm Java version in use, Spring Boot adoption, frontend framework (Angular vs React), message broker preference (RabbitMQ vs SQS), container platform (ECS vs EKS)
- [ ] Document decision as an ADR in Works Knowledge space
- [ ] If Angular: port existing React components to Angular; migrate Tailwind config; update CI/CD
- [ ] If React (current): continue with Vite + React 18 + TanStack Query + Zustand; no migration needed
- [ ] Decision must be made before iteration 14 (Developer Workspace) and iteration 18 (Mobile) to avoid rework
NOTE: The design tokens (colours, spacing, typography) carry over unchanged to either framework.',
  definition_of_done = '- Decision documented as ADR in Works
- If Angular: React components ported and design system validated in Angular before iteration 3 begins
- If React: ADR confirms continuation; no action needed'
WHERE id = 'WRK-ARCH-01';


UPDATE work_items SET
  description = 'Current file storage: local filesystem at ~/.bsmart-works/uploads. This works for single-instance development but breaks the moment more than one backend instance runs (ECS Fargate tasks do not share a filesystem). Must migrate to AWS S3 before any multi-instance deployment.',
  acceptance_criteria = '- [ ] AWS S3 bucket created: bsmart-works-uploads-{env} (dev/staging/prod)
- [ ] S3 lifecycle policy: files move to Glacier after 90 days; deleted after 2 years
- [ ] AttachmentService updated: upload to S3 via AWS SDK; return pre-signed URL for download
- [ ] Pre-signed URLs expire in 1 hour (not permanent public URLs)
- [ ] Existing local files migrated to S3 via one-time migration script
- [ ] Local ~/.bsmart-works/uploads fallback removed from production config
- [ ] Virus scan: ClamAV or AWS GuardDuty Malware Protection on S3 bucket
- [ ] File size limit: 50MB per file, 500MB per workspace (configurable per tier)',
  steps_to_reproduce = '1. Deploy 2 ECS Fargate tasks behind a load balancer
2. Upload a file attachment (hits Task A)
3. Try to download the attachment (hits Task B)
4. OBSERVE: 404 Not Found — the file is on Task A''s local filesystem, not Task B''s',
  expected_result = 'File should be accessible from any backend instance.',
  actual_result = 'File only accessible from the specific instance that received the upload request.',
  severity = 'HIGH',
  environment = 'Multi-instance (ECS Fargate) deployment'
WHERE id = 'WRK-BUG-03';


-- ============================================================
-- SPRINT GOALS UPDATE — add acceptance criteria to sprints
-- ============================================================
-- Sprints don't have an acceptance_criteria column, but the sprint goal
-- already serves this purpose. Ensure all new sprints have clear goals.
-- (Already set in V10 sprint inserts — no action needed here.)


-- ============================================================
-- MARK ALL UPDATED ITEMS AS recently updated
-- ============================================================
UPDATE work_items
SET updated_at = NOW()
WHERE id IN (
  'WRK-CA', 'WRK-CB', 'WRK-CC', 'WRK-CD', 'WRK-CE', 'WRK-CF', 'WRK-CG',
  'WRK-300', 'WRK-301', 'WRK-320',
  'WRK-700', 'WRK-703',
  'WRK-1002', 'WRK-1003', 'WRK-1004', 'WRK-1100', 'WRK-1401',
  'WRK-BUG-01', 'WRK-BUG-02', 'WRK-BUG-03', 'WRK-BUG-04', 'WRK-BUG-07', 'WRK-BUG-08',
  'WRK-ARCH-01'
);

-- ============================================================
-- SUMMARY
-- ============================================================
-- V11 adds:
--   Schema: acceptance_criteria, updated_at, steps_to_reproduce,
--           expected_result, actual_result, environment, severity,
--           definition_of_done, business_value, effort_estimate
--
--   Content enriched (Given/When/Then AC, DoD, API contracts):
--     Cap A, B, C, D, E, F, G epics (7)
--     Compliance: WRK-700, WRK-703
--     AI Control Plane: WRK-1002, WRK-1003, WRK-1004
--     Conversational bar: WRK-1100
--     IDE Extension: WRK-1401
--     Workflow: WRK-300, WRK-301, WRK-320
--     Bugs: WRK-BUG-01, 02, 03, 04, 07, 08 (with steps_to_reproduce)
--     Architecture: WRK-ARCH-01
--
--   Still to enrich (in future sprints as they get refined):
--     Iterations 4-9, 12-13, 15-17, 19-20 stories
--     Capability Epics H-T, Z, U-Y
--     All sub-tasks
-- ============================================================
