// Manual integration test: assign /demo in Safari and switch away before running.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({name: 'at-safari-manual-smoke', version: '0.1.0'});
async function call(name, args = {}) {
  const result = await client.callTool({name, arguments: args});
  if (result.isError) throw new Error(result.content[0].text);
  return JSON.parse(result.content[0].text);
}
try {
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../plugins/at-safari/runtime/main.mjs', import.meta.url))],
    stderr: 'inherit',
  }));
  const status = await call('safari_status');
  const candidates = status.tabs.filter(t => t.online &&
    t.origin === 'http://127.0.0.1:19848' && t.title === 'at-safari local test');
  assert.equal(candidates.length, 1, 'Assign exactly one local /demo tab first.');
  const tabHandle = candidates[0].handle;
  const before = await call('safari_snapshot', {tabHandle});
  assert.equal(before.status, 'completed', JSON.stringify(before));
  assert.equal(before.url, 'http://127.0.0.1:19848/demo', 'Only the built-in synthetic fixture is supported.');
  const input = before.elements.find(e => e.name === 'Test name');
  const button = before.elements.find(e => e.name === 'Run test');
  assert.ok(input && button, 'Demo controls were not found.');
  const priorCount = Number(before.text.match(/Completed (\d+) time\(s\):/)?.[1] || 0);
  const requestId = randomUUID();
  const value = `background-${requestId.slice(0, 8)}`;
  const args = {tabHandle, requestId, steps: [
    {action: 'fill', ref: input.ref, value},
    {action: 'click', ref: button.ref},
  ]};
  const result = await call('safari_execute', args);
  assert.equal(result.status, 'completed', JSON.stringify(result));
  assert.deepEqual(await call('safari_execute', args), result, 'Identical requests must reuse the original result.');
  const after = await call('safari_snapshot', {tabHandle});
  assert.equal(after.status, 'completed', JSON.stringify(after));
  assert.ok(after.text.includes(`Completed ${priorCount + 1} time(s): ${value}`), 'Expected exactly one click and the filled value.');
  console.log(JSON.stringify({status: 'passed', tabHandle, requestId, value,
    checks: ['real Safari snapshot', 'background fill and click', 'deduplicated repeat', 'page result verified'],
    note: 'Observe the active Safari tab separately to verify focus was unchanged.'}, null, 2));
} finally {
  await client.close();
}
