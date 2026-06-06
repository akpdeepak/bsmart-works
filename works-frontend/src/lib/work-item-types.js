import {
  SquareCheck, BookOpen, Bug, Zap, CornerDownRight, Flame, Ticket, Package,
  ClipboardList, Target, Wrench, Rocket, Shield, Flag, Lightbulb, Star, FileText, Gauge,
} from 'lucide-react';

// Work-item type vocabulary — data + resolution logic, extracted from the App.jsx monolith. Kept
// separate from the presentational components (work-item-type.jsx) so each file has a single export
// kind (react-refresh/only-export-components). RB-30 §8 — Lucide icons, never emoji.

// Built-in default types: brand colour + a curated icon key (keys index TYPE_ICON_SET below).
export const TYPES = {
  Task:            { color: 'bg-brand-navy-tint',     icon: 'check-square' },
  Story:           { color: 'bg-semantic-success',    icon: 'book' },
  Bug:             { color: 'bg-semantic-danger',      icon: 'bug' },
  Epic:            { color: 'bg-neutral-700',          icon: 'zap' },
  'Sub-task':      { color: 'bg-neutral-600',          icon: 'corner-down-right' },
  Incident:        { color: 'bg-semantic-warning',     icon: 'flame' },
  'Service Request': { color: 'bg-brand-navy',         icon: 'ticket' },
};

// Curated Lucide icon set for work-item types. Values are stable string keys persisted on custom
// types; the built-in TYPES above reference the same keys.
export const TYPE_ICON_SET = {
  'check-square': SquareCheck, book: BookOpen, bug: Bug, zap: Zap,
  'corner-down-right': CornerDownRight, flame: Flame, ticket: Ticket, package: Package,
  clipboard: ClipboardList, target: Target, wrench: Wrench, rocket: Rocket,
  shield: Shield, flag: Flag, lightbulb: Lightbulb, star: Star, file: FileText, gauge: Gauge,
};

// Back-compat: pre-existing rows stored an emoji string — map the known ones to a curated key so
// legacy data renders as a Lucide glyph; anything unmapped falls back to the raw value.
export const LEGACY_TYPE_ICON = {
  '✓': 'check-square', '📖': 'book', '🐛': 'bug', '⚡': 'zap', '↳': 'corner-down-right',
  '🔥': 'flame', '🎫': 'ticket', '📦': 'package', '📋': 'clipboard', '🎯': 'target',
  '🔧': 'wrench', '🚀': 'rocket', '🛡': 'shield', '🚩': 'flag', '💡': 'lightbulb', '⭐': 'star',
};

export const TYPE_ICON_KEYS = Object.keys(TYPE_ICON_SET);

// Returns the Lucide component for a stored key (or legacy emoji), a default for empty input, or
// null when the key is unknown (callers render the raw value as a fallback).
export function resolveTypeIcon(value) {
  if (!value) return Package;
  if (TYPE_ICON_SET[value]) return TYPE_ICON_SET[value];
  if (LEGACY_TYPE_ICON[value]) return TYPE_ICON_SET[LEGACY_TYPE_ICON[value]];
  return null;
}
