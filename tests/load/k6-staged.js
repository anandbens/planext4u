// Staged k6 load test — 100 → 500 → 1000 VUs against read-only public routes.
//
// USAGE (STAGING ONLY — never production):
//   BASE_URL=https://staging.planext4u.com k6 run tests/load/k6-staged.js
//
// The script refuses to run unless BASE_URL points at a non-production host
// (must contain "staging", "localhost", or "127.0.0.1"). This is a guardrail;
// it does not replace human review before pointing load at a real backend.
//
// Per-stage thresholds are enforced automatically via k6's tagged sub-metrics:
// each stage tags its requests with `stage: s100|s500|s1000`, and k6 fails the
// run if any stage breaches its p(95) latency or error-rate budget.

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

// Guardrail — refuse to run against a production-looking host.
const isStaging =
  /staging|localhost|127\.0\.0\.1/i.test(BASE) &&
  !/planext4u\.(com|net)$/i.test(BASE.replace(/^https?:\/\//, ''));
if (!isStaging) {
  throw new Error(
    `Refusing to run load test against non-staging host "${BASE}". ` +
      `Set BASE_URL to a staging or localhost URL.`,
  );
}

const PATHS = [
  '/',
  '/app',
  '/app/browse',
  '/app/categories',
  '/app/classifieds',
  '/app/deals',
  '/app/trending',
];

// Custom metrics per stage for reporting clarity.
export const errors100 = new Rate('errors_s100');
export const errors500 = new Rate('errors_s500');
export const errors1000 = new Rate('errors_s1000');
export const latency100 = new Trend('latency_s100', true);
export const latency500 = new Trend('latency_s500', true);
export const latency1000 = new Trend('latency_s1000', true);

export const options = {
  scenarios: {
    stage_100: {
      executor: 'constant-vus',
      vus: 100,
      duration: '2m',
      tags: { stage: 's100' },
      env: { STAGE: 's100' },
      exec: 'run',
      startTime: '0s',
    },
    stage_500: {
      executor: 'constant-vus',
      vus: 500,
      duration: '3m',
      tags: { stage: 's500' },
      env: { STAGE: 's500' },
      exec: 'run',
      startTime: '2m30s',
    },
    stage_1000: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '3m',
      tags: { stage: 's1000' },
      env: { STAGE: 's1000' },
      exec: 'run',
      startTime: '6m0s',
    },
  },
  thresholds: {
    // Per-stage p(95) latency budgets (ms).
    'http_req_duration{stage:s100}':  ['p(95)<1000'],
    'http_req_duration{stage:s500}':  ['p(95)<1500'],
    'http_req_duration{stage:s1000}': ['p(95)<2500'],
    // Per-stage error-rate budgets.
    'http_req_failed{stage:s100}':  ['rate<0.005'], // < 0.5%
    'http_req_failed{stage:s500}':  ['rate<0.01'],  // < 1%
    'http_req_failed{stage:s1000}': ['rate<0.02'],  // < 2%
    // Global safety net.
    'http_req_failed': ['rate<0.02'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function run() {
  const stage = exec.scenario.name;
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(`${BASE}${path}`, {
    headers: { Accept: 'text/html' },
    tags: { path },
  });
  const ok = check(res, {
    'status < 500': (r) => r.status < 500,
    'body not empty': (r) => (r.body || '').length > 200,
  });

  if (stage === 'stage_100') {
    errors100.add(!ok);
    latency100.add(res.timings.duration);
  } else if (stage === 'stage_500') {
    errors500.add(!ok);
    latency500.add(res.timings.duration);
  } else {
    errors1000.add(!ok);
    latency1000.add(res.timings.duration);
  }

  sleep(Math.random() * 2 + 0.5);
}
