# EPIC 8 - Smart Inbox

Status: In progress  
Branch: `epic/08-smart-inbox`  
Roadmap: V.20

## Intent

Turn notifications into an action-first inbox: users should see what needs their action now, while
ordinary activity remains available as history.

## Source Requirements

- Group inbox items by required action: approve, reply, review, assign, escalate, snooze, mark done,
  and convert to work.
- Inbox count should reflect actionable items, not every notification.
- Users can act directly from Inbox.
- Items link to their source where route information exists.
- Users can snooze and configure quiet hours.
- Notifications remain available separately as activity history.
- Inbox respects RBAC/workspace membership by using only authenticated notification data and existing
  ownership-protected read APIs.

## Implementation Slice

- Add a pure Smart Inbox classifier for notification type/message/link signals.
- Use the classifier for the app-shell Inbox badge count.
- Split the Notifications view into Action inbox, Activity history, and Preferences tabs.
- Group actionable items by Approve, Reply, Review, Assign, and Escalate.
- Add direct actions for source open/review, snooze, and done/mark-read.
- Preserve the existing activity history, mark-all-read, quiet-hours, mute, and global snooze flows.

## Validation Plan

- `cd works-frontend && npm test -- smart-inbox notifications-view`
- `cd works-frontend && npm run build`
- `npm run verify`
- GitHub PR checks before merge to `main`
