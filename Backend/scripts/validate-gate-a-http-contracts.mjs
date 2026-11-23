// Local-only production-app smoke test using synthetic service configuration.
// Run `npm.cmd run build` first. No authenticated route or database is called.
import { readFileSync } from 'node:fs';
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_PATH = new URL('./gate-a-no-environment-file', import.meta.url).pathname;
process.env.DOTENV_CONFIG_QUIET = 'true';
process.env.SUPABASE_URL = 'https://gate-a-validation.invalid';
process.env.SUPABASE_SECRET_KEY = 'gate-a-synthetic-service-key-not-valid';
process.env.ALLOWED_ORIGINS = 'http://127.0.0.1';
process.env.REQUEST_TIMEOUT_MS = '5000';

const analyticsSource = readFileSync(new URL('../../Frontend/src/components/analytics/system-analytics-screen.tsx', import.meta.url), 'utf8');
const healthPath = analyticsSource.match(/fetch\(`\$\{API_BASE\}([^`]+)`/u)?.[1];
if (!healthPath) throw new Error('Cannot identify the frontend health request path.');

const { app } = await import('../dist/app.js');
const server = app.listen(0, '127.0.0.1');
let failures = 0;
try {
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local test server unavailable.');
  const base = `http://127.0.0.1:${address.port}`;
  for (const [name, path] of [
    ['Canonical backend health route', '/api/health'],
    ['Frontend health path against backend origin', healthPath],
  ]) {
    const response = await fetch(base + path);
    const payload = await response.json();
    const passed = response.status === 200 && payload.status === 'ok';
    if (!passed) failures += 1;
    console.log(JSON.stringify({ status: passed ? 'PASS' : 'FAIL', name, path, httpStatus: response.status }));
  }
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
console.log(JSON.stringify({ passed: 2 - failures, failed: failures, scope: 'Actual built Express app, localhost HTTP only, synthetic Supabase configuration; no DB/auth call.' }));
if (failures) process.exitCode = 1;
