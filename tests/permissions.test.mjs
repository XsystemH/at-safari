import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('Safari permission patterns omit ports while assigned URL origins retain them', () => {
  const context = vm.createContext({URL});
  vm.runInContext(readFileSync(new URL('../apps/safari/web-extension/permissions.js', import.meta.url), 'utf8'), context);
  assert.equal(context.permissionPattern('http://127.0.0.1:19848'), 'http://127.0.0.1/*');
  assert.equal(context.permissionPattern('https://example.org:8443'), 'https://example.org/*');
  assert.equal(context.permissionPattern('https://example.org'), 'https://example.org/*');
  assert.throws(() => context.permissionPattern('file:///tmp/test.html'));
  assert.notEqual(new URL('http://127.0.0.1:19848').origin, new URL('http://127.0.0.1:19849').origin);
});
