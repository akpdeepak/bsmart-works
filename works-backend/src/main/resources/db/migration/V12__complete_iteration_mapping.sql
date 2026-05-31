-- ============================================================
-- V12: Complete Iteration Mapping — All Missing Sub-features
-- Spec source: 06-Complete-Iteration-Guide.docx + 05-Capability-Map-Expansion-v3_5.docx
--
-- Gap analysis: V8 + V10 vs the 20-iteration spec.
-- ~75 missing stories/tasks added, each in their correct sprint.
-- ============================================================


-- ============================================================
-- ITERATION 1 GAPS (SPR-ITER1)
-- Missing: Email notifications, Workspace branding, App shell breadcrumbs
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-085', 'Email notifications — transactional email delivery', 'Todo', 'Story',
 'Cap G · Iteration 1. In-app notifications are seeded (WRK-032) but email delivery is a separate story. BCITS engineers must get email on mentions, assignments, and daily digest even when Works is not open.',
 '- Transactional email sent on: @mention, assignment, status change (if subscribed), daily digest
- Email template uses bSmart Works brand (navy header, Inter font, orange CTA button)
- Unsubscribe link in every email (one-click, per-type)
- Smart batching: max 1 email per event per user per 5 minutes (prevents inbox flood)
- Daily digest: 6 AM IST summary of unread items, configurable time
- Email backend: AWS SES or SMTP relay configurable in application.yml
- Notification preferences (WRK-033) control which events trigger email
GIVEN Rahul is mentioned in a comment on WRK-123
WHEN the comment is saved
THEN Rahul receives an email within 60 seconds with a direct link to WRK-123',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 5, 'MEDIUM', NOW() - INTERVAL '29 days'),

('WRK-086', 'Workspace branding — logo upload and primary colour', 'Todo', 'Story',
 'Cap A · Iteration 1. Each workspace can upload a logo and set a primary colour that overrides the default BCITS orange for workspace-specific branding (e.g. customer workspaces).',
 '- Admin uploads workspace logo: PNG/SVG, max 512 KB, stored in S3 (or local dev: ~/.bsmart-works/uploads)
- Logo appears in top bar replacing the default bSmart Works logo when set
- Primary colour: hex picker, applied to primary buttons and sidebar accent in that workspace
- Colour is validated: must have >=4.5:1 contrast ratio against white text (WCAG AA)
- Logo and colour stored on workspace row: logo_url, primary_color
- Removing logo reverts to default bSmart Works logo
GIVEN an admin sets logo to bcits-logo.png and primary colour #0B2F5C
WHEN any workspace member opens Works
THEN they see the BCITS logo in top bar and navy primary buttons instead of orange',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 3, 'LOW', NOW() - INTERVAL '28 days'),

('WRK-087', 'App shell — breadcrumb navigation on all detail pages', 'Todo', 'Story',
 'Cap A · Iteration 1. Every detail page must show a breadcrumb so users always know where they are and can navigate up without using the browser back button.',
 '- Breadcrumb pattern: Works > [Project Name] > [Section] > [Item Title]
- Each segment is a clickable link
- Breadcrumb present on: work item detail, project settings, knowledge article, sprint report
- On mobile: truncated to last 2 segments with "..." prefix
- Breadcrumb uses Neutral 600 text with "/" divider (Lucide ChevronRight icon, 12px)
GIVEN a user opens WRK-123 in the WEB project
THEN breadcrumb shows: Works > WEB Portal > Board > WEB-123: Fix CSRF refresh',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER1', 2, 'LOW', NOW() - INTERVAL '27 days')

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 4 GAPS (SPR-ITER4)
-- Missing: Action items as first-class tracked artifact
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-410', 'Action items — first-class tracked artifacts from meetings and reviews', 'Todo', 'Story',
 'Cap H · Iteration 4. Meeting notes (WRK-405) emit action items. But action items must also be a first-class queryable artifact — not just a sub-section of meeting notes. Owner, due date, status, reminder.',
 '- Action item entity: action_item table (id, workspace_id, project_id, title, description, owner_id, due_date, status, source_meeting_id, source_work_item_id, created_by, created_at)
- Status: Open → In Progress → Done | Cancelled
- Emitted automatically from meeting notes (AI extracts action items from bullet points, or manual highlight-to-action)
- Standalone creation: PM can create action items outside of meetings
- Reminders: 24h before due date, on-overdue notification to owner
- RAID dashboard (WRK-406) shows overdue action items count
- Visible in: project sidebar under "PM Artifacts > Action Items", My Works > Actions tab
- Can be linked to a work item (e.g. "Action: get design approval → linked to WRK-456")
GIVEN a meeting note contains "Rahul to review the architecture doc by Friday"
WHEN AI processes the meeting note
THEN an action item is created: owner=Rahul, due=Friday, title="Review architecture doc", source=this meeting',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER4', 5, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 5 GAPS (SPR-ITER5)
-- Missing: Inline comments on articles, Article analytics, Article templates library
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-508', 'Inline comments on knowledge articles — section-level discussion', 'Todo', 'Story',
 'Cap I · Iteration 5. Readers can highlight a section of a knowledge article and leave a comment on that specific section — without editing the article or polluting the article content.',
 '- Highlight any text in an article → "Comment on this" popover appears
- Comment anchored to the selected text (stored as: article_id, character_offset_start, character_offset_end, comment_text)
- Threaded: replies to inline comments supported
- Comment indicator: orange dot margin marker next to the commented section
- Comments visible in a right panel (toggle with "N comments" button)
- Comments do not appear in the article body — separate from content
- Resolved comments collapse; unresolved shown by default
- Article author notified of new inline comments
GIVEN a reader highlights "Deploy to ECS Fargate" in the deployment runbook
WHEN they leave a comment "This step fails if the task role is missing s3:PutObject"
THEN the comment is anchored to that section; the author is notified; an orange dot appears in the margin',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 5, 'MEDIUM', NOW()),

('WRK-509', 'Article analytics — views, helpful votes, citations, stale detection', 'Todo', 'Story',
 'Cap I · Iteration 5. Articles without analytics become stale and untrustworthy. This gives authors visibility into what is being read, what is helpful, and what is out of date.',
 '- Per-article stats: total views, unique viewers, helpful votes, not-helpful votes, citations from work items
- Stale detection: article not updated in 90 days AND viewed in last 30 days → "Review needed" badge
- Article health score: computed from freshness + helpfulness + citation count
- Author sees stats on article detail page (author-only panel)
- Space admin sees analytics across all articles in the space
- Export article stats to CSV
- Most-viewed and least-helpful articles surfaced in space analytics dashboard
GIVEN an article "Deploy to ECS" was last updated 95 days ago and has 50 views in the last 30 days
THEN it shows a "Review needed" badge; the author gets an in-app notification',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 3, 'LOW', NOW()),

('WRK-510', 'Article templates library — runbook, ADR, post-mortem, onboarding, KB, troubleshooting', 'Todo', 'Story',
 'Cap I · Iteration 5. New articles start from a blank canvas without templates. This seeds 6+ built-in templates so authors start with structure, not a blank page.',
 '- Built-in templates seeded at workspace creation:
  1. Runbook: Purpose / Prerequisites / Steps / Rollback / On-call contacts
  2. Architecture Decision Record (ADR): Status / Context / Decision / Consequences / Alternatives considered
  3. Post-mortem: Incident summary / Timeline / Root cause / Contributing factors / Action items
  4. Onboarding guide: Welcome / Tools setup / First week checklist / Who to ask
  5. Customer KB article: Problem / Solution / Steps / Related articles
  6. Troubleshooting guide: Symptom / Possible causes / Resolution steps
- Template picker shown on "New article" action (not a blank editor)
- Admin can create custom templates and save them to the space library
- Templates are versioned (admin can update the template; existing articles not affected)
GIVEN a user clicks "New article" in the Engineering knowledge space
THEN they see the template picker with 6 built-in options and any custom templates',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER5', 3, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 6 GAPS (SPR-ITER6)
-- Missing: Report templates library
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-608', 'Report templates — sprint, release, project status, weekly digest, executive summary', 'Todo', 'Story',
 'Cap J · Iteration 6. The custom report builder (WRK-602) is flexible but starts blank. Templates give teams a starting point for the most common report types.',
 '- Built-in report templates seeded:
  1. Sprint Report: burndown, velocity, commitment vs delivery, item outcomes table
  2. Release Report: scope, items shipped, items deferred, known issues, release notes link
  3. Project Status: RAG (Red/Amber/Green) status, key metrics, risks, decisions, next milestones
  4. Weekly Team Digest: items done this week, blockers, upcoming, team health score
  5. Monthly Executive Summary: velocity trend, SLA compliance %, compliance posture, customer health
  6. Customer Status: open requests, SLA met %, CSAT score, recent resolutions
- Template picker on "New report" action
- Templates are a starting point — all sections fully editable after selecting
- Admin can save custom report configurations as workspace templates
- Templates respect RBAC — customer status template only visible to roles with customer data access',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER6', 3, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 8 GAPS (SPR-ITER8)
-- Missing: Multiple SLA targets per policy, SLA audit log, Bulk SLA application
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-807', 'Multiple SLA targets per policy — first response, resolution, escalation', 'Todo', 'Story',
 'Cap M · Iteration 8. A single SLA policy can have multiple targets: first response (must acknowledge within X), resolution (must close within Y), and escalation (must escalate if not progressing within Z). All tracked independently.',
 '- sla_target table: id, sla_policy_id, target_type (FIRST_RESPONSE|RESOLUTION|ESCALATION), duration_minutes, business_hours_only
- Each work item matching a policy gets one sla_record per target type
- Countdown timers: one per active target on the work item header
- First response clock stops when a team member adds a non-customer comment or changes status from New
- Resolution clock stops on terminal status (Resolved, Closed, Done)
- Escalation target: fires notification if first response OR resolution breached
GIVEN a P0 policy has targets: first response 15 min, resolution 4 hours
WHEN a P0 incident is created
THEN two countdown timers appear: "First response: 14:32" and "Resolution: 3:58:21"
WHEN a team member comments (first response)
THEN the first-response timer stops; resolution timer continues',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 5, 'HIGH', NOW()),

('WRK-808', 'SLA audit log — every start, pause, resume, breach logged immutably', 'Todo', 'Story',
 'Cap M · Iteration 8. Every SLA lifecycle event must be immutably logged. Regulators and customers need to see exactly when an SLA started, paused, resumed, breached, and was resolved — with actor and reason.',
 '- sla_audit_log table: id, sla_record_id, event_type (STARTED|PAUSED|RESUMED|BREACHED|RESOLVED), actor_id, reason, occurred_at
- Written on every SLA state change — cannot be updated or deleted (append-only)
- Visible in work item detail > SLA tab as a timeline
- Filterable by: date range, policy, team, event type
- Exportable as CSV and PDF for customer and regulator delivery
- "Why was this paused?" — reason field mandatory on pause events
GIVEN a P0 incident SLA is paused because the customer is unresponsive
WHEN the admin exports the SLA report for this incident
THEN the audit log shows: STARTED at 09:00, PAUSED at 09:47 (reason: "Waiting for customer confirmation"), RESUMED at 11:15, RESOLVED at 12:30',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 3, 'HIGH', NOW()),

('WRK-809', 'Bulk SLA application — apply policy to existing items with preview', 'Todo', 'Story',
 'Cap M · Iteration 8. When a new SLA policy is created or updated, it should be applicable to existing in-flight items — not just new ones. Bulk application with a preview before commit.',
 '- Admin selects a policy and clicks "Apply to existing items"
- Preview shows: number of items that match the WIQL scope, example items, estimated clock start time
- "Apply" creates sla_record entries for all matching items; clock starts from creation time (configurable: from now OR from item created_at)
- Items already resolved/closed are excluded from bulk application
- Bulk operation is async: progress shown in admin dashboard
- Undo: within 30 minutes of bulk apply, admin can reverse (deletes the batch-created sla_records)
GIVEN a new "P1 bugs: 16h resolution" policy is created
WHEN admin clicks "Apply to 47 existing P1 bugs in progress"
THEN a preview shows all 47 items; after confirmation, SLA clocks start; admin sees progress bar',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER8', 3, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 9 GAPS (SPR-ITER9)
-- Missing: Request types entity, Customer-facing SLA, Customer dashboard
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-907', 'Request types — Incident, Change Request, Service Request + admin-defined custom types', 'Todo', 'Story',
 'Cap N · Iteration 9. The portal (WRK-901) and forms (WRK-902) reference request types but the request type entity itself needs its own story. Admin-configurable types with icons, routing rules, and default form.',
 '- request_type table: id, workspace_id, name, description, icon, default_assignee_rule, default_priority, portal_visible, form_id
- 3 built-in types seeded: Incident, Change Request, Service Request
- Admin creates custom types: "Meter Replacement Request", "Billing Dispute", "New Connection"
- Each type has: name, icon (Lucide), colour, default form, default routing rule (round-robin / skill-based / manual)
- Portal shows type picker as the first step of request submission
- Agent queues (WRK-903) filterable by request type
GIVEN an admin creates a custom type "Meter Replacement Request" with routing to the field team
WHEN a customer submits a meter replacement request
THEN it routes to the field team queue with the correct type label and icon',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 5, 'HIGH', NOW()),

('WRK-908', 'Customer-facing SLA — countdown timer visible to customer on their portal', 'Todo', 'Story',
 'Cap M+N · Iteration 9. The SLA engine (iteration 8) powers internal SLAs. Customer portal customers must also see their SLA countdown — same timer, customer-friendly labels.',
 '- Customer portal request detail shows: "Expected resolution by [date/time]" + countdown "3h 14m remaining"
- Timer colour: green (>50% time remaining), amber (<25%), red (breached — shows "Overdue by X hours")
- Customer-facing label configured per policy: "Response time" instead of "SLA"
- When SLA is paused (e.g. waiting on customer): portal shows "Waiting for your response — SLA paused"
- Customer email notification: "Your request is approaching its response time — [X hours] remaining"
- Built on same sla_record data as internal timer — no separate calculation
GIVEN a Platinum customer has a 30-minute response SLA
WHEN they submit a request
THEN their portal immediately shows "Expected first response within 30 min" with a live countdown',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 5, 'HIGH', NOW()),

('WRK-909', 'Customer dashboard — open requests, history, SLA status, recent resolutions', 'Todo', 'Story',
 'Cap N · Iteration 9. When a customer logs into the portal, they should see a dashboard of their requests — not just a list. Status, SLA health, recent resolutions, CSAT pending.',
 '- Customer dashboard home shows:
  - Open requests: count by status (New / In Progress / Waiting on You / Resolved)
  - SLA health: % of requests meeting SLA in last 30 days
  - Recent resolutions: last 5 resolved requests with resolution time
  - Pending CSAT: resolved requests awaiting rating (prominent CTA)
  - Quick action: "Submit new request" button
- Dashboard widgets are read-only; click-through to request detail
- Data scoped to the customer organisation — customers never see other org data
- Mobile-responsive: works on phone for field engineers
GIVEN a utility customer logs into their portal
WHEN they see the dashboard
THEN they see 3 open requests, SLA health 94%, 2 pending CSAT ratings to complete',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER9', 5, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 10 GAPS (SPR-ITER10)
-- Missing: AI usage dashboard, Summarization surface, AI provider config,
--          AI sandbox/preview mode, Fallback documentation per feature
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-1010', 'AI usage dashboard — tokens consumed, cost, rate per workspace/user/capability', 'Todo', 'Story',
 'Cap Z · Iteration 10. The AI budget cap (WRK-1003) enforces limits. The AI usage dashboard shows the data that informs those limits — giving admins full visibility before they hit a cap.',
 '- Dashboard shows (per workspace, drillable to per-user and per-capability):
  - Tokens consumed this month (in / out separately)
  - Cost in INR this month vs budget cap
  - Daily spend sparkline (last 30 days)
  - Top 5 users by AI cost
  - Top 5 capabilities by AI cost
  - Projected end-of-month cost (linear extrapolation)
- Threshold alerts: orange at 80%, red at 100%
- Date range picker: current month, last month, custom range
- Export to CSV for finance/admin review
GIVEN a workspace has consumed 75% of its AI budget by day 20
WHEN the admin opens the AI usage dashboard
THEN they see the spend chart, "Projected: 113% of budget by month end", and the top users list',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 5, 'HIGH', NOW()),

('WRK-1011', 'Summarization — AI surface for comment threads, sprints, dashboards', 'Todo', 'Story',
 'Cap O · Iteration 10. The second AI surface to ship (after natural language → WIQL). Summarization is low-risk (read-only, no mutation) and high-value. Ships with the AI foundation.',
 '- Comment thread summarization: "Summarize thread" button on work items with 5+ comments → AI summary in a collapsible panel above the comments
- Sprint summarization: "Summarize sprint" on the sprint board → AI summary of what was done, what slipped, key blockers
- Dashboard widget: "AI Summary" widget that summarizes underlying data in plain language
- All summaries: non-mutating (AI reads, does not write), cached for same data state, dismissable
- Fallback when AI off: "Summarize" button hidden; full content shown as-is
- Summary length: 3-5 sentences for threads, 5-8 sentences for sprint, configurable
GIVEN a work item has 23 comments spanning 3 days of debate
WHEN a user clicks "Summarize thread"
THEN AI returns: "The team debated two approaches for the auth module. Rahul proposed JWT refresh tokens; Priya suggested session cookies for mobile. Decision: JWT (see comment by Deepak). Open action: Rahul to update the ADR."',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 8, 'HIGH', NOW()),

('WRK-1012', 'AI provider configuration — Anthropic default, future Azure OpenAI, on-prem', 'Todo', 'Story',
 'Cap Z · Iteration 10. Admin selects which AI provider the workspace uses. Default is Anthropic Claude. Future options: Azure OpenAI (for regulated customers who need data in Azure), on-prem (for air-gapped deployments).',
 '- ai_provider_config table: workspace_id, provider (ANTHROPIC|AZURE_OPENAI|ON_PREM), api_key_ref (Secrets Manager key name), model_config JSONB, active
- Admin UI: AI Settings > Provider — dropdown with available providers + API key input
- API key stored in AWS Secrets Manager — never in DB plaintext
- On save: test connection button — sends a minimal test prompt, shows latency and success/error
- Provider change: requires admin confirmation "Changing provider will affect all AI features in this workspace"
- On-prem: webhook endpoint URL + auth token (for self-hosted LLM)
- Single workspace = single provider (no per-capability provider override in v1)
GIVEN an admin selects Azure OpenAI and enters their deployment URL + API key
WHEN they click "Test connection"
THEN Works sends a test prompt, displays "Connected — 340ms latency", and saves the configuration',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 5, 'MEDIUM', NOW()),

('WRK-1013', 'AI sandbox/preview mode — test AI features without affecting production data', 'Todo', 'Story',
 'Cap Z · Iteration 10. Admin can enable a sandbox mode for AI features — AI suggestions shown but all "confirm and execute" actions are intercepted and shown as previews only, never actually executed.',
 '- Sandbox mode toggle in AI Settings (admin only)
- When sandbox is ON: a yellow "AI Sandbox Active — actions will not be executed" banner visible to all users
- In sandbox: AI proposes actions normally; user sees the confirmation plan; clicking "Confirm" shows "Sandbox: this would have [done X]" — nothing is written to DB
- AI audit log: sandbox executions logged with outcome=SANDBOX_PREVIEW
- Useful for: admin testing a new AI provider, onboarding team to AI features, demos
- Sandbox does not affect non-AI features — work item creates/edits still work
GIVEN an admin enables AI sandbox mode
WHEN a user tries to use "Create story from natural language" and confirms the plan
THEN a dialog shows "Sandbox mode: this would have created Story [title] in WEB — no action taken"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 3, 'MEDIUM', NOW()),

('WRK-1014', 'AI fallback documentation — per-feature deterministic behavior when AI is off', 'Todo', 'Story',
 'Cap Z · Iteration 10. Every AI feature must have a documented and tested deterministic fallback. This story is the engineering work to write, test, and surface that documentation in the product.',
 '- For every AI feature in iterations 10-11: document the fallback in code (AiFeature enum with fallbackBehavior field)
- Fallback table maintained in admin AI Settings > Fallback Reference:
  | Feature | AI On | AI Off |
  | Natural language → WIQL | Translates free text | Manual WIQL editor shown |
  | Summarization | Summary panel | Full content shown, no summary |
  | Smart triage | Suggested assignee/priority | Empty fields, user picks manually |
  | Story generation | AI draft | Blank template with field labels |
  | Command bar | Natural language | Keyword search + exact /commands |
- Fallback behavior tested in CI: for each AI feature, a test with AI mocked as unavailable verifies the fallback renders correctly and no exception is thrown
- Fallback documented in user-facing help tooltip next to every AI button
GIVEN AI is disabled for the workspace
WHEN any AI feature is attempted
THEN the feature either hides its AI button OR shows the deterministic fallback — no 500 errors, no blank screens',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER10', 5, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 11 GAPS (SPR-ITER11)
-- Missing: Voice input for command bar, Smart customer request routing
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-1112', 'Voice input for conversational command bar — Web Speech API', 'Todo', 'Story',
 'Cap P · Iteration 11. Microphone button in the command bar. User speaks a command; speech-to-text converts to text in the bar; AI processes as usual. Useful on mobile and for accessibility.',
 '- Microphone icon button at right end of command bar
- On click: browser requests microphone permission; recording starts with pulsing red indicator
- Web Speech API (SpeechRecognition) for browser-side STT; fallback to Whisper API if browser API unavailable
- 30-second timeout with auto-stop and graceful fallback to text input
- Recognised text appears in command bar as user speaks (interim results)
- User can edit the text before pressing Enter
- Supported languages: English, Hindi (matches WRK-1109 multilingual support)
- Microphone button hidden in secure contexts where speech API is unavailable
GIVEN a field engineer on mobile clicks the microphone button and says "create incident for substation 14 outage"
THEN the text appears in the command bar, AI processes it, and shows the plan for confirmation',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'MEDIUM', NOW()),

('WRK-1113', 'Smart customer request routing — AI auto-routes by category, tier, expertise', 'Todo', 'Story',
 'Cap N · Iteration 11. Incoming customer portal requests are manually triaged to queues. AI can auto-route based on request content, customer tier, and agent expertise — dramatically reducing triage time.',
 '- On new portal request: AI analyses title + description → suggests routing: team, assignee, priority
- Routing model considers: request type, customer tier (Platinum/Gold/Silver), keywords in description, agent workload, agent expertise tags
- "Auto-route" vs "Suggest and confirm" modes: admin configures per request type
- Auto-route: assigns without human triage; agent sees "Auto-routed by AI" badge
- Suggest: shows routing suggestion to triage agent with one-click accept
- Fallback (AI off): requests go to unassigned queue; triage agent manually assigns
- Routing accuracy tracked: agent can mark a routing as "incorrect" — this feeds model improvement
GIVEN a Platinum customer submits a portal request mentioning "metering data gap"
WHEN AI routes it
THEN it is automatically assigned to the AMR team, priority High (based on Platinum tier), with explanation "Routed to AMR team: metering keyword + Platinum SLA"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER11', 5, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 12 GAPS (SPR-ITER12)
-- Missing: Custom metric builder, Project view, Executive/Org view,
--          Voluntary sharing, Team health composite, Cycle time distribution
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-1207', 'Custom metric builder — safe formula primitives, privacy-validated', 'Todo', 'Story',
 'Cap L · Iteration 12. The default catalog (WRK-1201) covers common metrics. Custom metrics let teams define domain-specific KPIs using safe formula primitives — not raw SQL.',
 '- Formula builder: primitives — SUM, AVG, PERCENTILE(n), COUNT, RATIO, MEDIAN, STDEV
- Field references: story_points, cycle_time_hours, lead_time_hours, blocked_time_hours, comment_count, etc.
- Filters on field references: type=Bug, priority=High, status=Done
- Privacy validator: formula builder rejects any formula that would expose individual data at manager+ level
- Preview: formula evaluated against last 30 days data with sample output shown
- Named and saved: custom metric appears in the metric catalog alongside built-ins
- Dimension: per-item, per-sprint, per-team, per-project (formula must declare dimension)
GIVEN a team wants to track "Bug escape rate = Bugs found in prod / Total stories shipped"
WHEN they build this in the custom metric builder
THEN the formula is validated, previewed with last-sprint data, and saved as "Bug Escape Rate"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 8, 'HIGH', NOW()),

('WRK-1208', 'Project view — project-level KPI rollup across contributing teams', 'Todo', 'Story',
 'Cap L · Iteration 12. Between team-level and org-level there is a project-level view: how is this specific project (e.g. AMR Rollout Phase 2) performing, across all teams contributing to it.',
 '- Project view: velocity per contributing team, cross-team blockers count, open risks (from RAID), SLA compliance, sprint completion rate
- Permission: LEAD and above for that project
- Time range: current sprint, last sprint, last 3 sprints, custom
- Cross-team blockers: work item links of type BLOCKS across different teams in same project
- Drillable: click any metric to see underlying items
- Project health composite: Green/Amber/Red based on thresholds (admin configurable)
GIVEN a project has 3 contributing teams (WEB, AMR, OPS)
WHEN the project lead views the project KPI view
THEN they see each team''s velocity, 2 cross-team blockers, SLA compliance 88%, and project health = Amber',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 5, 'HIGH', NOW()),

('WRK-1209', 'Executive / Org view — cross-team velocity, SLA health, compliance posture', 'Todo', 'Story',
 'Cap L · Iteration 12. The top layer: organisation-wide trends visible to executives. No individual or team drill-down — only aggregate trends across all projects and teams.',
 '- Org view: total velocity (story points delivered per sprint, rolling 8 sprints), cross-team delivery trends, organisation SLA health (% met across all policies), compliance posture (% rules passing), customer health (aggregate CSAT, escalations)
- Access: OWNER and ADMIN roles only (or roles explicitly granted org-view permission)
- No project-level breakdown in this view — only org-level numbers (prevents identifying team weaknesses without context)
- AI narrative: "Organisation velocity is up 12% this quarter. SLA compliance declined slightly — driven by an increase in P0 incidents in September." (WRK-1205 narrative engine)
- Board-ready: one-click PDF export of org view for board deck
GIVEN the CTO opens the org KPI view
THEN they see: org velocity 340 SP/sprint (↑8%), SLA compliance 91%, compliance posture 94% rules passing, customer CSAT 4.2/5',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 5, 'HIGH', NOW()),

('WRK-1210', 'Voluntary individual sharing — engineer shares personal metrics in 1:1s', 'Todo', 'Story',
 'Cap L · Iteration 12. Personal metrics are private by default (WRK-1202). But an engineer may want to voluntarily share their metrics with their manager during a 1:1. This is their choice — managers cannot request or access without the engineer''s explicit share.',
 '- Engineer in their personal view sees "Share with..." button
- They select specific metrics to share (e.g. cycle time, not velocity) and specific people (not roles — named individuals)
- Share is time-limited: 24 hours, 1 week, or 1 sprint (engineer chooses)
- Recipient sees a shared-by banner: "Rahul shared their cycle time metrics with you for this sprint"
- Share is revocable: engineer can revoke at any time from their Privacy settings
- No manager-initiated share request — only engineer-initiated
- Audit log: sharing events logged (who shared what with whom for how long)
GIVEN Rahul wants to show his manager his cycle time improvement before his quarterly review
WHEN he clicks "Share cycle time with Deepak for this sprint"
THEN Deepak sees Rahul''s cycle time in his view with a "Shared by Rahul" badge',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 3, 'MEDIUM', NOW()),

('WRK-1211', 'Team health composite — predictability, scope stability, flow efficiency scores', 'Todo', 'Story',
 'Cap L · Iteration 12. A single composite health score per team, composed from 3 dimensions. Surfaces team health trends without reducing everything to one number that hides causes.',
 '- Three component scores (0-100):
  1. Predictability: % of committed story points delivered (rolling 3 sprints). Formula: AVG(delivered/committed * 100)
  2. Scope stability: 100 - (scope_added_mid_sprint / total_sprint_scope * 100). Lower scope churn = higher score.
  3. Flow efficiency: active_time / (active_time + wait_time). From status duration data (WRK-706).
- Composite: weighted average (40% predictability, 35% scope stability, 25% flow efficiency)
- Thresholds: Green ≥80, Amber 60-79, Red <60
- Trend: sparkline over last 6 sprints
- Breakdown: each component score shown on hover so teams see what to improve
GIVEN a team has predictability 82%, scope stability 65%, flow efficiency 71%
THEN composite = (82×0.4) + (65×0.35) + (71×0.25) = 32.8 + 22.75 + 17.75 = 73.3 → Amber',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 5, 'HIGH', NOW()),

('WRK-1212', 'Cycle time distribution — histogram with median, P85, outlier flagging', 'Todo', 'Story',
 'Cap L · Iteration 12. Average cycle time hides the distribution. A histogram showing where items cluster — with median, P85, and flagged outliers — gives the team actionable insight.',
 '- Histogram: X-axis = cycle time buckets (0-1d, 1-2d, 2-3d, 3-5d, 5-8d, 8d+), Y-axis = item count
- Median and P85 lines marked on the histogram
- Outliers (>2 standard deviations above mean) shown in red; clickable to see the items
- Filters: by type (Story/Bug/Task), by sprint, by date range
- Drill-down: click a bucket → list of items in that cycle time range
- Excludes items with no completed status (never reached Done)
- Context tooltip: "50% of stories complete in under 2.3 days. 15% take more than 6 days."
GIVEN the team''s last 3 sprints have cycle times ranging from 0.5d to 12d
WHEN they open the cycle time distribution
THEN they see a histogram; median = 2.1d, P85 = 5.8d; 3 outliers in red (8d, 10d, 12d) — clicking one shows WRK-234 was blocked for 7 days',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER12', 5, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 13 GAPS (SPR-ITER13)
-- Missing: Scheduled automations, Automation library/templates,
--          Automation audit log, Calendar connector
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-1308', 'Scheduled automations — cron-style rules with time-based triggers', 'Todo', 'Story',
 'Cap C · Iteration 13. The automation engine (WRK-1300) handles event-driven triggers. Scheduled automations run on a time schedule — "Every Monday 9 AM, post sprint summary to team channel."',
 '- Scheduled automation: trigger type = SCHEDULED with cron expression (user-friendly picker: daily/weekly/monthly + time + timezone)
- Examples seeded:
  - "Every Monday 9 AM: post sprint health to #engineering Slack channel"
  - "Every Friday 5 PM: send weekly digest email to project stakeholders"
  - "First day of sprint: create standup reminder in project"
  - "7 days before sprint end: flag items not started"
- Cron execution via Spring @Scheduled or Quartz scheduler (persistent — survives restarts)
- Execution logged in automation_run table with: scheduled_at, executed_at, outcome, items_affected
- Missed execution handling: if server was down, scheduled automation runs on next startup (configurable: skip or run)
GIVEN an automation is scheduled "Every Monday 9 AM IST, close stale bugs unchanged for 30 days"
WHEN Monday 9 AM arrives
THEN all matching bugs are closed; automation_run entry created; 3 engineers notified of auto-closure',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 5, 'HIGH', NOW()),

('WRK-1309', 'Automation library / templates — pre-built rules, one-click install', 'Todo', 'Story',
 'Cap C · Iteration 13. Most teams need the same automation rules. A template library removes the setup burden and seeds good practices.',
 '- Built-in automation templates (pre-installed at workspace creation):
  1. "Auto-assign incoming Incidents to on-call" (uses on-call schedule from user tags)
  2. "When bug moved to Done, link to release version"
  3. "When sprint starts, notify team in Slack"
  4. "When item overdue 3+ days, add Blocked tag and notify assignee"
  5. "When P0 created, immediately notify #incidents and set SLA"
  6. "Weekly: close Resolved items not updated in 7 days"
  7. "When PR merged (GitHub), transition work item to In Review"
- Template picker on "New automation" action — same UX as article templates
- Templates are pre-configured but editable after installation
- Community templates: future marketplace feature (placeholder in template picker)
GIVEN an admin opens the automation builder and clicks "Start from template"
THEN they see the 7 built-in templates; selecting "When P0 created, notify #incidents" pre-fills all fields; admin adjusts the Slack channel and saves',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 3, 'MEDIUM', NOW()),

('WRK-1310', 'Automation audit log — every run logged with inputs, outputs, failures', 'Todo', 'Story',
 'Cap C · Iteration 13. Automations that fail silently cause data quality issues. An audit log of every automation run — with full inputs, outputs, and failure reasons — makes automations trustworthy.',
 '- automation_run table: id, automation_rule_id, triggered_at, executed_at, trigger_data JSONB, outcome (SUCCESS|PARTIAL|FAILED|SKIPPED), items_affected INT, error_message TEXT, duration_ms
- Failure tracking: if any step in a multi-step automation fails, the run is logged as PARTIAL with details of which step failed
- Admin UI: Automation > [rule name] > Run History — list of last 100 runs with status, items affected, duration
- Filter: by outcome, date range
- Retry: admin can manually retry a FAILED run from the audit log
- Alert: if an automation fails 3 times in a row → admin gets in-app + email alert "Automation [name] has failed 3 consecutive times"
GIVEN an automation "When P0 created, notify Slack" fails because the Slack webhook is expired
WHEN admin opens the automation run history
THEN they see the failure with reason "Slack webhook returned 404", the specific items that triggered it, and a Retry button',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 3, 'HIGH', NOW()),

('WRK-1311', 'Calendar connector — Google Calendar and Outlook sync for sprints and ceremonies', 'Todo', 'Story',
 'Cap Q · Iteration 13. Sprint dates and scrum ceremonies should appear automatically in the team''s calendar. No separate calendar invite management.',
 '- OAuth 2.0 connection to Google Calendar or Microsoft Outlook (admin configures, users authorise individually)
- Auto-create calendar events for:
  - Sprint start / sprint end (all sprint days)
  - Sprint planning (day 1 of sprint, configurable duration)
  - Sprint review / demo (last day of sprint, configurable)
  - Retrospective (last day of sprint, after review)
  - Daily standup (recurring daily Mon-Fri for sprint duration)
- Attendees: all sprint members
- Event description: includes sprint goal, Works link to sprint board
- On sprint complete: events are marked "Completed" (description updated)
- Bi-directional: Works standup time respects calendar busy time in focus mode (WRK-1403)
GIVEN a sprint "Sprint 5 — Portal Auth" starts on June 2
WHEN the sprint is activated
THEN a calendar event "Sprint 5 Planning" appears in all team members'' Google Calendars; daily standup events for June 2-13; a sprint review event on June 13',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER13', 5, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 14 GAPS (SPR-ITER14)
-- Missing: Time blocking, Code context on work item,
--          Commit↔item linking (standalone), PR↔item linking, Pair/mob sessions
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-1410', 'Time blocking — calendar-integrated focus block scheduler', 'Todo', 'Story',
 'Cap U · Iteration 14. Engineers can schedule focus blocks in Works; these sync to their calendar (via WRK-1311 calendar connector) and activate focus mode (WRK-1403) automatically.',
 '- Focus block: start time, end time, label (e.g. "Deep work: WRK-1100"), repeat (none/daily/Mon-Fri)
- Focus blocks visible on the Developer Workspace home timeline
- Calendar sync: creates a "Busy" block in Google/Outlook with title "Focus: [label]"
- During focus block: focus mode (WRK-1403) activates automatically — notifications suppressed
- Works status: user shows as "Focusing until [time]" on their avatar across the app
- Team awareness: team members see the engineer is in focus (cannot @mention for non-P0)
- Respect: focus blocks suggested by AI based on deep-work best practices (morning, ≥2h blocks)
GIVEN an engineer schedules a focus block 10 AM–12 PM with label "WRK-1100 command bar"
THEN a "Busy" block appears in their Google Calendar; at 10 AM Works auto-enables focus mode; colleagues see "Focusing until 12:00" on the engineer''s avatar',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 3, 'MEDIUM', NOW()),

('WRK-1411', 'Code context on work item — commits, branches, files touched, PR status', 'Todo', 'Story',
 'Cap U · Iteration 14. A work item without code context forces tab-switching. Showing commits, branches, files, and PR status alongside the work item gives engineers all context in one place.',
 '- Work item detail > Code tab shows:
  - Linked branches: branch name, created by, last commit
  - Linked commits: SHA (truncated), message, author, timestamp, clickable to GitHub/GitLab
  - Linked PRs: PR title, status (Open/Merged/Closed), reviewer avatars, CI status (green/red/pending)
  - Files touched (aggregated across linked commits): file paths, change count
- Data fetched via GitHub/GitLab connector (WRK-1306)
- If no commits/PRs linked: "Link a branch or PR — use WRK-NNNN in your branch name or commit message"
- PR status syncs in real time via webhook from GitHub/GitLab
GIVEN WRK-1100 has 3 commits and a merged PR #47
WHEN the engineer opens the Code tab on WRK-1100
THEN they see: branch "feature/WRK-1100-command-bar", 3 commits with messages and SHAs, PR #47 "Merged" with green CI check, 12 files touched',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'HIGH', NOW()),

('WRK-1412', 'Commit ↔ work item linking — auto-detect key in commit messages, bi-directional', 'Todo', 'Story',
 'Cap U · Iteration 14. When an engineer commits with "WRK-1100: add command bar skeleton", Works auto-links the commit to WRK-1100. Bi-directional: work item shows the commit; commit shows the work item.',
 '- GitHub/GitLab webhook: on push event, scan commit messages for WRK-NNNN pattern (regex: [A-Z]+-\d+)
- On match: POST /api/work-items/{key}/commits with commit SHA, message, author, timestamp, repo URL
- work_item_commit table: work_item_id, commit_sha, message, author_name, author_email, committed_at, repo_url
- Bi-directional: Code tab on work item shows the commit; commit in GitHub shows the Works item (via commit status API)
- Multi-item: "WRK-1100 WRK-1101: shared command bar logic" links to both items
- Branch naming convention: Works suggests branch name "feature/WRK-NNNN-short-title" on item create
- Status update: when commit message contains "closes WRK-1100" or "fixes WRK-1100" → item auto-transitions to Done (configurable per workspace)
GIVEN an engineer commits "feat: WRK-1100 add Cmd-K shortcut"
THEN WRK-1100 Code tab shows this commit; GitHub commit detail shows "Linked to WRK-1100"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'HIGH', NOW()),

('WRK-1413', 'PR ↔ work item linking — GitHub/GitLab PR auto-links, status syncs', 'Todo', 'Story',
 'Cap U · Iteration 14. Pull Requests are as important as commits. PR title with WRK-NNNN auto-links; PR status (open, merged, closed) syncs to the work item in real time.',
 '- GitHub/GitLab webhook: on PR open/update/merge/close, scan PR title and body for WRK-NNNN
- On match: link PR to work item; store: pr_number, pr_title, pr_url, pr_status, repo, author, ci_status
- work_item_pr table: work_item_id, pr_number, pr_url, pr_title, pr_status (OPEN|MERGED|CLOSED), ci_status (PENDING|PASSING|FAILING), author_id, created_at, merged_at
- Status sync: on PR merge → work item optionally auto-transitions (configurable: e.g. MERGED → In Review or Done)
- CI status: from GitHub Actions / GitLab CI webhook; shown as green/red/pending badge on PR in Works
- PR review status: shows how many reviewers approved vs requested changes
GIVEN a PR "feat: WRK-1100 command bar — initial implementation" is opened on GitHub
THEN WRK-1100 immediately shows the PR in its Code tab with status Open, CI Pending; when CI passes → CI badge turns green; when PR is merged → status updates to Merged',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 5, 'HIGH', NOW()),

('WRK-1414', 'Pair / mob programming sessions — multi-engineer attribution on a work item', 'Todo', 'Story',
 'Cap U · Iteration 14. When two or more engineers work on the same item together, both should get attribution — for cycle time, for velocity (shared), and for the activity log.',
 '- Work item: "Add co-worker" button → multi-assignee for pair/mob sessions (up to 5 engineers)
- All co-workers see the item in their personal My Works view
- Activity log: state changes during a session attributed to the active engineer; session start/end logged
- Velocity: story points split equally among co-workers when the item is completed (configurable: full credit to all, or split)
- Personal velocity (WRK-1405): each co-worker gets contribution credit
- Session mode: optional — engineers can mark a time-boxed session "Mob session: 2 PM–4 PM WRK-1100 with Rahul, Priya"
- Cycle time: computed from first co-worker assignment to completion (not split by engineer)
GIVEN Rahul and Priya pair on WRK-1100 for 2 hours
WHEN WRK-1100 is completed
THEN both appear in the completed-by field; both get 50% velocity credit; activity log shows "Pair session: Rahul + Priya" ',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER14', 3, 'LOW', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 15 GAPS (SPR-ITER15)
-- Cap V missing: Sprint review prep, Sprint goal builder, Working agreements,
--                Velocity & predictability dashboard, Capacity planner
-- Cap W missing: Idea capture, Feature voting, Release planning,
--                Stakeholder communication, Theme tracking,
--                Discovery/spike management, Customer interview log
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

-- Cap V missing items
('WRK-1517', 'Sprint review prep — auto-draft sprint summary, demos list, metrics for stakeholders', 'Todo', 'Story',
 'Cap V · Iteration 15. Sprint review meetings need a summary of what shipped, what slipped, and key metrics. AI drafts this from sprint data; SM edits and presents.',
 '- Available from the last 2 days of an active sprint
- AI generates: shipped items list (type, title, story points), slipped items (with reason if available), sprint metrics (velocity, commitment accuracy, scope changes), team highlights
- SM can edit the draft before sharing
- Export: PDF "Sprint X Review" and shareable read-only Works link
- Demo list: SM marks specific items as "demo in review" — ordered list with owner and demo notes
- Stakeholder delivery: one-click "Send sprint review summary" emails the PDF to stakeholders (from WRK-1515 stakeholder map)
GIVEN Sprint 5 is in its last day
WHEN SM clicks "Prepare sprint review"
THEN AI generates a draft: "Shipped: 8 stories (24 SP). Slipped: 2 stories (6 SP) — moved to backlog. Velocity: 24 SP. Commitment accuracy: 80%." SM edits and shares.',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),

('WRK-1518', 'Sprint goal builder — AI helps draft sprint goal from selected items', 'Todo', 'Story',
 'Cap V · Iteration 15. Sprint goals are often generic. AI can draft a meaningful sprint goal from the selected backlog items. Goal is visible across the sprint board, backlog, and reports.',
 '- Sprint planning screen has a "Draft sprint goal" button
- AI reads selected items titles/descriptions → proposes a concise goal (1-2 sentences)
- SM edits before saving
- Sprint goal visible: sprint board header, backlog sprint section header, sprint report, standup facilitator
- Goal tagged as: delivery-focused, quality-focused, risk-reduction, learning, or mixed
- Works warns if no sprint goal set when sprint is started: "Sprint started without a goal — set one now?"
GIVEN the SM selects 10 items focused on the portal auth and SAML
WHEN they click "Draft sprint goal"
THEN AI proposes: "Stabilise portal authentication — ship SAML SSO and fix all P0 auth bugs." SM shortens to "Ship SAML SSO and close all P0 auth bugs."',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 3, 'MEDIUM', NOW()),

('WRK-1519', 'Working agreements — team-level DoD, DoR, norms documented in cockpit', 'Todo', 'Story',
 'Cap V · Iteration 15. Definition of Done, Definition of Ready, and team norms are critical but usually live in a wiki nobody reads. Surfacing them during ceremonies makes them actionable.',
 '- Working agreements stored per team (not project — team-scoped)
- Built-in categories: Definition of Done, Definition of Ready, Team Norms, Communication norms
- Surfaced during ceremonies: standup start shows DoD reminder; sprint planning shows DoR checklist
- SM can review and update agreements in the cockpit settings
- DoD checklist: each criterion is a checkbox — SM marks which apply during sprint review
- DoR checklist: shown during backlog refinement — items that don''t meet DoR flagged in refinement view
GIVEN the team''s DoR requires "story has acceptance criteria before sprint planning"
WHEN SM opens sprint planning and sees a story without AC
THEN the story is flagged with a "Not Ready" badge and a tooltip showing the violated DoR criterion',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 3, 'MEDIUM', NOW()),

('WRK-1520', 'Velocity & predictability dashboard — per-team rolling metrics with trend', 'Todo', 'Story',
 'Cap V · Iteration 15. Velocity and predictability are the two metrics SMs watch most. A dedicated dashboard with rolling trend makes patterns visible at a glance.',
 '- Velocity chart: story points delivered per sprint, last 8 sprints, bar chart with rolling 3-sprint average line
- Predictability chart: committed vs delivered per sprint, % accuracy, rolling 3-sprint average
- Scope change chart: points added mid-sprint vs initial commitment, per sprint
- Filters: by team, by sprint range
- Annotations: SM can add notes to specific sprints ("Sprint 5: 2 members on leave")
- Accessible at: SM Cockpit > Team Health > Velocity
- Export: PNG for reports
GIVEN a team has delivered 20, 18, 25, 22, 19 SP in the last 5 sprints
THEN the chart shows the bar chart with a rolling average line at ~21 SP; predictability shows % per sprint',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),

('WRK-1521', 'Capacity planner — team capacity with PTO, on-call, focus-time deductions', 'Todo', 'Story',
 'Cap V · Iteration 15. Sprint planning without capacity awareness leads to overcommitment. A capacity planner deducts PTO, on-call rotations, and focus-time to give a realistic capacity number.',
 '- Per sprint, per team member: total working days, PTO days (manually entered), on-call days, ceremony overhead (planning, review, retro, standups = ~10% of sprint)
- Net capacity per member in story points (configurable average SP/day per person)
- Team total capacity: sum of member capacities
- Capacity bar in backlog/sprint planning auto-uses this number (replaces the manual sprint.capacity field)
- Historical comparison: recommended capacity = 80% of rolling 3-sprint average velocity
- Alert: if sprint commitment exceeds 100% of planned capacity → warning banner in sprint planning
GIVEN Rahul has 2 days PTO and 1 on-call day in a 10-day sprint, average 3 SP/day
THEN his capacity = (10 - 2 - 1) × 3 × 80% = 16.8 SP shown in the capacity planner',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),

-- Cap W missing items
('WRK-1522', 'Idea capture inbox — lightweight inbox for new ideas, promotes to story when ready', 'Todo', 'Story',
 'Cap W · Iteration 15. Ideas come from everywhere — customers, teammates, market observations. An idea inbox captures them quickly without creating a full story. PO promotes to story when ready.',
 '- Idea: lightweight form — title, description (optional), source (customer/internal/market), area (auto-classified by AI from title)
- Idea inbox separate from backlog — uncluttered, low-friction
- AI auto-classifies: area (auth, reporting, mobile, integration), type (feature, improvement, bug-observation)
- Duplicate detection: AI flags if a new idea is similar to an existing idea or story
- Status: New → Under Review → Promoted to Story | Rejected (with reason)
- Promote to Story: one click converts idea to a full story in the backlog with idea as description seed
- PO review queue: shows all ideas sorted by submission date, with filter by area and source
GIVEN a support engineer logs idea "Customers want bulk download of their consumption reports"
WHEN AI processes it
THEN it is classified as: area=Reports, type=Feature; similar idea "Bulk export" (70% match) is flagged; PO reviews and promotes to Story with one click',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 3, 'MEDIUM', NOW()),

('WRK-1523', 'Feature voting — customer-facing voting on backlog ideas via portal', 'Todo', 'Story',
 'Cap W · Iteration 15. POs make better prioritisation decisions when they know which features customers actually want. Customer-facing feature voting connects the backlog to real customer demand.',
 '- PO can mark specific backlog items or ideas as "Open for voting" — they appear in the customer portal''s "Feature Requests" section
- Customer portal users: upvote features they want, leave a comment explaining their use case
- Vote tally visible to PO in the backlog (vote count badge on item)
- PO can close voting: "Shipped", "In backlog", "Not planned (with reason)"
- Voting does not determine priority automatically — it is an input signal, not the sole driver
- Customer email notification when a feature they voted for ships: "Your requested feature is now live!"
GIVEN the PO marks "Bulk report download" as open for voting
WHEN 12 customers upvote it with comments about their use cases
THEN the backlog item shows "12 votes" badge; PO sorts backlog by vote count to see demand signal',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'MEDIUM', NOW()),

('WRK-1524', 'Release planning — drag-drop items into releases, scope vs date tradeoffs', 'Todo', 'Story',
 'Cap W · Iteration 15. POs plan releases by dragging ready items into a release, visualising the scope and its impact on the target date.',
 '- Release: name, target date, status (Planning/Locked/Shipped), description, release notes link
- Release planning view: two-column — "Ready for release" (backlog items meeting DoR) and "In this release"
- Drag-drop items between columns to add/remove from release scope
- Scope indicator: story points in release vs team velocity → estimated sprints to complete
- Date impact: if scope increases beyond velocity-based capacity, date shows "At risk: estimated N weeks"
- Scope lock: PO can lock a release — no new items can be added without explicit unlock
- Release notes auto-draft (WRK-1514) triggered from release planning screen
GIVEN Portal v4.2.0 has 45 SP of scope and team velocity is 22 SP/sprint
WHEN PO views the release plan
THEN they see "~2 sprints to complete. Target: June 30. Status: On track" with a scope bar',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'HIGH', NOW()),

('WRK-1525', 'Stakeholder communication — targeted release/status updates to stakeholder map', 'Todo', 'Story',
 'Cap W · Iteration 15. The stakeholder map (WRK-1515) lists who cares about what. Stakeholder communication uses this map to send targeted updates — not blast emails to everyone.',
 '- PO composes an update: topic (release/status/risk/decision), subject, body (rich text or from release notes)
- Works suggests which stakeholders to notify based on: their stated interests, the topic, the affected epic/theme
- PO can include/exclude suggested stakeholders before sending
- Delivery: in-app notification (if they have Works access) OR email (if portal-only stakeholder)
- Sent updates logged: who received what, when, open rate (if email)
- Stakeholder response: stakeholders can reply (reply goes to PO''s Works inbox)
GIVEN a new release "Portal v4.2.0" ships
WHEN PO clicks "Notify stakeholders"
THEN Works suggests 5 stakeholders who have interest in "portal" and "auth"; PO removes 1, sends to 4; each gets a targeted email "Portal v4.2.0 is now live — what changed for you"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 3, 'MEDIUM', NOW()),

('WRK-1526', 'Theme tracking — strategic themes spanning multiple epics and sprints', 'Todo', 'Story',
 'Cap W · Iteration 15. Strategic themes connect multiple epics across multiple sprints to a business objective. POs track progress at the theme level — above epics, below OKRs.',
 '- Theme: name, description, owner, start date, target date, linked OKR (optional), status (Active/Paused/Completed)
- Theme ↔ Epic relationship: many-to-many (an epic can contribute to multiple themes)
- Theme progress: % of linked epic story points completed
- Theme roadmap view: themes on a timeline with epic swimlanes underneath
- Rollup: work items → epics → themes → OKRs (full traceability)
- Theme health: Green/Amber/Red based on progress vs time elapsed
GIVEN theme "Utility Portal Modernisation" has 3 linked epics across 4 sprints
WHEN PO views the theme tracker
THEN they see progress 62%, status Amber (behind schedule by 1 sprint), contributing epics listed with their status',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 5, 'MEDIUM', NOW()),

('WRK-1527', 'Discovery / spike management — lightweight tracking for research and prototypes', 'Todo', 'Story',
 'Cap W · Iteration 15. Discoveries and spikes are time-boxed research tasks. They need tracking but are not stories — they have a time-box, a question, and an outcome (not acceptance criteria).',
 '- Discovery/Spike work item type (in addition to the 7 built-in types)
- Fields: question to answer (replaces description), time-box (hours or story points), owner, outcome (filled on completion), linked stories (discoveries often lead to stories)
- Time-box visible on board: spike item shows "8h" or "3 SP" badge
- Outcome types: Implemented / Proof of concept / Rejected / Needs more investigation
- Spike board section: in backlog, spikes shown in a separate section from stories
- Auto-expire: if spike is not completed within time-box × 1.5, it is flagged as overdue
GIVEN the team needs to research "Can we use WebAuthn for mobile login?"
WHEN a spike is created with time-box 8h and owner Priya
THEN it appears in the backlog spike section; when Priya completes it with outcome "Implemented — see PoC in WRK-1900", the outcome is linked to the passkey story',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 3, 'MEDIUM', NOW()),

('WRK-1528', 'Customer interview log — structured capture of customer conversations linkable to features', 'Todo', 'Story',
 'Cap W · Iteration 15. Customer insights often live in PO''s notes or memory. A structured interview log captures the conversation, the customer, and the features they mentioned — making insights searchable and linkable.',
 '- Customer interview: date, customer name/org, interviewer, interview type (discovery/validation/churn/NPS), summary, key quotes, pain points, feature requests mentioned
- Feature requests from interview: one-click create → idea in idea inbox (WRK-1522) with interview as source
- Linkable: interview can be linked to backlog items ("this story was validated by 3 customer interviews")
- Interview log visible in: PO Workspace > Customer Intelligence > Interview Log
- AI: after interview is saved, AI extracts key themes and pain points as tags
- Privacy: interview details visible only to LEAD and above (customer names are sensitive)
GIVEN Deepak interviews a utility customer and notes "they struggle with understanding their consumption report"
WHEN the interview is saved
THEN AI tags it: pain_point=reporting, segment=utility; an idea "Improve consumption report readability" is created in the inbox with this interview as source',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER15', 3, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 16 GAPS (SPR-ITER16)
-- Cap X missing: Risk portfolio, Strategy-to-execution map, Decision register access,
--                Investment summary, Anomaly detection, Drill-down with privacy, Goal cascade
-- Cap Y missing: Bulk config ops, Audit log explorer, Integration health dashboard,
--                Anomaly detection (security), Role consolidation analyzer,
--                Data retention policies, Workspace backup & restore, Operations playbook library
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

-- Cap X missing
('WRK-1616', 'Risk portfolio — all open risks across projects, ranked by impact × probability', 'Todo', 'Story',
 'Cap X · Iteration 16. The RAID log (iteration 4) captures risks per project. The leadership risk portfolio aggregates all open risks across all projects — ranked so leaders see the top threats organisation-wide.',
 '- Aggregates risks from all projects under the leader''s scope
- Ranked by: impact (1-5) × probability (1-5) = risk score (1-25)
- Top 10 risks shown in a ranked list with: risk title, project, owner, risk score, days open, mitigation status
- Heatmap: 5×5 probability/impact grid with risk dots (click dot to see risk details)
- Filters: by project, by risk category, by owner, by mitigation status
- Drill-down: click a risk → opens the risk detail from the RAID log (WRK-400)
- AI: flags risks that have been open >30 days with no mitigation update as "Stale — needs owner attention"
GIVEN the org has 23 open risks across 5 projects
WHEN the VP opens the risk portfolio
THEN they see top 10 ranked: "Risk: Substation 14 land dispute — Score 20 (impact 5, prob 4) — WEB project — Open 18 days — Mitigation: legal team engaged"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1617', 'Strategy-to-execution map — visual link from OKRs/themes to specific work items', 'Todo', 'Story',
 'Cap X · Iteration 16. Leaders need to see that strategic goals are actually connected to the work being done. The strategy-to-execution map shows the chain: OKR → Theme → Epic → Story → Task.',
 '- Visual tree: OKR (top) → Theme → Epic → Story (leaves visible on expand)
- Progress rollup: % complete at each level (calculated from story points done / total)
- Colour coding: Green (on track), Amber (behind), Red (at risk or no linked work)
- Click any node to open the linked item
- "Orphaned work" alert: epics with no theme and stories with no epic flagged in the map
- "Orphaned OKR" alert: OKRs with no linked themes flagged as "No execution plan"
- Export: PDF or PNG for quarterly strategy reviews
GIVEN OKR "Improve utility customer experience" links to theme "Portal Modernisation" links to 3 epics
WHEN the CTO opens the strategy-to-execution map
THEN they see the full chain with progress bars; clicking "Portal Modernisation" expands to show the 3 epics and their % complete',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1618', 'Decision register access — searchable cross-project decision history for leaders', 'Todo', 'Story',
 'Cap X · Iteration 16. Decisions are captured per-project in the RAID log (iteration 4). Leaders need a cross-project view to answer "what major decisions have been made, and why?"',
 '- Leadership Console > Decisions: aggregated decision register across all projects
- Searchable by: keyword, project, date range, decision maker, decision type (architecture/process/product/vendor)
- Sorted by: date (newest first), or by related risk count, or by project
- Each decision shows: title, summary, date, project, owner, alternatives considered, rationale (collapsed, expandable)
- Filter: decisions in last 30/90/180 days
- "Reversal" flag: leader can flag a decision for review ("this may need to be reconsidered given new context")
GIVEN a leader wants to understand all vendor decisions made in the last 90 days
WHEN they filter by type=Vendor, date=last 90 days
THEN they see: "Chosen comms: LoRaWAN (AMR project, March 2026)", "Chosen monitoring: Datadog (WEB project, April 2026)"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 3, 'MEDIUM', NOW()),

('WRK-1619', 'Investment summary — where engineering hours flow by theme, project, customer', 'Todo', 'Story',
 'Cap X · Iteration 16. Leaders need to answer "where is engineering effort going?" — by strategic theme, by project, by customer. Derived from story points delivered and time logs.',
 '- Investment breakdown:
  - By strategic theme: % of story points in last quarter per theme
  - By project: story points delivered per project per sprint
  - By customer: customer-tagged work items'' story points (items with customer_account_id set)
  - By work type: feature vs bug fix vs tech debt vs ops (based on item type)
- Time range: last sprint, last quarter, last 6 months
- Visualisation: treemap (for relative size) and table (for exact numbers)
- Insight: "64% of engineering effort in Q2 went to Portal Modernisation theme. 18% to bug fixes."
GIVEN 3 themes are active: Portal (45%), AMR (35%), Internal Tools (20%) based on SP delivered
WHEN the VP views the investment summary
THEN the treemap shows Portal as the largest block; clicking it shows which projects and epics contributed',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1620', 'Anomaly detection on metrics — AI flags unusual patterns with explanations', 'Todo', 'Story',
 'Cap X · Iteration 16. Dashboards show data but humans miss subtle anomalies. AI continuously monitors key metrics and surfaces anomalies proactively — with an explanation, not just an alert.',
 '- AI monitors: velocity, predictability, SLA compliance %, cycle time, bug escape rate — for all teams in scope
- Anomaly: metric deviates >2 standard deviations from its rolling 6-sprint baseline
- Alert: in-app notification to leader with: "WEB team velocity dropped 35% this sprint. Likely cause: 2 members on leave + 3 P0 escalations absorbed into sprint."
- Explanation engine: AI cross-references: team leave records, incident count, scope changes, sprint goal changes
- Fallback (AI off): threshold-based alerting — velocity drop >30% OR SLA compliance <80% → static alert (no explanation)
- False positive management: leader can mark an anomaly as "Expected — sprint had planned capacity reduction"
GIVEN the AMR team''s velocity drops from 22 SP to 8 SP in one sprint
WHEN AI detects this anomaly
THEN the leader gets an alert: "AMR team velocity anomaly: 8 SP vs baseline 22 SP. Likely cause: Major incident (AMR-INC-041) consumed 3 engineers for 6 days this sprint."',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1621', 'Drill-down with privacy guardrails — team aggregates visible, individual data blocked at API', 'Todo', 'Story',
 'Cap X · Iteration 16. Leadership Console shows aggregated metrics. Leaders can drill from org → project → team level. But they cannot drill to individual engineer data — this is enforced at the API, not just the UI.',
 '- Drill-down path: Org → Project → Team (stops here for managers; LEAD can go to team-aggregate only)
- API endpoint /api/kpi/drill returns data at requested granularity with permission check
- If leader tries to request individual data (e.g. ?groupBy=engineer): API returns 403 with body {"reason": "Individual metrics are private — not accessible at this role level"}
- Test: API test in CI verifies that ADMIN/OWNER roles cannot retrieve individual-level KPI data regardless of request parameters
- UI: drill-down stops at team level with a lock icon "Individual data is private by design"
- Exception: engineer''s voluntary share (WRK-1210) creates a temporary exception only for the named recipients
GIVEN a VP tries to query individual engineer velocity via the REST API
WHEN they call GET /api/kpi/metrics?team=WEB&groupBy=engineer
THEN the API returns 403 with reason "Individual metrics are private — not accessible at this role"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1622', 'Goal cascade — org OKRs → team OKRs → work items, full traceability', 'Todo', 'Story',
 'Cap X · Iteration 16. OKR linkage (WRK-1513) connects work items to OKRs. Goal cascade structures the hierarchy: org-level OKRs contain team-level OKRs which link to epics and stories.',
 '- Org OKR → Team OKR → Epic → Story → Task (parent-child chain)
- OKR entity: level (ORG|TEAM), title, description, owner, quarter, key_results (array), parent_okr_id
- Key result: metric, baseline, target, current value (auto-computed from linked work item progress where measurable)
- Cascade view: tree showing full chain from org goal down to individual work items
- Progress: key result current value vs target shown as progress bar
- Alignment score: % of team-level OKRs that link to an org-level OKR (unlinked team OKRs flagged)
GIVEN Org OKR "Increase customer retention by 15%" has Team OKR "Reduce portal support tickets by 40%"
WHEN the "Portal Modernisation" epic is linked to the team OKR
THEN the cascade shows: Org OKR → Team OKR → Portal Modernisation (42% complete) → 8 epics → 47 stories',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 8, 'HIGH', NOW()),

-- Cap Y missing
('WRK-1623', 'Bulk config operations — bulk role changes, team membership, feature toggles with preview', 'Todo', 'Story',
 'Cap Y · Iteration 16. Admin tasks like "add 20 new employees to the Engineering team" or "change 15 users from MEMBER to LEAD" are painful one-by-one. Bulk operations with a preview before commit.',
 '- Bulk operations supported: role change, team add/remove, feature flag toggle, workspace membership, project membership
- UI: multi-select users → choose operation → preview → confirm
- Preview shows: N users affected, current state → new state for each (first 10 shown, N more collapsible)
- Commit is transactional: all succeed or all fail (no partial state)
- Audit log: one bulk-operation entry listing all affected users and changes
- Undo: within 15 minutes, admin can reverse the entire bulk operation
GIVEN an admin needs to add 25 new joiners to the AMR project
WHEN they select all 25 users and click "Add to project AMR as MEMBER"
THEN preview shows all 25 with their current project memberships; admin confirms; all 25 added in one transaction',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'MEDIUM', NOW()),

('WRK-1624', 'Audit log explorer — filterable, exportable browse of all audit events with saved queries', 'Todo', 'Story',
 'Cap Y · Iteration 16. The event_log table captures everything. The audit log explorer makes it browsable and filterable for admins and compliance officers — without writing SQL.',
 '- Full-page audit log explorer in Admin > Security > Audit Log
- Filters: by actor (user), by event type, by entity (WorkItem/Project/User/Sprint/etc.), by date range, by IP address
- Event types shown with human-readable labels: "Priya changed status of WRK-123 from In Progress to Done at 14:32"
- Saved queries: admin saves common queries (e.g. "All admin actions in last 30 days") and runs with one click
- Export: CSV and PDF (with date range and filter applied)
- Pattern detection: built-in patterns — "After-hours logins", "Mass export activity", "Permission escalations" — shown as pre-built saved queries
- Retention: shows events within configured retention period (WRK-1628)
GIVEN compliance officer needs "all work item deletions in March 2026"
WHEN they set filter: event_type=WorkItemDeleted, date=March 2026
THEN they see 7 deletion events; export as PDF for the compliance review',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1625', 'Integration health dashboard — webhook status, OAuth connections, retry/replay UI', 'Todo', 'Story',
 'Cap Y · Iteration 16. Integrations fail silently. A health dashboard shows the live status of all webhooks and OAuth connections, with retry and replay for failed events.',
 '- Integration health dashboard in Admin > Integrations > Health
- Per integration: status (Healthy/Degraded/Failed), last successful event timestamp, error rate (last 24h), consecutive failures count
- Webhook delivery: last 100 events per webhook with status (Delivered/Failed/Retrying), HTTP response code, response time
- Failed event: admin can retry or replay (replay re-delivers the exact event payload)
- Dead letter queue: events that have failed 5 retries move to DLQ — visible in dashboard with manual replay option
- OAuth connection: shows token expiry date, last use, scope granted; "Reconnect" button if expired
- Alert: if any integration has >5 consecutive failures → admin email + in-app alert
GIVEN the Slack webhook has been returning 404 for 2 days (expired)
WHEN admin opens integration health
THEN they see Slack: status=Failed, 47 failed events in dead letter queue, last success 2 days ago; they click "Update webhook URL" and replay the DLQ events',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1626', 'Anomaly detection (security) — AI flags unusual login patterns and permission escalations', 'Todo', 'Story',
 'Cap Y · Iteration 16. Security threats manifest as pattern anomalies. AI continuously monitors access patterns and flags: new geography logins, mass exports, permission escalations, after-hours admin actions.',
 '- Monitored patterns:
  1. Login from new geography (first time this user logged in from this country/city)
  2. Login at unusual time (outside user''s historical 8 AM–10 PM window, configurable)
  3. Mass data export: user exports >1000 items or >50 MB in 1 hour
  4. Permission escalation: admin-level action by an account that was MEMBER 24h ago
  5. Multiple failed logins followed by success (potential credential stuffing survived)
- Alert: in-app + email to workspace admin with: user, action, time, IP, geolocation, severity
- Admin actions: force logout session, lock account, view session history
- Fallback (AI off): fixed threshold rules — new geo → always alert; export >500 items → alert
GIVEN user "john@acme.com" logs in from Singapore at 3 AM (user is based in Mumbai)
THEN admin gets alert: "Unusual login — john@acme.com logged in from Singapore (first time) at 03:14 IST. [Force logout] [Investigate]"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1627', 'Role consolidation analyzer — find overlapping roles, propose consolidation', 'Todo', 'Story',
 'Cap Y · Iteration 16. Over time, workspaces accumulate redundant custom roles. The role consolidation analyzer finds roles with overlapping permission sets and suggests merging.',
 '- Compares all custom roles'' permission matrices
- Overlap score: % of permissions shared between two roles
- Flags: roles with >90% overlap → "Near-duplicate: consider merging"
- Impact preview: how many users are on each role, which permissions differ
- Merge action: admin selects which role to keep; all users on the deprecated role migrate to the kept role; deprecated role archived
- AI explains: "LEAD_V2 and SENIOR_MEMBER have 94% overlap — the only difference is LEAD_V2 can delete projects. 8 users on LEAD_V2, 23 on SENIOR_MEMBER."
GIVEN workspace has roles LEAD, LEAD_V2, SENIOR_MEMBER with 94% permission overlap
WHEN admin runs role consolidation analysis
THEN they see the 3-way comparison, impact of merging (31 affected users), and one-click merge action',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 3, 'LOW', NOW()),

('WRK-1628', 'Data retention policies — per-entity retention, automatic deletion with audit trail', 'Todo', 'Story',
 'Cap Y · Iteration 16. Regulatory compliance often requires data to be deleted after a certain period. Data retention policies automate this with a full audit trail.',
 '- Per-entity retention config: work_items, comments, attachments, events, notifications, audit_log, ai_audit_log
- Default retention (configurable per workspace): work items 7 years, audit log 5 years, notifications 1 year, AI audit log 24 months
- Automatic deletion: a scheduled job runs nightly; items past retention are soft-deleted (deleted_at set); hard-deleted after 30-day grace period
- Audit trail: every deletion by retention policy logged in retention_deletion_log with: entity, entity_id, retention_policy_id, deleted_at
- Admin override: specific items can be placed on legal hold (exempt from retention deletion)
- Export before deletion: admin can trigger a data export of all items approaching deletion
GIVEN workspace has retention policy "attachments deleted after 2 years"
WHEN an attachment uploaded January 2024 hits January 2026
THEN it is soft-deleted (still recoverable for 30 days); on February 2026 it is hard-deleted; the deletion is logged in retention_deletion_log',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1629', 'Workspace backup & restore — scheduled exports, point-in-time restore', 'Todo', 'Story',
 'Cap Y · Iteration 16. Workspaces contain critical project data. Scheduled backups and point-in-time restore protect against accidental deletion and data corruption.',
 '- Scheduled exports: nightly full workspace export as JSON to AWS S3 (encrypted); configurable time
- Retention: last 30 daily backups, last 12 weekly backups, last 12 monthly backups
- Point-in-time restore: admin selects a backup point → system restores all data to that state
- Partial restore: admin can restore specific entities (e.g. just work items from a project) without full workspace restore
- Restore preview: before committing restore, shows: N items will change, N items will be deleted, N items will be created
- Export format: documented JSON schema; importable to another Works workspace
- RTO target: full workspace restore in <4 hours for a 10,000 item workspace
GIVEN an admin accidentally deletes the entire AMR project with 500 work items
WHEN they initiate a point-in-time restore to 2 hours ago
THEN Works restores all 500 items, their comments, links, and attachments from the backup; the restore takes 8 minutes',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'HIGH', NOW()),

('WRK-1630', 'Operations playbook library — reusable admin playbooks, install once, run many times', 'Todo', 'Story',
 'Cap Y · Iteration 16. Repetitive admin tasks (quarterly access review, monthly AI cost review, new customer onboarding) should be playbooks — run with one click, with steps, checklist, and audit trail.',
 '- Playbook: sequence of steps, each step: description, action (manual task / automated action / verification), responsible role
- Built-in playbooks seeded:
  1. New user onboarding: create user → assign roles → add to teams → verify email → send welcome
  2. User offboarding: revoke sessions → remove from teams → deactivate account → transfer work → notify
  3. Quarterly access review: export inactive users → bulk review → deactivate → report
  4. Monthly AI cost review: export AI usage → compare vs budget → adjust caps if needed → document
  5. New customer workspace setup: create workspace → apply template → invite admins → run smoke test
- Playbook run: one-click start; each step is checked off as completed; audit log of who did what when
- Custom playbooks: admin creates custom playbooks for workspace-specific operations
GIVEN a new enterprise customer needs a workspace set up
WHEN admin runs "New customer workspace setup" playbook
THEN they see 8 ordered steps; each step has detailed instructions; completion is tracked; final audit log generated for the customer file',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER16', 5, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 17 GAPS (SPR-ITER17)
-- Missing: Lockable settings, Config diff, Custom forms designer,
--          Custom views/pages, Extension API (code-level)
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-1707', 'Lockable settings — admin locks config so users cannot change it', 'Todo', 'Story',
 'Cap R · Iteration 17. Some settings must be locked for compliance-bound customers (e.g. "AI must stay disabled" or "SSO is mandatory — local login not permitted"). Locked settings cannot be changed by users or lower-level admins.',
 '- Per-setting lock toggle: admin can mark any setting as "Locked by admin"
- Locked settings: shown with a padlock icon; input fields disabled; tooltip "Locked by workspace admin"
- Lock levels: OWNER-only can lock; ADMIN can lock for MEMBER; OWNER can lock for ADMIN
- Locked settings apply to: workflow configurations, AI settings, permission schemes, notification defaults
- Lock audit: every lock/unlock action logged with actor and reason
- Compliance use case: "AI provider = Anthropic" locked so no user can change to a non-approved provider
GIVEN a regulated customer requires AI to always use the on-prem provider
WHEN OWNER locks the "AI provider" setting to "On-prem"
THEN all ADMIN and MEMBER users see the AI provider field as locked; they cannot change it even via API (returns 403)',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 3, 'HIGH', NOW()),

('WRK-1708', 'Config diff — compare two configuration versions side by side', 'Todo', 'Story',
 'Cap R · Iteration 17. When something breaks after a config change, admins need to see exactly what changed. Config diff shows a side-by-side comparison of any two config versions.',
 '- Available from Config Versioning (WRK-1702) history view
- Select any two versions → diff view shows changed settings highlighted
- Diff format: left = older version, right = newer version; changed values highlighted in amber; removed settings in red; added settings in green
- Applicable to: workflow configs, permission schemes, field layouts, automation rules, AI settings
- Export diff as PDF for compliance review or change management documentation
- "Restore to this version" button available from diff view
GIVEN a workflow was changed 3 times this week
WHEN admin compares "Monday version" to "Today''s version"
THEN diff shows: added 2 statuses (Under Review, Pending Approval), removed 1 transition (skip-to-Done), changed role requirement on Close transition from LEAD to ADMIN',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 3, 'MEDIUM', NOW()),

('WRK-1709', 'Custom forms designer — drag-drop form builder with conditional fields and custom validation', 'Todo', 'Story',
 'Cap R · Iteration 17. Portal forms (WRK-902) cover service management. Custom forms extends this to internal data collection: project intake forms, change request forms, incident reporting forms.',
 '- Drag-drop form builder: add fields (from the custom field library — WRK-311), set order, set required/optional
- Conditional logic: "Show field B only if field A value is X" (simple if-then rules)
- Custom validation: regex pattern, min/max for numbers, date range constraints
- Preview: live preview of the form as users will see it
- Published forms: shareable URL (internal or portal) or embedded in a Works page
- Form submissions: stored as work items of a specified type with form fields mapped to work item fields
- Analytics: submission count, completion rate, average time to complete
GIVEN BCITS wants an internal "Infrastructure Change Request" form with conditional fields ("if change affects >1000 meters, show regulatory approval field")
WHEN admin builds the form in the designer
THEN the conditional field appears only when the threshold condition is met; submissions create Change Request work items automatically',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 8, 'HIGH', NOW()),

('WRK-1710', 'Custom views and pages — build custom landing pages with chosen widgets per role', 'Todo', 'Story',
 'Cap R · Iteration 17. Role-tuned surfaces (iterations 14-16) provide built-in views. Custom pages let admins build additional views specific to their team — a field engineer''s site visit tracker, a finance manager''s cost overview.',
 '- Page builder: drag-drop widget canvas (uses same widget library as dashboards — WRK-601)
- Widget types available for pages: KPI card, work item list (with WIQL filter), chart, knowledge article embed, external URL embed, custom text block, image
- Page access control: assign a page to specific roles or specific users
- Navigation: custom pages appear in the sidenav under "Workspace" section
- Mobile: custom pages render responsively on mobile (touch-friendly widgets)
- Template: save a custom page layout as a template reusable across workspaces
GIVEN BCITS field engineers need a "Today''s Site Visits" page showing only their assigned Meter Rollout items due today
WHEN admin builds this page with a filtered work item list (WIQL: type=MeterRollout AND assignee=currentUser() AND due_date=today)
THEN field engineers see this page as their default view in the mobile app',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 5, 'MEDIUM', NOW()),

('WRK-1711', 'Extension API — JavaScript-based extension points, sandboxed, for custom logic', 'Todo', 'Story',
 'Cap R · Iteration 17. Configuration covers 95% of use cases. The extension API covers the remaining 5% — custom business logic that cannot be expressed through the UI.',
 '- Extension types supported:
  1. Custom field renderer: render a field value with custom HTML/CSS (e.g. render a meter serial number as a QR code)
  2. Custom workflow action: call external system on transition (beyond the built-in webhook — synchronous with Works waiting for response)
  3. Custom WIQL function: add a custom function to WIQL (e.g. isInMaintenanceWindow())
  4. Custom dashboard widget: render arbitrary data from an external API as a Works widget
- Sandboxed execution: runs in a V8 isolate; max 500ms execution time; no filesystem access; HTTP calls allowed to allow-listed domains only
- Developer portal (iteration 20) will host public extensions
- Audit: every extension execution logged with: extension name, trigger, duration, outcome
GIVEN BCITS needs a custom WIQL function isInRegulatoryFreeze() that calls their internal compliance calendar API
WHEN they install the extension
THEN compliance rules can use: WHERE isInRegulatoryFreeze() = true AND type = "Change Request"',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER17', 8, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 18 GAPS (SPR-ITER18)
-- Missing: Push notifications, Biometric auth, Real-time updates (SSE), Keyboard shortcuts
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-1808', 'Push notifications — per-user, per-event-type, quiet hours, P0 override', 'Todo', 'Story',
 'Cap S · Iteration 18. Mobile apps are useless without push notifications. Per-user control over which events trigger a push, with quiet hours that P0 incidents always override.',
 '- iOS: APNs (Apple Push Notification service); Android: FCM (Firebase Cloud Messaging)
- Event types that can trigger push: @mention, assignment, status change (on watched items), sprint start, SLA approaching breach, P0 incident created
- Per-user settings: toggle each event type on/off; set quiet hours (e.g. 10 PM–7 AM IST)
- P0 override: Incidents with priority=CRITICAL always deliver push regardless of quiet hours or event toggles
- Push payload: title (item key + action), body (first 100 chars of description), deep link to the item in-app
- Badge count: iOS app icon badge shows unread notification count
- Delivery receipt: push delivery status logged (Delivered/Not Delivered — device offline)
GIVEN a user has quiet hours 10 PM–7 AM and notifications off for "status change"
WHEN a P0 incident is created at 2 AM and assigned to them
THEN they receive a push notification (P0 override) despite quiet hours; no push for a normal status change at 2 AM',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 5, 'HIGH', NOW()),

('WRK-1809', 'Biometric auth — Face ID, Touch ID, Android biometric for app unlock', 'Todo', 'Story',
 'Cap S · Iteration 18. Mobile app security without the friction of typing a password. Biometric unlock protects against unauthorised access when a device is shared or left unattended.',
 '- iOS: Face ID / Touch ID via LocalAuthentication framework
- Android: BiometricPrompt API (fingerprint, face, iris depending on device)
- Biometric secures the app unlock (not the initial login — initial login still uses email+password or SSO)
- Flow: app backgrounded for >5 minutes → on foreground, biometric prompt appears → success unlocks app; failure falls back to PIN/password
- Option to disable: user can opt out of biometric; falls back to PIN or password every time
- Session token: stored in iOS Keychain / Android Keystore (hardware-backed secure enclave where available)
- Failed attempts: 3 failed biometric → fallback to password; session token invalidated after 5 failed password attempts
GIVEN an engineer has enabled Face ID on their iPhone
WHEN they background Works for 10 minutes and return
THEN Face ID prompt appears; on success the app unlocks instantly; the JWT session token is loaded from Keychain',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 3, 'MEDIUM', NOW()),

('WRK-1810', 'Real-time updates — SSE pushes state changes to all open clients within 1 second', 'Todo', 'Story',
 'Cap S · Iteration 18. Works boards and dashboards show stale data without real-time updates. Server-sent events push state changes to all connected clients within 1 second — no polling.',
 '- Server-sent events (SSE) endpoint: GET /api/realtime/events (persistent connection, text/event-stream)
- Events pushed: work item status change, new comment, assignment change, sprint update, notification
- Client reconnect: automatic reconnect with last-event-id on connection drop (no missed events)
- Fanout: Spring backend maintains per-workspace event bus; state change on any item → broadcast to all connected users in that workspace with access to the item
- Selective delivery: events filtered by permission — user only receives events for items they can access
- Separate from co-presence (WRK-1803): SSE handles data updates; co-presence handles live cursors
- Fallback: if SSE connection fails after 3 retries → fall back to 30-second polling
GIVEN User A drags WRK-123 to "Done" on the Kanban board
WHEN User B has the same board open
THEN within 1 second, User B''s board shows WRK-123 in the Done column without any manual refresh',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 8, 'HIGH', NOW()),

('WRK-1811', 'Keyboard shortcuts — comprehensive set for every common action, customizable per user', 'Todo', 'Story',
 'Cap S · Iteration 18. Power users should not need the mouse. A comprehensive keyboard shortcut system covers navigation, work item actions, and global commands.',
 '- Built-in shortcuts:
  - Cmd/Ctrl+K: command palette (already WRK-1805)
  - Cmd/Ctrl+N: new work item (context-aware: in board opens new item in current column)
  - Cmd/Ctrl+/: show all shortcuts
  - E: edit current work item (when item detail is open)
  - Escape: close modal / panel
  - G then B: go to board; G then L: go to backlog; G then R: go to reports
  - J/K: navigate up/down in lists
  - Enter: open selected item
  - Cmd/Ctrl+Enter: save and close
  - F: toggle focus mode
- Customizable: user can remap any shortcut from their profile settings
- Shortcut cheat sheet: Cmd/Ctrl+? opens overlay with all shortcuts, searchable
- Conflicts: if customized shortcut conflicts with browser native → warning shown
GIVEN a power user opens Works
WHEN they press "G then B"
THEN they navigate to the board view; pressing "Cmd+N" opens a new item form in the current column',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER18', 5, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 19 GAPS (SPR-ITER19)
-- Missing: Audit log UI (browsable), Audit log streaming to SIEM
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-1909', 'Audit log UI — filterable, searchable, browsable full-page view with saved queries', 'Todo', 'Story',
 'Cap T · Iteration 19. The enhanced audit log (WRK-1902) stores all events cryptographically. This is the UI that makes it browsable for admins and compliance officers — without writing SQL.',
 '- Full-page audit log in Admin > Security > Audit Log
- Filters: actor, event type, entity type, entity ID, date range, IP address, outcome
- Search: keyword search across event descriptions
- Human-readable event descriptions: "Deepak changed WRK-123 status from In Progress to Done at 14:32 from IP 203.0.113.5"
- Pagination: 50 events per page, sorted by occurred_at DESC
- Saved queries: save filter combinations and run with one click
- Export: CSV, JSON, and PDF (with filter applied — for audit submissions)
- Integrity verification: each event shows a "Verify" button that checks the cryptographic chain
GIVEN a compliance auditor needs all admin actions in Q1 2026
WHEN they set filter: actor_role=ADMIN, date=Q1 2026, export=PDF
THEN they get a PDF with 847 admin events, each with actor, action, entity, timestamp, and IP; integrity verified',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 5, 'HIGH', NOW()),

('WRK-1910', 'Audit log streaming — stream to external SIEM (Splunk, Datadog, ELK Stack)', 'Todo', 'Story',
 'Cap T · Iteration 19. Enterprise customers use centralised SIEM platforms for security monitoring. Audit log streaming delivers events in real time to their SIEM — no manual export needed.',
 '- Streaming destinations supported: Splunk (HEC), Datadog (Logs API), ELK (Logstash/Elasticsearch), generic webhook (JSON)
- Admin configures: Admin > Security > Audit Log > Streaming — destination URL, auth token, event types to stream
- Events streamed within 5 seconds of occurring
- Guaranteed delivery: if SIEM is unreachable, events queue in Redis with 24h retry window before dead-lettering
- Event format: JSON with Works-standard fields + optional Splunk/Datadog native format
- Test connection: admin sends a test event to verify the SIEM integration before going live
- Stream filters: admin can choose which event types to stream (e.g. stream only security events, not every work item update)
GIVEN an enterprise customer uses Splunk for SOC monitoring
WHEN an admin login from an unusual IP occurs
THEN within 5 seconds a Splunk event appears: {"event": "UserLogin", "actor": "john@bcits.com", "ip": "203.0.113.5", "geo": "Singapore", "anomaly": true}',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER19', 5, 'HIGH', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- ITERATION 20 GAPS (SPR-ITER20)
-- Missing: Advanced knowledge features
-- ============================================================
INSERT INTO work_items (id, title, status, type, description, acceptance_criteria, project_id, created_by, sprint_id, story_points, priority, created_at) VALUES

('WRK-2011', 'Advanced knowledge features — multi-author, structured data extraction, document templates', 'Todo', 'Story',
 'Cap I · Iteration 20. The knowledge repository (iteration 5) covers articles. Advanced features in the final iteration add: real-time multi-author collaboration, structured data extraction from articles, and a document template system for formal documents.',
 '- Multi-author collaboration: two authors can edit the same article simultaneously (same SSE/CRDT system as real-time co-presence WRK-1803)
- Conflict resolution: operational transformation ensures no content lost during simultaneous edits
- Structured data extraction: admin defines a schema (e.g. "extract all IP addresses from runbooks") → AI extracts and stores as structured JSON on the article — queryable via WIQL
- Document templates: formal document generator — "Generate a project charter from this template using project data" → fills in team, dates, objectives from Works data automatically
- Article translation: AI translates an article to Hindi or another supported language (WRK-2007 localization foundation)
- Content versioning improvements: version compare now shows visual diff for images and tables (not just text)
GIVEN two engineers edit the same runbook simultaneously
WHEN both save
THEN no content is lost; changes are merged (CRDT); both see the merged result within 1 second
GIVEN an admin extracts all "server hostnames" from 50 runbooks using structured extraction
THEN a queryable table shows: 50 articles × extracted hostnames → filterable, exportable',
 'PROJ-WORKS', 'USR-DEV1', 'SPR-ITER20', 8, 'MEDIUM', NOW())

ON CONFLICT DO NOTHING;


-- ============================================================
-- TAGS — for all new items
-- ============================================================
INSERT INTO tags (work_item_id, tag) VALUES
-- Iter 1
('WRK-085', 'email'), ('WRK-085', 'notifications'),
('WRK-086', 'branding'), ('WRK-086', 'workspace'),
('WRK-087', 'navigation'), ('WRK-087', 'ux'),
-- Iter 4
('WRK-410', 'pm-artifacts'), ('WRK-410', 'action-items'),
-- Iter 5
('WRK-508', 'knowledge'), ('WRK-508', 'collaboration'),
('WRK-509', 'knowledge'), ('WRK-509', 'analytics'),
('WRK-510', 'knowledge'), ('WRK-510', 'templates'),
-- Iter 6
('WRK-608', 'reports'), ('WRK-608', 'templates'),
-- Iter 8
('WRK-807', 'sla'), ('WRK-808', 'sla'), ('WRK-808', 'audit'),
('WRK-809', 'sla'), ('WRK-809', 'bulk'),
-- Iter 9
('WRK-907', 'service-management'), ('WRK-907', 'portal'),
('WRK-908', 'sla'), ('WRK-908', 'portal'),
('WRK-909', 'portal'), ('WRK-909', 'dashboard'),
-- Iter 10
('WRK-1010', 'ai'), ('WRK-1010', 'cost-control'),
('WRK-1011', 'ai'), ('WRK-1011', 'summarization'),
('WRK-1012', 'ai'), ('WRK-1012', 'providers'),
('WRK-1013', 'ai'), ('WRK-1013', 'sandbox'),
('WRK-1014', 'ai'), ('WRK-1014', 'fallback'), ('WRK-1014', 'dogfood'),
-- Iter 11
('WRK-1112', 'ai'), ('WRK-1112', 'voice'), ('WRK-1112', 'accessibility'),
('WRK-1113', 'ai'), ('WRK-1113', 'routing'), ('WRK-1113', 'service-management'),
-- Iter 12
('WRK-1207', 'kpi'), ('WRK-1207', 'metrics'),
('WRK-1208', 'kpi'), ('WRK-1208', 'project-view'),
('WRK-1209', 'kpi'), ('WRK-1209', 'executive'),
('WRK-1210', 'kpi'), ('WRK-1210', 'privacy'),
('WRK-1211', 'kpi'), ('WRK-1211', 'team-health'),
('WRK-1212', 'kpi'), ('WRK-1212', 'cycle-time'),
-- Iter 13
('WRK-1308', 'automation'), ('WRK-1308', 'scheduled'),
('WRK-1309', 'automation'), ('WRK-1309', 'templates'),
('WRK-1310', 'automation'), ('WRK-1310', 'audit'),
('WRK-1311', 'integration'), ('WRK-1311', 'calendar'),
-- Iter 14
('WRK-1410', 'developer'), ('WRK-1410', 'focus-mode'), ('WRK-1410', 'calendar'),
('WRK-1411', 'developer'), ('WRK-1411', 'code-context'),
('WRK-1412', 'developer'), ('WRK-1412', 'git'), ('WRK-1412', 'integration'),
('WRK-1413', 'developer'), ('WRK-1413', 'github'), ('WRK-1413', 'pr'),
('WRK-1414', 'developer'), ('WRK-1414', 'pair-programming'),
-- Iter 15
('WRK-1517', 'scrum-master'), ('WRK-1517', 'sprint-review'),
('WRK-1518', 'scrum-master'), ('WRK-1518', 'ai'), ('WRK-1518', 'sprint-goal'),
('WRK-1519', 'scrum-master'), ('WRK-1519', 'dod'), ('WRK-1519', 'dor'),
('WRK-1520', 'scrum-master'), ('WRK-1520', 'velocity'),
('WRK-1521', 'scrum-master'), ('WRK-1521', 'capacity'),
('WRK-1522', 'product-owner'), ('WRK-1522', 'ideas'),
('WRK-1523', 'product-owner'), ('WRK-1523', 'customer-feedback'),
('WRK-1524', 'product-owner'), ('WRK-1524', 'release'),
('WRK-1525', 'product-owner'), ('WRK-1525', 'stakeholders'),
('WRK-1526', 'product-owner'), ('WRK-1526', 'themes'), ('WRK-1526', 'strategy'),
('WRK-1527', 'product-owner'), ('WRK-1527', 'discovery'), ('WRK-1527', 'spike'),
('WRK-1528', 'product-owner'), ('WRK-1528', 'customer-research'),
-- Iter 16
('WRK-1616', 'leadership'), ('WRK-1616', 'risk'),
('WRK-1617', 'leadership'), ('WRK-1617', 'strategy'), ('WRK-1617', 'okr'),
('WRK-1618', 'leadership'), ('WRK-1618', 'decisions'),
('WRK-1619', 'leadership'), ('WRK-1619', 'investment'),
('WRK-1620', 'leadership'), ('WRK-1620', 'ai'), ('WRK-1620', 'anomaly'),
('WRK-1621', 'leadership'), ('WRK-1621', 'privacy'),
('WRK-1622', 'leadership'), ('WRK-1622', 'okr'), ('WRK-1622', 'goal-cascade'),
('WRK-1623', 'admin'), ('WRK-1623', 'bulk'),
('WRK-1624', 'admin'), ('WRK-1624', 'audit'), ('WRK-1624', 'compliance'),
('WRK-1625', 'admin'), ('WRK-1625', 'integrations'), ('WRK-1625', 'health'),
('WRK-1626', 'admin'), ('WRK-1626', 'security'), ('WRK-1626', 'anomaly'),
('WRK-1627', 'admin'), ('WRK-1627', 'rbac'),
('WRK-1628', 'admin'), ('WRK-1628', 'retention'), ('WRK-1628', 'compliance'),
('WRK-1629', 'admin'), ('WRK-1629', 'backup'),
('WRK-1630', 'admin'), ('WRK-1630', 'playbook'), ('WRK-1630', 'dogfood'),
-- Iter 17
('WRK-1707', 'customization'), ('WRK-1707', 'compliance'),
('WRK-1708', 'customization'), ('WRK-1708', 'diff'),
('WRK-1709', 'customization'), ('WRK-1709', 'forms'),
('WRK-1710', 'customization'), ('WRK-1710', 'pages'),
('WRK-1711', 'customization'), ('WRK-1711', 'extension-api'),
-- Iter 18
('WRK-1808', 'mobile'), ('WRK-1808', 'push-notifications'),
('WRK-1809', 'mobile'), ('WRK-1809', 'security'), ('WRK-1809', 'biometric'),
('WRK-1810', 'realtime'), ('WRK-1810', 'sse'), ('WRK-1810', 'performance'),
('WRK-1811', 'ux'), ('WRK-1811', 'keyboard'), ('WRK-1811', 'accessibility'),
-- Iter 19
('WRK-1909', 'security'), ('WRK-1909', 'audit'), ('WRK-1909', 'compliance'),
('WRK-1910', 'security'), ('WRK-1910', 'siem'), ('WRK-1910', 'streaming'),
-- Iter 20
('WRK-2011', 'knowledge'), ('WRK-2011', 'collaboration'), ('WRK-2011', 'ai')
ON CONFLICT DO NOTHING;


-- ============================================================
-- SUMMARY COMMENT
-- ============================================================
-- V12 closes all gaps found by comparing V8+V10 against the
-- 20-iteration spec (doc 06) and capability map v3.5 (doc 05).
--
-- Items added per iteration:
--   Iter  1: +3  (email notifications, workspace branding, breadcrumbs)
--   Iter  4: +1  (action items as first-class artifact)
--   Iter  5: +3  (inline article comments, article analytics, template library)
--   Iter  6: +1  (report templates)
--   Iter  8: +3  (multiple SLA targets, SLA audit log, bulk SLA application)
--   Iter  9: +3  (request types, customer-facing SLA, customer dashboard)
--   Iter 10: +5  (AI usage dashboard, summarization, provider config, sandbox, fallback docs)
--   Iter 11: +2  (voice input, smart request routing)
--   Iter 12: +6  (custom metric builder, project view, exec/org view, voluntary share, health composite, cycle time distribution)
--   Iter 13: +4  (scheduled automations, automation library, automation audit log, calendar connector)
--   Iter 14: +5  (time blocking, code context, commit↔item linking, PR↔item linking, pair programming)
--   Iter 15: +13 (sprint review prep, goal builder, working agreements, velocity dashboard, capacity planner, idea capture, feature voting, release planning, stakeholder comms, theme tracking, discovery/spike, customer interview log)
--   Iter 16: +15 (risk portfolio, strategy-to-execution map, decision register access, investment summary, anomaly detection, drill-down privacy, goal cascade, bulk config, audit log explorer, integration health, security anomaly detection, role consolidation, data retention, backup/restore, operations playbook library)
--   Iter 17: +5  (lockable settings, config diff, custom forms, custom pages, extension API)
--   Iter 18: +4  (push notifications, biometric auth, SSE real-time updates, keyboard shortcuts)
--   Iter 19: +2  (audit log UI, audit log SIEM streaming)
--   Iter 20: +1  (advanced knowledge features)
--
-- TOTAL NEW ITEMS: ~76
-- GRAND TOTAL (V8 + V10 + V11 + V12): ~330 work items
-- ============================================================
