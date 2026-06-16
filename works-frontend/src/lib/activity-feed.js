// activity-feed.js — pure event-to-sentence renderer (no JSX).
//
// Converts raw events from the `events` table (fetched via the activity API) into human-readable
// sentences. Maps every known eventType string to a sentence generator, falls back gracefully for
// unknown types, and groups event arrays by calendar day (newest-first).
//
// Pure functions — no React, no side effects, no imports from framework code. Safe to import in
// unit tests without a DOM environment.

const SENTENCE_MAP = {
  WORK_ITEM_CREATED:          (e) => `Created this ${e.payload?.type ?? 'item'}`,
  STATUS_CHANGED:             (e) => `Changed status to ${e.payload?.toStatus ?? 'unknown'}`,
  WORK_ITEM_ASSIGNED:         (e) => `Assigned to ${e.payload?.assigneeName ?? 'someone'}`,
  WORK_ITEM_UPDATED:          (e) => `Updated ${e.payload?.field ?? 'a field'}`,
  COMMENT_ADDED:              () => `Added a comment`,
  WORK_ITEM_TYPE_CHANGED:     (e) => `Changed type to ${e.payload?.toType ?? 'unknown'}`,
  WORK_ITEM_PRIORITY_CHANGED: (e) => `Changed priority to ${e.payload?.toPriority ?? 'unknown'}`,
  WORK_ITEM_CLOSED:           () => `Closed this item`,
  WORK_ITEM_REOPENED:         () => `Reopened this item`,
  ATTACHMENT_ADDED:           (e) => `Added ${e.payload?.fileName ?? 'an attachment'}`,
  LINK_ADDED:                 (e) => `Linked to ${e.payload?.targetId ?? 'another item'}`,
  WATCHER_ADDED:              () => `Started following`,
  SPRINT_ASSIGNED:            (e) => `Moved to ${e.payload?.sprintName ?? 'a sprint'}`,
};

/**
 * Convert a single event object into a human-readable sentence.
 * Falls back to a cleaned-up version of the eventType string for unknown types.
 *
 * @param {{ eventType: string, payload?: object }} event
 * @returns {string}
 */
export function eventToSentence(event) {
  const fn = SENTENCE_MAP[event.eventType];
  return fn
    ? fn(event)
    : `Updated (${(event.eventType ?? '').toLowerCase().replace(/_/g, ' ')})`;
}

/**
 * Group an array of events by calendar date, newest day first.
 *
 * @param {Array<{ createdAt: string|Date }>} events
 * @returns {Array<{ date: string, events: Array }>}  date is "YYYY-MM-DD"
 */
export function groupEventsByDay(events) {
  if (!events || events.length === 0) return [];

  const groups = {};
  for (const e of events) {
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(e);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEvents]) => ({ date, events: dayEvents }));
}
