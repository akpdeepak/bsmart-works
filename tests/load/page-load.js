/**
 * Load test: page-load equivalent — API data fetch for a workspace home (P95 < 800 ms, RB-40 §5).
 * The "page load" budget covers the critical data fetch that blocks first contentful paint:
 * workspace summary + my work items + notification badge.
 * Run: k6 run tests/load/page-load.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, authHeader } from './config.js';

const pageLoadLatency = new Trend('page_load_ms', true);
const failures        = new Counter('page_load_failures');

export const options = {
  stages: [
    { duration: '30s', target: 20  },
    { duration: '2m',  target: 100 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    'page_load_ms{p(95)}': [`lt:${P95.PAGE_LOAD}`],
    'page_load_ms{p(99)}': [`lt:${P99.PAGE_LOAD}`],
    'page_load_failures':  ['count<5'],
    http_req_failed:       ['rate<0.01'],
  },
};

export default function () {
  const headers = authHeader();
  let allOk = true;

  const t0 = Date.now();

  // Parallel-ish critical path (browser makes these concurrently; k6 simulates sequentially
  // which is the conservative / harder test).
  group('workspace summary', () => {
    const r = http.get(`${BASE_URL}/api/v1/workspaces/${WORKSPACE_ID}`, { headers });
    allOk = allOk && check(r, { 'workspace 200': (r) => r.status === 200 });
  });

  group('my work items', () => {
    const r = http.get(
      `${BASE_URL}/api/v1/work-items?workspaceId=${WORKSPACE_ID}&assignee=me&page=0&size=20`,
      { headers },
    );
    allOk = allOk && check(r, { 'items 200': (r) => r.status === 200 });
  });

  group('notifications', () => {
    const r = http.get(
      `${BASE_URL}/api/v1/notifications?workspaceId=${WORKSPACE_ID}&unreadOnly=true&page=0&size=5`,
      { headers },
    );
    allOk = allOk && check(r, { 'notifs 200': (r) => r.status === 200 });
  });

  pageLoadLatency.add(Date.now() - t0);
  if (!allOk) failures.add(1);

  sleep(1);
}
