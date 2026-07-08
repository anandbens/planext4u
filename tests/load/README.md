# Load testing

## Why not run from Lovable's sandbox?

Firing 1,000 concurrent VUs from this sandbox at your production Supabase
backend would:

- write real rows into `social_posts`, `orders`, `cart`, etc.
- burn edge-function invocations and AI credits
- trip Supabase rate limits / abuse detection
- pollute analytics

Load tests should always target a **staging** deployment with a separate
Supabase project.

## Install k6

macOS: `brew install k6`
Linux: `sudo apt install k6` (or see https://k6.io/docs/getting-started/installation/)
Docker: `docker run --rm -i grafana/k6 run - <tests/load/k6-smoke.js`

## Run

Smoke (single 1000-VU ramp):

```bash
BASE_URL=https://staging.planext4u.com k6 run tests/load/k6-smoke.js
```

Staged (100 → 500 → 1000 VUs, per-stage thresholds):

```bash
BASE_URL=https://staging.planext4u.com k6 run tests/load/k6-staged.js
```

`k6-staged.js` refuses to run unless `BASE_URL` looks like staging or
localhost. Per-stage budgets:

| Stage | VUs  | Duration | p(95) latency | Error rate |
| ----- | ---- | -------- | ------------- | ---------- |
| s100  | 100  | 2m       | < 1000 ms     | < 0.5 %    |
| s500  | 500  | 3m       | < 1500 ms     | < 1 %      |
| s1000 | 1000 | 3m       | < 2500 ms     | < 2 %      |

k6 exits non-zero if any threshold breaches, so the GitHub workflow at
`.github/workflows/load-test.yml` fails the run automatically. The workflow is
`workflow_dispatch` + weekly cron only (never on push), gated on the `staging`
GitHub environment, and reads `STAGING_BASE_URL` from environment secrets.

## Interpreting results

- `http_req_duration p(95)` — 95th-percentile page-load time; threshold set to 1.5 s
- `http_req_failed rate`    — request failure ratio; threshold < 1 %
- `iterations`              — total virtual-user iterations completed
- Per-path breakdown is emitted because each request is tagged with `path`

If `p(95)` exceeds 1.5 s at 1,000 VUs, likely culprits (in order):

1. Client bundle size (check `dist/assets/*.js` sizes after `bun run build`)
2. Cloudflare/CDN cache-miss rate on `/app/*.html` (should be near-100% cache hits after warm-up)
3. Supabase Postgres connection saturation (Cloud → Overview → Advanced settings → resize compute)
4. RLS policies doing per-row auth checks — profile the slow queries with `supabase--slow_queries`
