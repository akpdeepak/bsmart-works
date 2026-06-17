const ASSIGNEE = 'assignee';
const PRIORITY = 'priority';
const ADD_LABEL = 'addLabel';
const REMOVE_LABEL = 'removeLabel';

const norm = (value) => (value == null || value === '' ? null : value);

export function buildBulkPreview(items = [], action, value, opts = {}) {
  const {
    userName = (id) => id,
    unassignedLabel = 'Unassigned',
    noneLabel = '-',
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
        const next = tags.filter((tag) => tag !== value);
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

  const changing = rows.filter((row) => row.willChange).length;
  return { rows, changing, unchanged: rows.length - changing };
}
