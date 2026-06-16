import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isValidElement } from 'react';
import DOMPurify from 'dompurify';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// True when `icon` is a renderable component *type* that should be created as <Icon /> rather than
// rendered as a child node. lucide-react ships its icons as forwardRef objects (typeof 'object',
// not 'function'), so a bare `typeof icon === 'function'` check misclassifies every Lucide icon as
// a node and React throws "Objects are not valid as a React child". This accepts function
// components and forwardRef/memo objects, while letting already-created elements and strings
// (legacy emoji) fall through to be rendered directly.
export function isIconComponent(icon) {
  if (typeof icon === 'function') return true;
  return typeof icon === 'object' && icon !== null && '$$typeof' in icon && !isValidElement(icon);
}

// Make a non-button clickable element keyboard-operable (Enter/Space) — pair with
// role="button" + tabIndex={0} + a focus ring. Fires the element's own onClick via a click().
export function onPressKey(e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); }
}

// Coarse time-of-day bucket ('morning' | 'afternoon' | 'evening') for greetings. Single home so
// the dashboard greeting and any other surface share one definition (was duplicated in App.jsx and
// dashboard-view.jsx).
export function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// Render CommonMark-subset text to sanitised HTML for dangerouslySetInnerHTML (KR-001).
// Marks: **bold**, *italic*, ~~strikethrough~~, __underline__, `code`, [text](url), list bullets.
// DOMPurify allows only the mark tags — XSS vectors (scripts, event attrs) are stripped (RB-10 §8).
export function renderMd(text) {
  if (!text) return '';
  const html = text
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/gs, '<s>$1</s>')
    .replace(/__(.+?)__/gs, '<u>$1</u>')
    .replace(/\*(.+?)\*/gs, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="prose-md-code">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br/>');
  // KR-005: span is allowed so text-color / highlight marks can pass through.
  // DOMPurify strips event handlers and dangerous attributes; Tailwind class names are safe.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 's', 'u', 'code', 'br', 'a', 'span'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
  });
}
