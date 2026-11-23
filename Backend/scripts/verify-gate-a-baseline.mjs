import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseline = JSON.parse(readFileSync(resolve(root, 'docs/reviewer/GATE_A_BASELINE.json'), 'utf8'));
const changed = [];

for (const entry of baseline.files) {
  const target = resolve(root, entry.path);
  const relativePath = relative(root, target);
  if (isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${sep}`)
    || relativePath.split(/[\\/]/).some(part => part.startsWith('.env'))) {
    throw new Error('Baseline contains an unsupported path.');
  }
  try {
    const actual = createHash('sha256').update(readFileSync(target)).digest('hex');
    if (actual !== entry.sha256) changed.push(entry.path);
  } catch {
    changed.push(entry.path);
  }
}

console.log(JSON.stringify({
  status: changed.length ? 'FAIL' : 'PASS',
  scope: 'Existing source/configuration captured before Gate A; excludes generated outputs and new reviewer artifacts.',
  checkedFiles: baseline.files.length,
  changedFiles: changed,
}, null, 2));
if (changed.length) process.exitCode = 1;
