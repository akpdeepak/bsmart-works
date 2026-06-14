// Pure, component-free helpers + constants for the work-item detail panel. Kept in a plain .js
// module (separate from the per-section components) so each component file stays component-only
// for react-refresh / fast refresh (repo pattern — see ./customization/helpers.js).

export const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export function formatEventType(eventType) {
  const map = {
    WORK_ITEM_CREATED: 'created this item',
    WORK_ITEM_UPDATED: 'updated this item',
    WORK_ITEM_DELETED: 'deleted this item',
    COMMENT_ADDED:     'added a comment',
    STATUS_CHANGED:    'changed the status',
    ASSIGNED:          'changed the assignee',
    USER_LOGGED_IN:    'logged in',
    USER_SIGNED_UP:    'signed up',
  };
  return map[eventType] || (eventType || '').toLowerCase().replace(/_/g, ' ');
}
