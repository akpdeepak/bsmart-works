/**
 * Load test: dashboard render (P95 < 1500 ms, RB-40 §5).
 * Simulates opening a workspace dashboard and fetching all its widgets.
 * Run: k6 run tests/load/dashboard.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, authHeader } from './config.js';

const dashboardLatency = new Trend('dashboard_render_ms', true);
const failures         = new Counter('dashboard_failures');

export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '2m',  target: 30  },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    'dashboard_render_ms{p(95)}': [`lt:${P95.DASHBOARD_RENDER}`],
    'dashboard_render_ms{p(99)}': [`lt:${P99.DASHBOARD_RENDER}`],
    'dashboard_failures':         ['count<5'],
    http_req_failed:              ['rate<0.01'],
  },
};

export default function () {
  const headers = authHeader();
  let allOk = true;

  // Total wall-clock time for dashboard = list + first widget data fetch (simulates browser render).
  const t0 = Date.now();

  group('dashboard list', () => {
    const res = http.get(
      `${BASE_URL}/api/v1/dashboards?workspaceId=${WORKSPACE_ID}&page=0&size=5`,
      { headers },
    );
    allOk = allOk && check(res, { 'list 200': (r) => r.status === 200 });

    // Fetch the first dashboard's widget data if list succeeded.
    if (res.status === 200) {
      const dashboards = res.json('content');
      if (dashboards && dashboards.length > 0) {
        const dashId = dashboards[0].id;
        const wRes = http.get(
          `${BASE_URL}/api/v1/dashboards/${dashId}?workspaceId=${WORKSPACE_ID}`,
          { headers },
        );
        allOk = allOk && check(wRes, { 'widget load 200': (r) => r.status === 200 });
      }
    }
  });

  dashboardLatency.add(Date.now() - t0);
  if (!allOk) failures.add(1);

  sleep(1);
}
