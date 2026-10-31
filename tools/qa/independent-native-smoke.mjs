import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] || 'output/independent-runtime/windows');
assert.ok(fs.existsSync(path.join(root,'resources','app','main.mjs')), 'candidate must contain the game-owned runtime');
assert.equal(fs.existsSync(path.join(root,'resources','app.asar')),false,'old runtime archive must not ship');
assert.equal(fs.existsSync(path.join(root,'resources','app.asar.unpacked')),false,'old native modules must not ship');
assert.ok(fs.existsSync(path.join(root,'resources','game','index.html')));
console.log('Native package ownership passed.');
