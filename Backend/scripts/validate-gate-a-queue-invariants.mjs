// Read-only regression probe. Run `npm.cmd run build` first; no DB/config access.
import { triangularSummary } from '../dist/services/queue-math.js';

const samples = [[0.1, 0.1, 0.2], [5.2, 5.2, 5.3]];
let failures = 0;

for (const sample of samples) {
  const result = triangularSummary(sample);
  const modeWithinBounds = result !== null
    && result.minimumMinutes <= result.mostLikelyMinutes
    && result.mostLikelyMinutes <= result.maximumMinutes;
  const meanWithinBounds = result !== null
    && result.minimumMinutes <= result.expectedMinutes
    && result.expectedMinutes <= result.maximumMinutes;
  const passed = modeWithinBounds && meanWithinBounds;
  if (!passed) failures += 1;
  console.log(JSON.stringify({
    status: passed ? 'PASS' : 'FAIL', sample, result, modeWithinBounds, meanWithinBounds,
  }));
}

console.log(JSON.stringify({ passed: samples.length - failures, failed: failures, scope: 'Local built JavaScript helper only; not the SQL queue RPC.' }));
if (failures) process.exitCode = 1;
