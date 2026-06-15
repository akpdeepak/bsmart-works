// Example BQL queries surfaced through the snippet palette — a fast on-ramp for new users and a
// power-user shortcut. Kept here (not in the view) so they stay declarative and unit-testable, and
// the editor file stays a clean component module (react-refresh/only-export-components). Each query
// uses only fields/functions the schema exposes by default.
export const BQL_SNIPPETS = [
  { id: 'my-open', label: 'My open work', query: 'assignee = currentUser() AND status != Done', keywords: ['mine', 'assigned', 'me'] },
  { id: 'overdue', label: 'Overdue items', query: 'dueDate < today() AND status != Done', keywords: ['late', 'due'] },
  { id: 'high-bugs', label: 'High-priority bugs', query: 'type = Bug AND priority IN (High, Highest)', keywords: ['critical', 'defect'] },
  { id: 'unassigned', label: 'Unassigned, still open', query: 'assignee IS EMPTY AND status != Done', keywords: ['nobody', 'triage'] },
  { id: 'this-week', label: 'Created this week', query: 'createdAt >= startOfWeek()', keywords: ['recent', 'new'] },
  { id: 'changed-recently', label: 'Status changed in the last 7 days', query: 'status CHANGED AFTER daysAgo(7)', keywords: ['history', 'transition'] },
  { id: 'no-estimate', label: 'Stories missing an estimate', query: 'type = Story AND storyPoints IS EMPTY', keywords: ['estimate', 'grooming', 'points'] },
];
