/**
 * Load test: work-item create (P95 < 300 ms, RB-40 §5).
 * Run: k6 run tests/load/work-item-create.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, PROJECT_ID, authHeader } from './config.js';

const createLatency = new Trend('work_item_create_ms', true);
const failures      = new Counter('work_item_create_failures');

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // ramp up
    { duration: '2m',  target: 50  },  // sustained load
    { duration: '30s', target: 100 },  // spike
    { duration: '30s', target: 0   },  // ramp down
  ],
  thresholds: {
    'work_item_create_ms{p(95)}': [`lt:${P95.WORK_ITEM_CREATE}`],
    'work_item_create_ms{p(99)}': [`lt:${P99.WORK_ITEM_CREATE}`],
    'work_item_create_failures':  ['count<5'],
    http_req_failed:              ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    title:       `Load-test item ${Date.now()}`,
    type:        'TASK',
    projectId:   PROJECT_ID,
    workspaceId: WORKSPACE_ID,
    priority:    'MEDIUM',
    status:      'TODO',
  });

  const res = http.post(
    `${BASE_URL}/api/v1/work-items`,
    payload,
    { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
  );

  createLatency.add(res.timings.duration);

  const ok = check(res, {
    'status 201': (r) => r.status === 201,
    'has id':     (r) => !!r.json('id'),
  });
  if (!ok) failures.add(1);

  sleep(0.5);
}
