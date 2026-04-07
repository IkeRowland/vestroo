#!/usr/bin/env node
/**
 * MVP load smoke: low concurrency GET /api/health against a running app.
 * Safe defaults; no mutations. See docs/hardening-and-go-live.md.
 *
 * Usage: npm run load-smoke
 * Env:
 *   LOAD_SMOKE_BASE_URL — default http://127.0.0.1:3000
 *   LOAD_SMOKE_REQUESTS — default 12 (cap 100)
 *   LOAD_SMOKE_CONCURRENCY — default 1 (cap 3)
 */

const baseUrl = (process.env.LOAD_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const requests = Math.min(100, Math.max(1, Number(process.env.LOAD_SMOKE_REQUESTS || '12') || 12));
const concurrency = Math.min(3, Math.max(1, Number(process.env.LOAD_SMOKE_CONCURRENCY || '1') || 1));

const target = `${baseUrl}/api/health`;

async function oneRequest(i) {
  const started = performance.now();
  const res = await fetch(target, { method: 'GET', headers: { Accept: 'application/json' } });
  const ms = Math.round(performance.now() - started);
  let body = '';
  try {
    body = await res.text();
  } catch {
    body = '(no body)';
  }
  const ok = res.ok;
  const line = `[${i + 1}/${requests}] ${res.status} in ${ms}ms`;
  if (!ok) {
    console.error(line, body.slice(0, 200));
  } else {
    console.log(line);
  }
  return { ok, status: res.status, ms };
}

async function runBatch(start, size) {
  const slice = [];
  for (let j = 0; j < size; j += 1) {
    const i = start + j;
    if (i >= requests) break;
    slice.push(oneRequest(i));
  }
  return Promise.all(slice);
}

async function main() {
  console.log(`Load smoke: ${target} (requests=${requests}, concurrency=${concurrency})`);
  const results = [];
  for (let start = 0; start < requests; start += concurrency) {
    const batch = await runBatch(start, concurrency);
    results.push(...batch);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`Done: ${failed.length}/${requests} non-2xx responses`);
    process.exit(1);
  }
  const maxMs = Math.max(...results.map((r) => r.ms));
  console.log(`Done: ${requests} OK, max latency ~${maxMs}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
