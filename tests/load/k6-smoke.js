// k6 load-test script — read-only endpoints only.
//
// USAGE (from a machine with k6 installed — https://k6.io/docs/getting-started/installation/):
//   BASE_URL=https://staging.example.com k6 run tests/load/k6-smoke.js
//
// ⚠ Run this against a STAGING deployment, NEVER against production. It
// issues thousands of concurrent GETs to /app, /app/browse, /app/categories,
// /app/classifieds and the public REST endpoints they rely on. Production
// runs will hit rate limits, inflate Supabase egress, and contaminate
// analytics.
//
// The scenario ramps up to 1000 concurrent virtual users over 2 minutes,
// holds for 5 minutes, then ramps down. Adjust `stages` to your needs.

import http from 'k6/http';
import { sleep, check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  scenarios: {
    ramp_to_1000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 1000 },  // warm-up
        { duration: '5m',  target: 1000 },  // steady state
        { duration: '1m',  target: 0    },  // cool-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // 95% of requests should complete under 1.5s; failure rate < 1%.
    http_req_duration: ['p(95)<1500'],
    http_req_failed:   ['rate<0.01'],
  },
};

const PATHS = [
  '/',
  '/app',
  '/app/browse',
  '/app/categories',
  '/app/classifieds',
  '/app/deals',
  '/app/trending',
];

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(`${BASE}${path}`, {
    headers: { 'Accept': 'text/html' },
    tags: { path },
  });
  check(res, {
    'status < 500': (r) => r.status < 500,
    'body not empty': (r) => (r.body || '').length > 200,
  });
  sleep(Math.random() * 2 + 0.5); // 0.5–2.5s think time
}
