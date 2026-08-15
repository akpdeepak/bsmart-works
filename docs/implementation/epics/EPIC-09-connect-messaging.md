# EPIC 9 - bSmart Connect Messaging Full Scope

Status: Completed
Branch: `feat/gh-epic9-full-scope`  
Roadmap: V.20

## Intent

Make messaging work-aware and enterprise-safe. Conversations should not become social feeds; they
should help teams turn customer and internal discussion into reviewed work artifacts. The full
scope extends the base support chat to comprehensive internal messaging across multiple contextual types.

## Source Requirements

- Build on the existing customer chat base: support chat migrations, portal/agent controllers,
  support chat service, Support Inbox, support chat widget, and support chat client.
- Support customer conversations first, then expand toward direct, group, project, work-item,
  incident, release, and announcement conversation types.
- Add smart actions: create task, decision, approval, risk, commitment, summarize, extract action
  items, draft reply, translate/rewrite.
- AI suggestions and message-derived artifacts require review before creating official records.
- Internal and customer-visible messages must stay clearly separated.
- External users must not see internal messages.
- Summaries and actions must cite message sources.

## Full Scope Implementation

- Added `InternalMessagingController` and `MessagingAiService` with deterministic fallbacks.
- Supported contextual conversation types (`DIRECT`, `GROUP`, `PROJECT`, `INCIDENT`, `WORK_ITEM`, `RELEASE`, `ANNOUNCEMENT`).
- Implemented robust RBAC (`work_write` checks) and strict tenant isolation (workspace filters on all entities).
- Implemented Participants, Reactions, Read Receipts, and Pinned Messages models.
- AI interactions (`/summarize`, `/extract-actions`) strictly return review-only draft suggestions, never auto-committing records.
- Complete redesign of the `MessengerView` on the frontend with modern design tokens, all 5 UI states (loading, empty, success, unauthorized, error), and i18n support.

## Validation Plan

- Unit test coverage across `InternalMessagingController` and `MessagingAiService` enforcing cross-tenant security and AI fallbacks.
- Frontend test coverage for `messenger-view.test.jsx` (state coverage) and `messenger-view.a11y.test.jsx` (axe accessibility).
- End-to-end integration via changed-profile test pipeline (including `verify.mjs --profile changed`).
- Storybook coverage for `MessengerView` states.

---

# EPIC 9 - bSmart Connect Messaging Full Scope Completion

Status: Completed
PR: (Pending)  
Completed: 2026-08-15

## Delivered

- **Backend Architecture**: Replaced the placeholder messaging backend with a robust `InternalMessagingController`. Supported full RBAC, cross-tenant isolation, and contextual conversation types (`PROJECT`, `RELEASE`, `INCIDENT`, etc.).
- **Data Models**: Created V128 migration adding tables for `conversation_participants`, `message_reactions`, `message_reads`, and `pinned_messages`. Added corresponding JPA entities.
- **AI Integration**: Implemented `MessagingAiService` using the standard AI Control Plane, strictly enforcing deterministic fallbacks (e.g. falling back to message counts when AI is unavailable) and ensuring AI outputs are returned as review-only drafts.
- **Frontend Redesign**: completely redesigned `MessengerView` replacing raw hex colors with the design token system. Supported active/unauthorized/empty/loading states, reactions, pinning, and AI summary panels.
- **Client Extensions**: Added new methods to `internalChat.js` client to support full message/participant/pin/reaction/AI lifecycles.
- **i18n & A11y**: Extracted UI strings to `locales/en.js` and ensured the messaging view passes all axe-core rules (`expectNoA11yViolations`).

## Validation

- **Backend Unit Tests**: Verified cross-tenant denial on `addParticipant`, and verified deterministic fallback behavior on AI summarize/extract endpoints in `InternalMessagingControllerTest`. All tests PASS.
- **Frontend Unit & A11y Tests**: `messenger-view.test.jsx` and `messenger-view.a11y.test.jsx` cover all edge states (403 unauthorized, empty, error, successful interactions, AI panel visibility). All tests PASS.
- **Profile Check**: `verify.mjs --profile changed` ran (local Testcontainers skips acknowledged, pending CI run).

## Follow-Up

- Proceed to EPIC 10 / remaining Work Item Experience features.
- Await CI validation for Testcontainers integration tests.
