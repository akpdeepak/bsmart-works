// Pure diff builder for the bulk-change preview wizard (WI-31). Given the selected items and the
// pending bulk action, it computes a per-item before→after preview so the user sees exactly what
// will change before committing — and which items are no-ops (the server skips those too;
// WorkItemBulkService). Framework-free → trivially unit-testable, no React dependency.

const ASSIGNEE = 'assignee';
const PRIORITY = 'priority';
const ADD_LABEL = 'addLabel';
const REMOVE_LABEL = 'removeLabel';

const norm = (v) => (v == null || v === '' ? null : v);

/**
 * Build the preview rows for a bulk action.
 *
 * @param {Array}  items  the selected work-item objects
 * @param {string} action one of assignee | priority | addLabel | removeLabel
 * @param {string} value  the target value (assignee id, priority, or label text)
 * @param {object} opts   { userName(id), unassignedLabel, noneLabel }
 * @returns {{ rows: Array, changing: number, unchanged: number }}
 *   rows: [{ id, autoId, title, before, after, willChange }]
 */
export function buildBulkPreview(items = [], action, value, opts = {}) {
  const {
    userName = (id) => id,
    unassignedLabel = 'Unassigned',
    noneLabel = '—',
  } = opts;
  const label = (id) => (id ? (userName(id) || id) : unassignedLabel);

  const rows = items.map((item) => {
    const base = { id: item.id, autoId: item.autoId || item.id, title: item.title || '' };
    switch (action) {
      case ASSIGNEE: {
        const before = label(item.assigneeId);
        const after = label(norm(value));
        return { ...base, before, after, willChange: norm(item.assigneeId) !== norm(value) };
      }
      case PRIORITY: {
        const before = item.priority || noneLabel;
        return { ...base, before, after: value, willChange: item.priority !== value };
      }
      case ADD_LABEL: {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const has = tags.includes(value);
        return {
          ...base,
          before: tags.length ? tags.join(', ') : noneLabel,
          after: has ? (tags.join(', ') || noneLabel) : [...tags, value].join(', '),
          willChange: !has,
        };
      }
      case REMOVE_LABEL: {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const has = tags.includes(value);
        const next = tags.filter((teg) => teg !== value);
        return {
          ...base,
          before: tags.length ? tags.join(', ') : noneLabel,
          after: has ? (next.join(', ') || noneLabel) : (tags.join(', ') || noneLabel),
          willChange: has,
        };
      }
      default:
        return { ...base, before: noneLabel, after: noneLabel, willChange: false };
    }
  });

  const changing = rows.filter((r) => r.willChange).length;
  return { rows, changing, unchanged: rows.length - changing };
}
