export function statusToCategory(status) {
  const map = { 'Todo': 'todo', 'In Progress': 'in_progress', 'Done': 'done', 'Blocked': 'blocked' };
  return map[status] || 'todo';
}
