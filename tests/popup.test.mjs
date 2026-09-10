import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const source = file => readFileSync(new URL(`../apps/safari/web-extension/${file}`, import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

for (const [existing,granted] of [[false,true],[false,false],[true,true]]) {
  test(`popup reuses existing permission or requests within the click gesture (existing=${existing}, grant=${granted})`, async () => {
    const dom = new JSDOM(source('popup.html'), {runScripts: 'outside-only'});
    const {window} = dom;
    const messages = [];
    let releaseTab, inGesture = false, permissionCalls = 0;
    window.browser = {
      tabs: {query: () => new Promise(resolve => {releaseTab = resolve;})},
      permissions: {contains:async()=>existing,request: args => {
        assert.equal(inGesture, true, 'Permission request must happen before the click handler yields.');
        assert.deepEqual(Array.from(args.origins), ['http://127.0.0.1/*']);
        permissionCalls++;
        return Promise.resolve(granted);
      }},
      runtime: {sendMessage: async message => {
        messages.push(message);
        return message.type === 'status' ? {connected: true, state: {tabs: {}}} : {ok: true};
      }},
    };
    try {
      window.eval(source('permissions.js'));
      window.eval(source('popup.js'));
      const button = window.document.getElementById('assign');
      assert.equal(button.disabled, true);
      assert.equal(permissionCalls, 0);
      releaseTab([{id: 42, url: 'http://127.0.0.1:19848/demo'}]);
      await tick();
      assert.equal(button.disabled, false);
      inGesture = true;
      const completion = button.onclick();
      assert.equal(permissionCalls, existing?0:1);
      inGesture = false;
      await completion;
      const assignment = messages.find(message => message.type === 'assign');
      if (granted) {
        assert.equal(assignment.tabId, 42);
        assert.equal(assignment.expectedOrigin, 'http://127.0.0.1:19848');
      } else {
        assert.equal(assignment, undefined);
        assert.match(window.document.getElementById('error').textContent, /not granted/);
      }
    } finally {window.close();}
  });
}
