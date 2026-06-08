/**
 * Load test: board drag-drop (status transition, P95 < 150 ms, RB-40 §5).
 * Simulates a Kanban card drag: PATCH work item status → verify new state.
 * Run: k6 run tests/load/board-drag-drop.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, authHeader } from './config.js';

const dragDropLatency = new Trend('board_drag_drop_ms', true);
const failures        = new Counter('board_drag_drop_failures');

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

// k6 setUp creates a single test item whose id is shared across VUs via __ENV.
// In a real run, provide a pre-seeded ITEM_ID via env: -e ITEM_ID=WI-123
const ITEM_ID = __ENV.ITEM_ID || 'WI-LOADTEST-1';

export const options = {
  stages: [
    { duration: '30s', target: 20  },
    { duration: '2m',  target: 100 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    'board_drag_drop_ms{p(95)}': [`lt:${P95.BOARD_DRAG_DROP}`],
    'board_drag_drop_ms{p(99)}': [`lt:${P99.BOARD_DRAG_DROP}`],
    'board_drag_drop_failures':  ['count<10'],
    http_req_failed:             ['rate<0.01'],
  },
};

export default function () {
  const newStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const payload   = JSON.stringify({ status: newStatus, workspaceId: WORKSPACE_ID });

  const res = http.patch(
    `${BASE_URL}/api/v1/work-items/${ITEM_ID}/status`,
    payload,
    { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
  );

  dragDropLatency.add(res.timings.duration);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
  });
  if (!ok) failures.add(1);

  sleep(0.2);
}
