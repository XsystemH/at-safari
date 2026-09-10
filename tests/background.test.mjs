import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';

test('domain discovery and background opening do not activate the user tab or request permissions', async () => {
  const tabs=[{id:1,url:'https://example.org/',title:'User page',active:true},
    {id:2,url:'https://team.feishu.cn/drive/home',title:'Docs',active:false}];
  let granted=true,created=0;
  const event={addListener(){}};
  const api={storage:{local:{get:async()=>({}),set:async()=>{}}},
    runtime:{id:'test',onMessage:event,getURL:file=>'extension://test/'+file},
    permissions:{contains:async()=>granted,request(){throw new Error('Must never request permissions in background');}},
    tabs:{onActivated:event,onUpdated:event,onRemoved:event,
      query:async query=>query.active?tabs.filter(t=>t.active):tabs,
      create:async args=>{assert.equal(args.active,false);created++;const tab={...args,id:tabs.length+1};tabs.push(tab);return tab;}}};
  const context=vm.createContext({browser:api,URL,crypto:webcrypto,setInterval(){}});
  for(const file of ['permissions.js','background.js'])vm.runInContext(readFileSync(new URL('../apps/safari/web-extension/'+file,import.meta.url),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  const task=(op,args,deadline=Date.now()+1000)=>context.run({op,args,deadline});
  const found=await task('tabs',{domain:'feishu.cn'});
  assert.equal(found.tabs.length,1);assert.equal(found.tabs[0].id,2);
  const opened=await task('open',{url:'https://team.feishu.cn/drive/home'});
  assert.equal(opened.status,'completed');assert.equal(opened.foregroundUnchanged,true);
  assert.equal(tabs[0].active,true);assert.equal(created,1);assert.ok(opened.tabHandle);
  granted=false;
  assert.equal((await task('open',{url:'https://other.example/'})).reason,'permission_required');
  assert.equal((await task('open',{url:'https://team.feishu.cn/'},Date.now()-1)).reason,'expired');
  assert.equal(created,1);
});
