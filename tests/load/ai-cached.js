/**
 * Load test: AI Control Plane — cached path (P95 < 300 ms, RB-40 §5).
 * Sends the same prompt repeatedly so the second+ request hits the response cache.
 * Run: k6 run tests/load/ai-cached.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, authHeader } from './config.js';

const aiCachedLatency = new Trend('ai_cached_ms', true);
const failures        = new Counter('ai_cached_failures');

// Deterministic prompt — repeats so cache warms after first VU iteration.
const CACHED_PROMPT = 'Summarize: Work item WI-42 is a high-priority bug in authentication.';

export const options = {
  stages: [
    { duration: '30s', target: 20  },
    { duration: '2m',  target: 50  },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    'ai_cached_ms{p(95)}': [`lt:${P95.AI_CACHED}`],
    'ai_cached_ms{p(99)}': [`lt:${P99.AI_CACHED}`],
    'ai_cached_failures':  ['count<10'],
    http_req_failed:       ['rate<0.02'],
  },
};

export default function () {
  const payload = JSON.stringify({
    capability:  'SUMMARIZATION',
    prompt:      CACHED_PROMPT,
    workspaceId: WORKSPACE_ID,
  });

  const res = http.post(
    `${BASE_URL}/api/v1/ai/generate`,
    payload,
    { headers: { ...authHeader(), 'Content-Type': 'application/json' } },
  );

  aiCachedLatency.add(res.timings.duration);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has text':   (r) => !!r.json('text'),
  });
  if (!ok) failures.add(1);

  sleep(0.2);
}
