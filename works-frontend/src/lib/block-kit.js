// bSmart Works — Know Studio block kit: shared constants for the block editor and the read-only
// renderer, kept in one place so the two never drift. No React components live here (so the
// react-refresh fast-refresh rule stays happy); only data and class-name tokens (RB-30 §1).

import { Info, AlertTriangle, CheckSquare } from 'lucide-react';

// Callout / panel variants — Confluence-style info / note / warning panels. Meaning is carried by
// an icon + a text label, never colour alone (RB-30 §6). Token surfaces via opacity, no raw hex.
// Borderless treatment: a faint 5% tint + a single 2px left accent bar (the consumer supplies
// `border-l-2`); `box` carries the left-border colour + tint so editor and renderer stay in sync.
export const CALLOUT_VARIANTS = {
  info: { label: 'Info', Icon: Info, box: 'border-l-brand-navy-tint bg-brand-navy-tint/5', accent: 'text-brand-navy dark:text-brand-amber' },
  success: { label: 'Success', Icon: CheckSquare, box: 'border-l-semantic-success bg-semantic-success/5', accent: 'text-semantic-success' },
  warning: { label: 'Warning', Icon: AlertTriangle, box: 'border-l-semantic-warning bg-semantic-warning/5', accent: 'text-semantic-warning' },
  danger: { label: 'Danger', Icon: AlertTriangle, box: 'border-l-semantic-danger bg-semantic-danger/5', accent: 'text-semantic-danger' },
};

// Sticky-note surfaces for the whiteboard block — token classes only.
export const STICKY_COLORS = ['bg-brand-amber/20', 'bg-semantic-success-surface', 'bg-brand-navy-tint/10', 'bg-brand-orange/15'];

// Curated, grouped emoji set for the picker — enough range to be expressive without shipping a
// 1.8k-emoji table. Kept here (not in the picker component) so the fast-refresh rule stays happy.
export const EMOJI_GROUPS = [
  { name: 'Smileys', emojis: ['😀', '😄', '😁', '😉', '😊', '🤩', '😎', '🤔', '😴', '🤯', '🥳', '😅'] },
  { name: 'Gestures', emojis: ['👍', '👎', '👏', '🙌', '🙏', '💪', '👀', '🤝', '✋', '👋', '🫶', '🤙'] },
  { name: 'Status', emojis: ['✅', '❌', '⚠️', '🚧', '🔥', '⭐', '❗', '❓', '⏳', '🎯', '📌', '🔒'] },
  { name: 'Work', emojis: ['📝', '📊', '📈', '📉', '🗂️', '📦', '🚀', '🛠️', '🐛', '💡', '🧩', '🔗'] },
  { name: 'Nature', emojis: ['🌟', '✨', '🌈', '☀️', '🌙', '⚡', '🌿', '🍀', '🌸', '🔋', '💧', '❄️'] },
  { name: 'Symbols', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '♻️', '✔️', '➕', '➖', '💯', '🆕'] },
];

// Whiteboard canvas geometry (pixels, used as inline style numbers — not class values).
export const CANVAS_H = 256;
export const NOTE_W = 144;
export const NOTE_H = 96;

// Classify a file by its name/url extension so the file block can show a type-aware icon + label and
// preview images inline. Returns one of: image | pdf | doc | sheet | slide | archive | video | audio
// | code | link (the catch-all). Pure — used by both the editor and the renderer.
const FILE_KINDS = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'],
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'rtf', 'odt', 'txt', 'md'],
  sheet: ['xls', 'xlsx', 'csv', 'ods'],
  slide: ['ppt', 'pptx', 'odp', 'key'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
  video: ['mp4', 'mov', 'avi', 'webm', 'mkv'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
  code: ['js', 'jsx', 'ts', 'tsx', 'java', 'py', 'go', 'rs', 'json', 'yaml', 'yml', 'sql', 'sh', 'html', 'css'],
};

export function fileKind(nameOrUrl) {
  const s = (nameOrUrl || '').split('?')[0].split('#')[0];
  const ext = s.includes('.') ? s.split('.').pop().toLowerCase() : '';
  for (const [kind, exts] of Object.entries(FILE_KINDS)) {
    if (exts.includes(ext)) return kind;
  }
  return 'link';
}

// Normalise a sheet/table grid to a rectangular `cols`-wide shape: every row is padded with empty
// cells to `cols`. Guards the editor and renderer against ragged rows in externally-shaped or
// partially-migrated block JSON (a short row would otherwise render fewer — uneditable — cells).
export function padRows(rows, cols) {
  const width = cols || (Array.isArray(rows) && rows[0] ? rows[0].length : 0);
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const r = Array.isArray(row) ? [...row] : [];
    while (r.length < width) r.push('');
    return r;
  });
}
