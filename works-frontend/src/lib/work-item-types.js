import {
  SquareCheck, BookOpen, Bug, Zap, CornerDownRight, Flame, Package,
  ClipboardList, Target, Wrench, Rocket, Shield, Flag, Lightbulb,
  Star, FileText, Gauge, Layers, GitBranch, AlertTriangle, Headphones,
  Users, Lock, Tag, Briefcase, Ticket,
} from 'lucide-react';

// Work-item type vocabulary — 16 built-in types across three categories:
// Delivery (9), RAID (4), Service (3). RB-30 §8 — Lucide icons only, never emoji.
// NOTE: "Project" is a first-class container (workspace), not a work-item type.

// ── Category metadata ──────────────────────────────────────────────────────────

export const CATEGORIES = {
  DELIVERY: {
    label: 'Delivery',
    description: 'Capabilities, products, initiatives, and execution work',
    color: 'bg-brand-navy',
    textColor: 'text-brand-navy',
  },
  RAID: {
    label: 'RAID',
    description: 'Risks, Issues, Assumptions, Dependencies',
    color: 'bg-semantic-warning',
    textColor: 'text-semantic-warning',
  },
  SERVICE: {
    label: 'Service',
    description: 'Incidents and service requests',
    color: 'bg-semantic-danger',
    textColor: 'text-semantic-danger',
  },
};

// ── Type definitions ──────────────────────────────────────────────────────────
// Hierarchy (Delivery): Capability / Product (roots)
//   → Initiative (maps to Capability OR Product as parent)
//   → Theme → Epic → Story / Bug → Task → Activity

export const ALL_TYPES = [
  // ── DELIVERY ────────────────────────────────────────────────────────────────
  {
    typeKey: 'CAPABILITY',    category: 'DELIVERY', label: 'Capability',
    icon: 'target',           color: 'bg-brand-navy',          autoIdPrefix: 'CAP',
    validParents: [],
    description: 'Top-level business capability BCITS builds or owns',
  },
  {
    typeKey: 'PRODUCT',       category: 'DELIVERY', label: 'Product',
    icon: 'package',          color: 'bg-neutral-700',         autoIdPrefix: 'PRD',
    validParents: ['CAPABILITY'],
    description: 'A BCITS product — can optionally roll up to a Capability',
  },
  {
    typeKey: 'INITIATIVE',    category: 'DELIVERY', label: 'Initiative',
    icon: 'rocket',           color: 'bg-semantic-success',    autoIdPrefix: 'INI',
    validParents: ['CAPABILITY', 'PRODUCT'],
    description: 'Strategic effort — maps to a Capability or a Product roadmap',
  },
  {
    typeKey: 'THEME',         category: 'DELIVERY', label: 'Theme',
    icon: 'layers',           color: 'bg-brand-navy-tint',     autoIdPrefix: 'THM',
    validParents: ['CAPABILITY', 'INITIATIVE'],
    description: 'Strategic grouping of Epics — sits between Initiative and Epic',
  },
  {
    typeKey: 'EPIC',          category: 'DELIVERY', label: 'Epic',
    icon: 'zap',              color: 'bg-brand-navy',          autoIdPrefix: 'EP',
    validParents: ['INITIATIVE', 'THEME'],
    description: 'Large body of work spanning multiple sprints',
  },
  {
    typeKey: 'STORY',         category: 'DELIVERY', label: 'Story',
    icon: 'book-open',        color: 'bg-semantic-success',    autoIdPrefix: 'ST',
    validParents: ['EPIC'],
    description: 'User-facing feature — As a… I want… So that…',
  },
  {
    typeKey: 'BUG',           category: 'DELIVERY', label: 'Bug',
    icon: 'bug',              color: 'bg-semantic-danger',     autoIdPrefix: 'BUG',
    validParents: ['EPIC', 'STORY'],
    description: 'Software defect requiring a fix',
  },
  {
    typeKey: 'TASK',          category: 'DELIVERY', label: 'Task',
    icon: 'check-square',     color: 'bg-brand-navy-tint',     autoIdPrefix: 'TK',
    validParents: ['EPIC', 'STORY', 'BUG',
                   'INCIDENT', 'HR_SERVICE_REQUEST', 'IT_SERVICE_REQUEST'],
    description: 'Atomic unit of work (hours-level)',
  },
  {
    typeKey: 'ACTIVITY',      category: 'DELIVERY', label: 'Activity',
    icon: 'corner-down-right', color: 'bg-neutral-600',        autoIdPrefix: 'ACT',
    validParents: ['STORY', 'BUG', 'TASK'],
    description: 'Sub-level action or checklist item',
  },

  // ── RAID ────────────────────────────────────────────────────────────────────
  {
    typeKey: 'RISK',          category: 'RAID', label: 'Risk',
    icon: 'alert-triangle',   color: 'bg-semantic-warning',    autoIdPrefix: 'RSK',
    validParents: [],
    description: 'Potential future problem — tracked with probability × impact',
  },
  {
    typeKey: 'ISSUE',         category: 'RAID', label: 'Issue',
    icon: 'flame',            color: 'bg-semantic-danger',     autoIdPrefix: 'ISS',
    validParents: [],
    description: 'Confirmed project-level problem affecting delivery',
  },
  {
    typeKey: 'ASSUMPTION',    category: 'RAID', label: 'Assumption',
    icon: 'lightbulb',        color: 'bg-semantic-warning',    autoIdPrefix: 'ASM',
    validParents: [],
    description: 'Something taken as true — needs active validation',
  },
  {
    typeKey: 'DEPENDENCY',    category: 'RAID', label: 'Dependency',
    icon: 'git-branch',       color: 'bg-neutral-600',         autoIdPrefix: 'DEP',
    validParents: [],
    description: 'A dependency on another team, system, or deliverable',
  },

  // ── SERVICE ─────────────────────────────────────────────────────────────────
  {
    typeKey: 'INCIDENT',          category: 'SERVICE', label: 'Incident',
    icon: 'shield',               color: 'bg-semantic-danger',   autoIdPrefix: 'INC',
    validParents: [],
    description: 'Live operational problem affecting a system or service',
  },
  {
    typeKey: 'HR_SERVICE_REQUEST', category: 'SERVICE', label: 'HR Service Request',
    icon: 'users',                 color: 'bg-semantic-success',  autoIdPrefix: 'HR',
    validParents: [],
    description: 'People and HR request — leave, onboarding, payroll, etc.',
  },
  {
    typeKey: 'IT_SERVICE_REQUEST', category: 'SERVICE', label: 'IT Service Request',
    icon: 'wrench',                color: 'bg-brand-navy-tint',   autoIdPrefix: 'IT',
    validParents: [],
    description: 'Technology request — hardware, software access, network, etc.',
  },
];

// Keyed lookup for fast access
export const TYPES_BY_KEY = Object.fromEntries(ALL_TYPES.map(t => [t.typeKey, t]));

// Legacy flat map for backward-compat components that read TYPES
export const TYPES = Object.fromEntries(
  ALL_TYPES.map(t => [t.label, { color: t.color, icon: t.icon }])
);

// Types that support the Move To… parent-reassignment feature
export const MOVABLE_TYPES = new Set(['STORY', 'BUG', 'TASK', 'ACTIVITY']);

// Valid children per parent type — mirrors DefaultWorkItemTypes.VALID_CHILDREN
// Hierarchy: Capability/Product → Initiative → Theme → Epic → Story/Bug → Task → Activity
export const VALID_CHILDREN = {
  CAPABILITY:         ['PRODUCT', 'INITIATIVE', 'THEME'],
  PRODUCT:            ['INITIATIVE'],
  INITIATIVE:         ['THEME', 'EPIC'],
  THEME:              ['EPIC'],
  EPIC:               ['STORY', 'BUG', 'TASK'],
  STORY:              ['TASK', 'BUG', 'ACTIVITY'],
  BUG:                ['TASK', 'ACTIVITY'],
  TASK:               ['ACTIVITY'],
  INCIDENT:           ['TASK'],
  HR_SERVICE_REQUEST: ['TASK'],
  IT_SERVICE_REQUEST: ['TASK'],
};

/** Returns the set of type keys that may be parents of the given child type. */
export function validParentsFor(childTypeKey) {
  return Object.entries(VALID_CHILDREN)
    .filter(([, children]) => children.includes(childTypeKey))
    .map(([parent]) => parent);
}

// ── Icon resolution ───────────────────────────────────────────────────────────

export const TYPE_ICON_SET = {
  'check-square': SquareCheck,  'book-open': BookOpen,     bug: Bug,
  layers: Layers,               'git-branch': GitBranch,   'alert-triangle': AlertTriangle,
  headphones: Headphones,       zap: Zap,                  'corner-down-right': CornerDownRight,
  flame: Flame,                 package: Package,          clipboard: ClipboardList,
  target: Target,               wrench: Wrench,            rocket: Rocket,
  shield: Shield,               flag: Flag,                lightbulb: Lightbulb,
  star: Star,                   file: FileText,            gauge: Gauge,
  users: Users,                 lock: Lock,                tag: Tag,
  briefcase: Briefcase,
  // Legacy aliases for backward-compat with old stored icon values
  book: BookOpen,
};

export const TYPE_ICON_KEYS = Object.keys(TYPE_ICON_SET);

// Backward-compat map for emoji values stored in old data (pre-17-type taxonomy).
// '🎫' (Service Request) remapped to 'headphones'; 'ticket' removed from TYPE_ICON_SET.
export const LEGACY_TYPE_ICON = {
  '✓': 'check-square', '📖': 'book-open', '🐛': 'bug', '⚡': 'zap',
  '↳': 'corner-down-right', '🔥': 'flame', '🎫': 'headphones', '📦': 'package',
  '📋': 'clipboard', '🎯': 'target', '🔧': 'wrench', '🚀': 'rocket',
  '🛡': 'shield', '🚩': 'flag', '💡': 'lightbulb', '⭐': 'star',
};

export function resolveTypeIcon(value) {
  if (!value) return Package;
  if (TYPE_ICON_SET[value]) return TYPE_ICON_SET[value];
  if (LEGACY_TYPE_ICON[value]) return TYPE_ICON_SET[LEGACY_TYPE_ICON[value]];
  return null;
}

/** Returns the Lucide component for a given type key (e.g. 'EPIC'). */
export function typeIcon(typeKey) {
  const t = TYPES_BY_KEY[typeKey];
  return t ? resolveTypeIcon(t.icon) ?? Package : Package;
}
