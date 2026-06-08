/**
 * Load test: search / BQL query (P95 < 500 ms, RB-40 §5).
 * Run: k6 run tests/load/search.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, authHeader } from './config.js';

const searchLatency = new Trend('search_ms', true);
const failures      = new Counter('search_failures');

// Representative BQL queries ranging from simple to complex.
const QUERIES = [
  'status = "TODO"',
  'assignee = currentUser() AND status != "DONE"',
  'priority = "HIGH" AND due < today()',
  'type = "BUG" AND created > today() - 7d',
  'label = "backend" AND status IN ("IN_PROGRESS", "REVIEW")',
];

export const options = {
  stages: [
    { duration: '30s', target: 20  },
    { duration: '2m',  target: 100 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    'search_ms{p(95)}':  [`lt:${P95.SEARCH}`],
    'search_ms{p(99)}':  [`lt:${P99.SEARCH}`],
    'search_failures':   ['count<5'],
    http_req_failed:     ['rate<0.01'],
  },
};

export default function () {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const url   = `${BASE_URL}/api/v1/bql/execute?workspaceId=${WORKSPACE_ID}&q=${encodeURIComponent(query)}&page=0&size=25`;

  const res = http.get(url, { headers: authHeader() });

  searchLatency.add(res.timings.duration);

  const ok = check(res, {
    'status 200':   (r) => r.status === 200,
    'has content':  (r) => r.json('content') !== undefined,
  });
  if (!ok) failures.add(1);

  sleep(0.3);
}
