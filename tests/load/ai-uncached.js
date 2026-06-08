/**
 * Load test: AI Control Plane — uncached (cold) path (P95 < 5000 ms, RB-40 §5).
 * Each VU sends a unique prompt to bypass the response cache, exercising the live provider path.
 * Run: k6 run tests/load/ai-uncached.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, authHeader } from './config.js';

const aiUncachedLatency = new Trend('ai_uncached_ms', true);
const failures          = new Counter('ai_uncached_failures');

export const options = {
  // Kept deliberately low — each request is a live LLM call; token budget matters.
  stages: [
    { duration: '30s', target: 5  },
    { duration: '2m',  target: 10 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    'ai_uncached_ms{p(95)}': [`lt:${P95.AI_UNCACHED}`],
    'ai_uncached_ms{p(99)}': [`lt:${P99.AI_UNCACHED}`],
    'ai_uncached_failures':  ['count<5'],
    http_req_failed:         ['rate<0.02'],
  },
};

export default function () {
  // Unique prompt per iteration prevents cache hits.
  const prompt = `Summarize item WI-${Date.now()}: Authentication latency spike observed in production at ${new Date().toISOString()}. Root cause unknown.`;

  const payload = JSON.stringify({
    capability:  'SUMMARIZATION',
    prompt,
    workspaceId: WORKSPACE_ID,
  });

  const res = http.post(
    `${BASE_URL}/api/v1/ai/generate`,
    payload,
    {
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      timeout: '15s',  // generous timeout; live LLM can be slow under load
    },
  );

  aiUncachedLatency.add(res.timings.duration);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has text':   (r) => !!r.json('text'),
  });
  if (!ok) failures.add(1);

  sleep(2);
}
