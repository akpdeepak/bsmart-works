// P95 SLA budgets from RB-40 §5. All values in milliseconds.
export const P95 = {
  PAGE_LOAD:        800,
  WORK_ITEM_CREATE: 300,
  SEARCH:           500,
  BOARD_DRAG_DROP:  150,
  DASHBOARD_RENDER: 1500,
  AI_CACHED:        300,
  AI_UNCACHED:      5000,
  FILE_UPLOAD:      3000,
};

// P99 budgets (same table).
export const P99 = {
  PAGE_LOAD:        2000,
  WORK_ITEM_CREATE: 1000,
  SEARCH:           1500,
  BOARD_DRAG_DROP:  500,
  DASHBOARD_RENDER: 3000,
  AI_CACHED:        1000,
  AI_UNCACHED:      10000,
  FILE_UPLOAD:      8000,
};

// Base URL — override with: k6 run -e BASE_URL=https://... script.js
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// JWT token for a pre-seeded test workspace — override via env.
export const AUTH_TOKEN  = __ENV.AUTH_TOKEN  || 'load-test-token';
export const WORKSPACE_ID = __ENV.WORKSPACE_ID || 'WS-LOADTEST';
export const PROJECT_ID   = __ENV.PROJECT_ID   || 'PROJ-LOADTEST';

export function authHeader() {
  return { Authorization: `Bearer ${AUTH_TOKEN}` };
}
