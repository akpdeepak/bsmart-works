import {
  SquareCheck, BookOpen, Bug, Zap, CornerDownRight, Flame, Ticket, Package,
  ClipboardList, Target, Wrench, Rocket, Shield, Flag, Lightbulb, Star, FileText, Gauge,
  Layers, GitBranch, AlertTriangle, Headphones,
} from 'lucide-react';

// Work-item type vocabulary — data + resolution logic, extracted from the App.jsx monolith. Kept
// separate from the presentational components (work-item-type.jsx) so each file has a single export
// kind (react-refresh/only-export-components). RB-30 §8 — Lucide icons, never emoji.

// Built-in default types: spec-mandated icon map (WRK-BR08) — Epic=layers, Story=book-open,
// Task=check-square, Bug=bug, Sub-task=git-branch, Incident=alert-triangle, Service Request=headphones.
export const TYPES = {
  Task:            { color: 'bg-brand-navy-tint',     icon: 'check-square' },
  Story:           { color: 'bg-semantic-success',    icon: 'book-open' },
  Bug:             { color: 'bg-semantic-danger',     icon: 'bug' },
  Epic:            { color: 'bg-neutral-700',         icon: 'layers' },
  'Sub-task':      { color: 'bg-neutral-600',         icon: 'git-branch' },
  Incident:        { color: 'bg-semantic-warning',    icon: 'alert-triangle' },
  'Service Request': { color: 'bg-brand-navy',        icon: 'headphones' },
};

// Curated Lucide icon set for work-item types. Values are stable string keys persisted on custom
// types; the built-in TYPES above reference the same keys.
export const TYPE_ICON_SET = {
  'check-square': SquareCheck, 'book-open': BookOpen, bug: Bug, layers: Layers,
  'git-branch': GitBranch, 'alert-triangle': AlertTriangle, headphones: Headphones,
  book: BookOpen, zap: Zap, 'corner-down-right': CornerDownRight, flame: Flame, ticket: Ticket,
  package: Package, clipboard: ClipboardList, target: Target, wrench: Wrench, rocket: Rocket,
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
