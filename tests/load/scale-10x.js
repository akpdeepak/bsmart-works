/**
 * 10x scale load test (B34, PERFORMANCE.md §2).
 * Exercises all critical paths simultaneously at 10× baseline concurrency.
 * Requires a live deployment — run against staging or a dedicated load-test environment.
 * Run: k6 run tests/load/scale-10x.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, PROJECT_ID, authHeader } from './config.js';

// Composite metrics
const scenarioLatency = new Trend('scenario_ms', true);
const errorRate       = new Rate('scenario_error_rate');
const totalErrors     = new Counter('scenario_errors');

export const options = {
  scenarios: {
    page_load: {
      executor:           'ramping-vus',
      startVUs:           0,
      stages: [
        { duration: '1m',  target: 200 },  // 10× baseline (20 VUs)
        { duration: '5m',  target: 200 },
        { duration: '1m',  target: 0   },
      ],
      exec: 'pageLoad',
    },
    work_item_create: {
      executor:           'ramping-vus',
      startVUs:           0,
      stages: [
        { duration: '1m',  target: 500 },  // 10× baseline (50 VUs)
        { duration: '5m',  target: 500 },
        { duration: '1m',  target: 0   },
      ],
      exec: 'workItemCreate',
    },
    search: {
      executor:           'ramping-vus',
      startVUs:           0,
      stages: [
        { duration: '1m',  target: 1000 },
        { duration: '5m',  target: 1000 },
        { duration: '1m',  target: 0    },
      ],
      exec: 'search',
    },
    dashboard: {
      executor:           'ramping-vus',
      startVUs:           0,
      stages: [
        { duration: '1m',  target: 300 },
        { duration: '5m',  target: 300 },
        { duration: '1m',  target: 0   },
      ],
      exec: 'dashboard',
    },
  },
  thresholds: {
    // Each path must still meet its individual P95 budget under 10× load.
    'scenario_ms{scenario:page_load,p(95)}':         [`lt:${P95.PAGE_LOAD}`],
    'scenario_ms{scenario:work_item_create,p(95)}':  [`lt:${P95.WORK_ITEM_CREATE}`],
    'scenario_ms{scenario:search,p(95)}':            [`lt:${P95.SEARCH}`],
    'scenario_ms{scenario:dashboard,p(95)}':         [`lt:${P95.DASHBOARD_RENDER}`],
    scenario_error_rate:                             ['rate<0.01'],
    http_req_failed:                                 ['rate<0.01'],
  },
};

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW'];

// ── Scenario functions ────────────────────────────────────────────────────────

export function pageLoad() {
  const headers = authHeader();
  const t0 = Date.now();
  let ok = true;

  const r1 = http.get(`${BASE_URL}/api/v1/workspaces/${WORKSPACE_ID}`, { headers });
  ok = ok && r1.status === 200;
  const r2 = http.get(`${BASE_URL}/api/v1/work-items?workspaceId=${WORKSPACE_ID}&assignee=me&page=0&size=20`, { headers });
  ok = ok && r2.status === 200;

  scenarioLatency.add(Date.now() - t0, { scenario: 'page_load' });
  if (!ok) { errorRate.add(1); totalErrors.add(1); } else { errorRate.add(0); }
  sleep(1);
}

export function workItemCreate() {
  const payload = JSON.stringify({
    title:       `10x-${Date.now()}`,
    type:        'TASK',
    projectId:   PROJECT_ID,
    workspaceId: WORKSPACE_ID,
    priority:    'MEDIUM',
    status:      'TODO',
  });

  const t0  = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/work-items`,
    payload,
    { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
  );
  scenarioLatency.add(Date.now() - t0, { scenario: 'work_item_create' });

  const ok = res.status === 201;
  if (!ok) { errorRate.add(1); totalErrors.add(1); } else { errorRate.add(0); }
  sleep(0.5);
}

export function search() {
  const queries = ['status = "TODO"', 'assignee = currentUser()', 'type = "BUG"'];
  const q = queries[Math.floor(Math.random() * queries.length)];

  const t0  = Date.now();
  const res = http.get(
    `${BASE_URL}/api/v1/bql/execute?workspaceId=${WORKSPACE_ID}&q=${encodeURIComponent(q)}&page=0&size=25`,
    { headers: authHeader() },
  );
  scenarioLatency.add(Date.now() - t0, { scenario: 'search' });

  const ok = res.status === 200;
  if (!ok) { errorRate.add(1); totalErrors.add(1); } else { errorRate.add(0); }
  sleep(0.3);
}

export function dashboard() {
  const t0  = Date.now();
  const res = http.get(
    `${BASE_URL}/api/v1/dashboards?workspaceId=${WORKSPACE_ID}&page=0&size=5`,
    { headers: authHeader() },
  );
  scenarioLatency.add(Date.now() - t0, { scenario: 'dashboard' });

  const ok = res.status === 200;
  if (!ok) { errorRate.add(1); totalErrors.add(1); } else { errorRate.add(0); }
  sleep(1);
}
