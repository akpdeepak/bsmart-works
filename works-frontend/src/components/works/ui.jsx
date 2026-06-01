import React from 'react';
import DOMPurify from 'dompurify';

// ── Shared utilities ─────────────────────────────────────────────────────────

export function getInitials(name) {
  if (!name) return '??';
  const parts = name.split(' ');
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

// Article/comment bodies are user-supplied, so the generated HTML is sanitised
// (tight tag/attr allowlist) before any call site hands it to dangerouslySetInnerHTML.
// CLAUDE.md §17.3 — never inject unsanitised user content.
export function renderMd(text) {
  if (!text) return '';
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="prose-md-code">$1</code>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}

export function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

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

// ── Type config ───────────────────────────────────────────────────────────────

export const TYPES = {
  Task:              { color: 'bg-brand-navy-tint',  icon: '✓' },
  Story:             { color: 'bg-semantic-success',  icon: '📖' },
  Bug:               { color: 'bg-semantic-danger',   icon: '🐛' },
  Epic:              { color: 'bg-purple-700',         icon: '⚡' },
  'Sub-task':        { color: 'bg-neutral-600',       icon: '↳' },
  Incident:          { color: 'bg-semantic-warning',  icon: '🔥' },
  'Service Request': { color: 'bg-brand-navy',        icon: '🎫' },
};

export const ROLE_CONFIG = {
  OWNER:  { label: 'Owner',  bg: 'bg-purple-100',             text: 'text-purple-700',      tier: 5 },
  ADMIN:  { label: 'Admin',  bg: 'bg-brand-navy/10',          text: 'text-brand-navy',      tier: 4 },
  LEAD:   { label: 'Lead',   bg: 'bg-semantic-success/10',    text: 'text-semantic-success', tier: 3 },
  MEMBER: { label: 'Member', bg: 'bg-neutral-100',            text: 'text-neutral-600',     tier: 2 },
  VIEWER: { label: 'Viewer', bg: 'bg-neutral-50',             text: 'text-neutral-400',     tier: 1 },
};

export const PRIORITY_CONFIG = {
  CRITICAL: { color: 'text-semantic-danger',  bg: 'bg-semantic-danger-surface',  label: 'Critical' },
  HIGH:     { color: 'text-semantic-warning', bg: 'bg-semantic-warning-surface', label: 'High' },
  MEDIUM:   { color: 'text-neutral-600',      bg: 'bg-neutral-100',              label: 'Medium' },
  LOW:      { color: 'text-neutral-400',      bg: 'bg-neutral-50',               label: 'Low' },
};

// ── Shared components ─────────────────────────────────────────────────────────

export function Avatar({ name, size = 8 }) {
  const sz = { 5: 'w-5 h-5 text-[9px]', 6: 'w-6 h-6 text-[10px]', 7: 'w-7 h-7 text-xs', 8: 'w-8 h-8 text-xs' };
  return (
    <div className={`${sz[size] || 'w-8 h-8 text-xs'} rounded-full bg-brand-navy text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}

export function TypeBadge({ type, compact = false }) {
  const t = TYPES[type] || TYPES.Task;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-white px-1.5 py-0.5 rounded-sm ${t.color}`}>
      {!compact && <span>{t.icon}</span>}
      {type}
    </span>
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-3xl mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">{title}</h3>
      <p className="text-sm text-neutral-400 mb-5 max-w-xs">{subtitle}</p>
      {action}
    </div>
  );
}

export function NavItem({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-neutral-100 dark:bg-neutral-800 text-brand-navy font-semibold' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'}`}>
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1 text-left flex items-center">{children}</span>
    </button>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-neutral-900/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-brand-navy">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

export function RoleBadge({ role, tier, small = false }) {
  const r = ROLE_CONFIG[role] || Object.values(ROLE_CONFIG).find(c => c.tier === tier) || ROLE_CONFIG.MEMBER;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded ${small ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'} ${r.bg} ${r.text}`}>
      {r.label}
    </span>
  );
}

export function StatCard({ label, value, sub, color, icon, onClick }) {
  return (
    <div onClick={onClick} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-neutral-400 group-hover:text-brand-navy transition-colors">View →</span>
      </div>
      <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>
    </div>
  );
}

export function PriorityBadge({ priority }) {
  const p = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${p.bg} ${p.color}`}>{p.label}</span>;
}
