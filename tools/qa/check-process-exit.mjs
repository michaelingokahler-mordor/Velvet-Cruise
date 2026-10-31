import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { waitForChildExit } from './helpers/process-exit.mjs';
const normal = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore', windowsHide: true });
assert.equal(await waitForChildExit(normal, 5000), 0);
assert.equal(await waitForChildExit(normal, 100), 0, 'Already-ended children resolve immediately');
const stuck = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', windowsHide: true });
try { await assert.rejects(waitForChildExit(stuck, 100), /timeout/i); }
finally { if (stuck.exitCode === null && stuck.signalCode === null) stuck.kill('SIGKILL'); }
await waitForChildExit(stuck, 5000);
console.log('PASS: native child normal exit, already-exited handling and bounded timeout cleanup');
