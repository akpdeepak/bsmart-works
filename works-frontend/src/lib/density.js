// ── Density configuration — single source of truth (WI-23) ────────────────────
// Consumers: SprintBoard, board-view WorkCard, backlog rows, DataTable rows, etc.
// Tailwind consumers use the maps below; CSS consumers use the --dp-* custom
// properties declared in index.css via [data-density] selectors.

export const DENSITY_LEVELS = ['compact', 'comfortable', 'spacious'];
export const DENSITY_DEFAULT = 'comfortable';
export const DENSITY_STORAGE_KEY = 'bsmart_density';

// Card/row padding per density level — token-driven padding scale.
export const DENSITY_PAD = {
  compact:     'p-2',
  comfortable: 'p-3',
  spacious:    'p-4',
};

// Gap between list/grid items per density level.
export const DENSITY_GAP = {
  compact:     'gap-1',
  comfortable: 'gap-2',
  spacious:    'gap-3',
};

// Vertical padding for table/list row cells.
export const DENSITY_ROW_Y = {
  compact:     'py-1',
  comfortable: 'py-2',
  spacious:    'py-3',
};
