import { describe, it, expect } from 'vitest';
import { eventToSentence, groupEventsByDay } from './activity-feed';

// ---------------------------------------------------------------------------
// eventToSentence
// ---------------------------------------------------------------------------
describe('eventToSentence', () => {
  it('WORK_ITEM_CREATED uses payload.type', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_CREATED', payload: { type: 'bug' } }))
      .toBe('Created this bug');
  });

  it('WORK_ITEM_CREATED falls back to "item" when payload.type is missing', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_CREATED' }))
      .toBe('Created this item');
  });

  it('STATUS_CHANGED uses payload.toStatus', () => {
    expect(eventToSentence({ eventType: 'STATUS_CHANGED', payload: { toStatus: 'In Review' } }))
      .toBe('Changed status to In Review');
  });

  it('STATUS_CHANGED falls back gracefully when toStatus is absent', () => {
    expect(eventToSentence({ eventType: 'STATUS_CHANGED', payload: {} }))
      .toBe('Changed status to unknown');
  });

  it('WORK_ITEM_ASSIGNED uses payload.assigneeName', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_ASSIGNED', payload: { assigneeName: 'Priya S' } }))
      .toBe('Assigned to Priya S');
  });

  it('WORK_ITEM_ASSIGNED falls back when assigneeName absent', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_ASSIGNED' }))
      .toBe('Assigned to someone');
  });

  it('WORK_ITEM_UPDATED uses payload.field', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_UPDATED', payload: { field: 'description' } }))
      .toBe('Updated description');
  });

  it('COMMENT_ADDED returns fixed sentence', () => {
    expect(eventToSentence({ eventType: 'COMMENT_ADDED' }))
      .toBe('Added a comment');
  });

  it('WORK_ITEM_TYPE_CHANGED uses payload.toType', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_TYPE_CHANGED', payload: { toType: 'Task' } }))
      .toBe('Changed type to Task');
  });

  it('WORK_ITEM_PRIORITY_CHANGED uses payload.toPriority', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_PRIORITY_CHANGED', payload: { toPriority: 'High' } }))
      .toBe('Changed priority to High');
  });

  it('WORK_ITEM_CLOSED returns fixed sentence', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_CLOSED' }))
      .toBe('Closed this item');
  });

  it('WORK_ITEM_REOPENED returns fixed sentence', () => {
    expect(eventToSentence({ eventType: 'WORK_ITEM_REOPENED' }))
      .toBe('Reopened this item');
  });

  it('ATTACHMENT_ADDED uses payload.fileName', () => {
    expect(eventToSentence({ eventType: 'ATTACHMENT_ADDED', payload: { fileName: 'spec.pdf' } }))
      .toBe('Added spec.pdf');
  });

  it('ATTACHMENT_ADDED falls back when fileName absent', () => {
    expect(eventToSentence({ eventType: 'ATTACHMENT_ADDED' }))
      .toBe('Added an attachment');
  });

  it('LINK_ADDED uses payload.targetId', () => {
    expect(eventToSentence({ eventType: 'LINK_ADDED', payload: { targetId: 'WRK-42' } }))
      .toBe('Linked to WRK-42');
  });

  it('WATCHER_ADDED returns fixed sentence', () => {
    expect(eventToSentence({ eventType: 'WATCHER_ADDED' }))
      .toBe('Started following');
  });

  it('SPRINT_ASSIGNED uses payload.sprintName', () => {
    expect(eventToSentence({ eventType: 'SPRINT_ASSIGNED', payload: { sprintName: 'Sprint 7' } }))
      .toBe('Moved to Sprint 7');
  });

  it('unknown event type falls back to a cleaned-up sentence', () => {
    expect(eventToSentence({ eventType: 'SOME_UNKNOWN_EVENT' }))
      .toBe('Updated (some unknown event)');
  });

  it('completely missing eventType falls back gracefully', () => {
    expect(eventToSentence({ eventType: undefined }))
      .toBe('Updated ()');
  });
});

// ---------------------------------------------------------------------------
// groupEventsByDay
// ---------------------------------------------------------------------------
describe('groupEventsByDay', () => {
  it('returns empty array for empty input', () => {
    expect(groupEventsByDay([])).toEqual([]);
  });

  it('returns empty array for null input', () => {
    expect(groupEventsByDay(null)).toEqual([]);
  });

  it('groups events by calendar date', () => {
    const events = [
      { id: 'e1', createdAt: '2026-06-10T08:00:00Z' },
      { id: 'e2', createdAt: '2026-06-10T14:00:00Z' },
      { id: 'e3', createdAt: '2026-06-11T09:00:00Z' },
    ];
    const result = groupEventsByDay(events);
    expect(result).toHaveLength(2);
    // newest day first
    expect(result[0].date).toBe('2026-06-11');
    expect(result[0].events).toHaveLength(1);
    expect(result[1].date).toBe('2026-06-10');
    expect(result[1].events).toHaveLength(2);
  });

  it('returns newest day first', () => {
    const events = [
      { id: 'e1', createdAt: '2026-06-05T08:00:00Z' },
      { id: 'e2', createdAt: '2026-06-12T08:00:00Z' },
      { id: 'e3', createdAt: '2026-06-09T08:00:00Z' },
    ];
    const result = groupEventsByDay(events);
    expect(result[0].date).toBe('2026-06-12');
    expect(result[1].date).toBe('2026-06-09');
    expect(result[2].date).toBe('2026-06-05');
  });

  it('handles a single event', () => {
    const events = [{ id: 'e1', createdAt: '2026-06-01T00:00:00Z' }];
    const result = groupEventsByDay(events);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-06-01');
    expect(result[0].events[0].id).toBe('e1');
  });
});
