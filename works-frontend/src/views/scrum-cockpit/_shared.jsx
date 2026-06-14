// Sprint Cockpit — shared constants, extracted from scrum-master-cockpit-view.jsx
// (Wave 3 split). Pure structural move: no behaviour change. The CockpitSkeleton component
// lives in cockpit-skeleton.jsx so this stays a constants-only module (react-refresh).

export const RETRO_COLUMNS = {
  START_STOP_CONTINUE: [
    { key: 'START', label: 'Start' },
    { key: 'STOP', label: 'Stop' },
    { key: 'CONTINUE', label: 'Continue' },
  ],
  FOUR_LS: [
    { key: 'LIKED', label: 'Liked' },
    { key: 'LEARNED', label: 'Learned' },
    { key: 'LACKED', label: 'Lacked' },
    { key: 'LONGED_FOR', label: 'Longed for' },
  ],
  MAD_SAD_GLAD: [
    { key: 'MAD', label: 'Mad' },
    { key: 'SAD', label: 'Sad' },
    { key: 'GLAD', label: 'Glad' },
  ],
};

export const CEREMONY_LABELS = {
  STANDUP: 'Standup',
  PLANNING: 'Sprint planning',
  REVIEW: 'Sprint review',
  RETRO: 'Retrospective',
  REFINEMENT: 'Backlog refinement',
};

export const TAB_LABELS = {
  health: 'Health', myday: 'My Day', ceremonies: 'Ceremonies', standup: 'Standup', impediments: 'Impediments',
  risk: 'Risk panel', variance: 'Variance', planning: 'Planning', capacity: 'Capacity', retro: 'Retro',
  review: 'Review prep', patterns: 'Patterns',
};

// One surface, role-shaped: tab order/visibility follows the caller's team role (role_key,
// shared with the Today surface). Relevance only — every action stays RBAC-gated server-side.
export const ROLE_TABS = {
  'scrum-master': ['ceremonies', 'standup', 'impediments', 'risk', 'variance', 'planning', 'capacity', 'retro', 'review', 'patterns', 'health'],
  admin: ['ceremonies', 'standup', 'impediments', 'risk', 'variance', 'planning', 'capacity', 'retro', 'review', 'patterns', 'health'],
  developer: ['myday', 'standup', 'impediments', 'capacity', 'retro', 'ceremonies'],
  'product-owner': ['health', 'planning', 'capacity', 'review', 'variance', 'patterns', 'ceremonies', 'impediments'],
  executive: ['health', 'variance', 'risk', 'review', 'patterns', 'ceremonies'],
};

export const ROLE_LABELS = {
  'scrum-master': 'Scrum master', developer: 'Developer', 'product-owner': 'Product owner',
  executive: 'Executive', admin: 'Admin',
};

// Two-mode IA: "Run" = surfaces you act on; "Insights" = surfaces you read/analyse.
export const RUN_TABS = ['myday', 'ceremonies', 'standup', 'impediments', 'retro', 'planning', 'capacity', 'review'];
export const INSIGHTS_TABS = ['health', 'variance', 'risk', 'patterns'];

export const RAISE_LABELS = {
  IMPEDIMENT: 'Impediment', RISK: 'Risk', DEPENDENCY: 'Dependency',
  SCOPE_CHANGE: 'Scope change', DECISION_NEEDED: 'Decision needed', ESCALATION: 'Escalation',
};

export const ATTENDANCE_GROUPS = [
  { status: 'JOINED', label: 'Joined' },
  { status: 'EXPECTED', label: 'Not joined yet' },
  { status: 'ABSENT', label: 'Did not join' },
  { status: 'EXCUSED', label: 'Excused' },
];

// Coach pro-tip tone → token classes (status by colour AND icon, never colour alone).
export const TIP_TONE = {
  danger: 'text-semantic-danger',
  warning: 'text-semantic-warning',
  info: 'text-brand-navy dark:text-neutral-200',
};

// Executive Health RAG verdict → token classes (paired with the label + Activity icon).
export const RAG_TONE = {
  RED: 'text-semantic-danger',
  AMBER: 'text-semantic-warning',
  GREEN: 'text-semantic-success',
};
export const RAG_DOT = {
  RED: 'bg-semantic-danger',
  AMBER: 'bg-semantic-warning',
  GREEN: 'bg-semantic-success',
};
