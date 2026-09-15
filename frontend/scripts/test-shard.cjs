// Jest 27 compatibility: discover with CRA's configuration, then partition files.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const match = /^(\d+)\/(\d+)$/.exec(process.argv[2] || '');
if (!match || +match[1] < 1 || +match[1] > +match[2] || process.argv.length !== 3) {
  console.error('Usage: npm run test:shard -- 1/2');
  process.exit(1);
}
const [, index, total] = match.map(Number);
const runner = require.resolve('react-scripts/scripts/test');
const common = ['--watchAll=false', '--ci'];
const options = { cwd: path.resolve(__dirname, '..'), env: { ...process.env, CI: 'true' } };
const discovery = spawnSync(process.execPath, [runner, ...common, '--listTests', '--json', '--runInBand'],
  { ...options, encoding: 'utf8' });
if (discovery.error || discovery.status !== 0) {
  console.error(discovery.error || discovery.stderr);
  process.exit(discovery.status || 1);
}
const tests = JSON.parse(discovery.stdout).sort();
const selected = tests.filter((_, i) => i % total === index - 1);
if (!selected.length) {
  console.error(`Shard ${index}/${total} has no tests (${tests.length} files total).`);
  process.exit(1);
}
console.log(`Shard ${index}/${total}: ${selected.length}/${tests.length} files\n${selected.join('\n')}`);
const result = spawnSync(process.execPath,
  [runner, ...common, '--runInBand', '--runTestsByPath', ...selected], { ...options, stdio: 'inherit' });
if (result.error) console.error(result.error);
process.exit(result.status === null ? 1 : result.status);
