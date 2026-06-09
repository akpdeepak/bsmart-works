/**
 * Load test: file upload (P95 < 3000 ms, RB-40 §5).
 * Uploads a synthetic 100 KB binary blob as an attachment.
 * Run: k6 run tests/load/file-upload.js -e BASE_URL=https://your-host -e AUTH_TOKEN=...
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, P95, P99, WORKSPACE_ID, PROJECT_ID, authHeader } from './config.js';

const uploadLatency = new Trend('file_upload_ms', true);
const failures      = new Counter('file_upload_failures');

export const options = {
  stages: [
    { duration: '30s', target: 5  },
    { duration: '2m',  target: 20 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    'file_upload_ms{p(95)}': [`lt:${P95.FILE_UPLOAD}`],
    'file_upload_ms{p(99)}': [`lt:${P99.FILE_UPLOAD}`],
    'file_upload_failures':  ['count<5'],
    http_req_failed:         ['rate<0.01'],
  },
};

// Generate a synthetic 100 KB payload once per VU (not per iteration).
const BLOB_100KB = new Uint8Array(100 * 1024).fill(65);  // 100 KB of 'A's

export default function () {
  const formData = {
    file: http.file(BLOB_100KB, `loadtest-${Date.now()}.bin`, 'application/octet-stream'),
    workspaceId: WORKSPACE_ID,
    entityType:  'WORK_ITEM',
    entityId:    `WI-${Math.floor(Math.random() * 10000)}`,
  };

  const res = http.post(
    `${BASE_URL}/api/v1/attachments`,
    formData,
    { headers: authHeader() },  // Content-Type set automatically for multipart
  );

  uploadLatency.add(res.timings.duration);

  const ok = check(res, {
    'status 201': (r) => r.status === 201,
    'has url':    (r) => !!r.json('url'),
  });
  if (!ok) failures.add(1);

  sleep(1);
}
