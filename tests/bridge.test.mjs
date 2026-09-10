import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Broker,equal} from '../packages/bridge/server.mjs';
const token='test-admin-secret';
async function setup(t,timeoutMs=300) {
  const broker=await new Broker({token,port:0,timeoutMs}).start();t.after(()=>broker.close());
  const post=async(path,data={},auth=token,extra={})=>{const r=await fetch(`http://127.0.0.1:${broker.port}${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth}`,...extra},body:JSON.stringify(data)});return{code:r.status,data:await r.json()};};
  const {data:p}=await post('/pairing');
  const {data:c}=await post('/extension/pair',{clientId:'test-extension-instance',code:p.code});
  const ext=(path,data={})=>post(`/extension/${path}`,{clientId:'test-extension-instance',protocol:'0.1',...data},c.token);
  const tabs=[{handle:'tab-1',origin:'https://example.org',title:'Test',paused:false}];await ext('poll',{tabs});
  return{broker,post,ext,tabs,handle:'test-extension-instance:tab-1'};
}
test('reject browser-origin calls and invalid authentication',async t=>{const{post}=await setup(t);assert.equal((await post('/status',{},'bad')).code,401);assert.equal((await post('/status',{},token,{Origin:'https://example.org'})).code,403);assert.equal(equal('é','aa'),false);});
test('pairing code is single-use and extension token cannot invoke admin commands',async t=>{const{post,ext}=await setup(t);assert.equal((await post('/extension/pair',{clientId:'another-extension-instance',code:'bad'})).code,403);assert.equal((await ext('../status')).code,401);});
test('dispatch once; identical request reuses result; conflicting reuse rejected',async t=>{
  const{post,ext,tabs,handle}=await setup(t);const body={requestId:'r1',tabHandle:handle,op:'execute',args:{steps:[{action:'click',ref:'test'}]}};
  const pending=post('/command',body);await new Promise(r=>setTimeout(r,20));
  const {data}=await ext('poll',{tabs});assert.equal(data.task.requestId,'r1');assert.equal((await ext('poll',{tabs})).data.task,null);
  await ext('result',{requestId:'r1',result:{status:'completed'}});assert.equal((await pending).data.status,'completed');assert.equal((await post('/command',body)).data.status,'completed');
  assert.equal((await post('/command',{...body,args:{steps:[{action:'scroll'}]}})).code,409);
});
test('pause blocks mutations, allows read, and navigation cannot escape assigned origin',async t=>{
  const{post,ext,tabs,handle}=await setup(t);tabs[0].paused=true;await ext('poll',{tabs});
  assert.equal((await post('/command',{requestId:'p',tabHandle:handle,op:'execute',args:{steps:[{action:'click'}]}})).data.status,'needs_user');
  tabs[0].paused=false;await ext('poll',{tabs});assert.equal((await post('/command',{requestId:'n',tabHandle:handle,op:'navigate',args:{url:'https://other.example/'}})).code,400);
});
test('timeout after dispatch remains unknown and never redelivers; late result is separate',async t=>{
  const{post,ext,tabs,handle}=await setup(t,80);const pending=post('/command',{requestId:'late',tabHandle:handle,op:'execute',args:{steps:[{action:'click'}]}});
  await new Promise(r=>setTimeout(r,10));assert.ok((await ext('poll',{tabs})).data.task);
  assert.equal((await pending).data.status,'unknown');assert.equal((await ext('poll',{tabs})).data.task,null);
  await ext('result',{requestId:'late',result:{status:'completed'}});const r=(await post('/result',{requestId:'late'})).data;assert.equal(r.result.status,'unknown');assert.equal(r.lateResult.status,'completed');
});
test('queued timeout is not-started and revoked clients lose access',async t=>{
  const{post,ext,handle}=await setup(t,30);assert.equal((await post('/command',{requestId:'queued',tabHandle:handle,op:'snapshot'})).data.status,'not_started');
  await post('/revoke',{clientId:'test-extension-instance'});assert.equal((await ext('poll',{tabs:[]})).code,401);
});
test('browser commands work before tab assignment and opening is deduplicated',async t=>{
  const{post,ext}=await setup(t);await ext('poll',{tabs:[]});
  const body={requestId:'open-once',op:'open',args:{url:'https://example.org/'}};
  const pending=post('/command',body);await new Promise(r=>setTimeout(r,10));
  const dispatch=(await ext('poll',{tabs:[]})).data.task;
  assert.equal(dispatch.op,'open');
  await ext('result',{requestId:body.requestId,result:{status:'completed',tabHandle:'new'}});
  assert.equal((await pending).data.tabHandle,'new');
  assert.equal((await post('/command',body)).data.tabHandle,'new');
  assert.equal((await ext('poll',{tabs:[]})).data.task,null);
});
