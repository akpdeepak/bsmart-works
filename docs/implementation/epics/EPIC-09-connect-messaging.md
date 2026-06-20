# EPIC 9 - bSmart Connect Messaging

Status: In progress  
Branch: `epic/09-connect-messaging`  
Roadmap: V.20

## Intent

Make messaging work-aware and enterprise-safe. Conversations should not become social feeds; they
should help teams turn customer and internal discussion into reviewed work artifacts.

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

## Implementation Slice

- Add a pure message-action helper that offers conversion actions only for customer messages.
- Add source-cited drafts for task, decision, risk, and customer commitment actions.
- Surface message-derived draft actions in the agent Support Inbox thread.
- Keep the draft local and explicitly marked as review-only before official record creation.
- Preserve the existing support chat backend, RBAC, workspace scoping, and customer/agent separation.

## Validation Plan

- `cd works-frontend && npm test -- message-actions support-inbox-view`
- `cd works-frontend && npm run build`
- `npm run verify`
- GitHub PR checks before merge to `main`
