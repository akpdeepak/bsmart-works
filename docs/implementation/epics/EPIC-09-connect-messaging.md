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
