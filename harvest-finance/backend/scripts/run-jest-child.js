const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const cwd = path.resolve(__dirname, '..');
const jestBin = path.join(cwd, 'node_modules', 'jest', 'bin', 'jest.js');

const args = process.argv.slice(2).length ? process.argv.slice(2) : ['--runInBand', '--colors=false'];

console.log('Running jest with args:', args.join(' '));

const res = spawnSync('node', [jestBin, ...args, '--json'], { cwd, encoding: 'utf8' });

fs.writeFileSync(path.join(cwd, 'jest_child_stdout.log'), res.stdout || '');
fs.writeFileSync(path.join(cwd, 'jest_child_stderr.log'), res.stderr || '');
fs.writeFileSync(path.join(cwd, 'jest_child_status.txt'), String(res.status));

console.log('Exit status:', res.status);
console.log('Wrote logs: jest_child_stdout.log, jest_child_stderr.log, jest_child_status.txt');
process.exit(res.status || 0);
