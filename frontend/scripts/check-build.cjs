// Smoke-check the downloaded CRA artifact, independently of source unit tests.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../build');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /id="root"/);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'asset-manifest.json'), 'utf8'));
assert.ok(manifest.entrypoints.length > 0, 'Missing build entrypoints');
for (const entry of manifest.entrypoints) {
  const target = path.resolve(root, entry);
  assert.ok(target.startsWith(root + path.sep), 'Entrypoint must stay inside build');
  assert.ok(fs.statSync(target).size > 0, `Missing or empty entrypoint: ${entry}`);
}
console.log('Build artifact valid: root element and all entrypoints present.');
