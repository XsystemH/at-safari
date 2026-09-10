import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const source=await readFile(new URL('../apps/safari/web-extension/content.js',import.meta.url),'utf8');
function fixture(){
  const dom=new JSDOM('<h1>Demo</h1><label>Name<input id="name"></label><input type="password" value="hidden-secret"><button id="go">Run</button>',{url:'https://example.org',runScripts:'outside-only'});
  const w=dom.window;let handler,hidden=true;
  w.browser={runtime:{id:'test',onMessage:{addListener(fn){handler=fn;}},sendMessage:async()=>{}}};
  w.Element.prototype.getClientRects=()=>[{width:100,height:20}];
  Object.defineProperty(w.document,'visibilityState',{get:()=>hidden?'hidden':'visible'});
  w.eval(source);const call=m=>handler({channel:'at-safari',...m},{id:'test'});
  return{w,call,show:()=>hidden=false,close:()=>w.close()};
}
test('snapshot omits password controls; fill uses a real input setter and events',async()=>{
  const f=fixture();try{const snap=await f.call({op:'snapshot'});assert.equal(snap.elements.length,2);assert.ok(!JSON.stringify(snap).includes('hidden-secret'));
  let events=0;f.w.document.querySelector('#name').addEventListener('input',()=>events++);
  const r=await f.call({op:'action',deadline:Date.now()+1000,step:{action:'fill',ref:snap.elements[0].ref,value:'test'}});
  assert.equal(r.status,'completed');assert.equal(f.w.document.querySelector('#name').value,'test');assert.equal(events,1);
  }finally{f.close();}
});
test('new snapshot invalidates old refs and visible tab blocks writes',async()=>{
  const f=fixture();try{const s=await f.call({op:'snapshot'});await f.call({op:'snapshot'});
  assert.equal((await f.call({op:'action',deadline:Date.now()+1000,step:{action:'click',ref:s.elements[1].ref}})).reason,'stale_or_invalid_ref');
  f.show();assert.equal((await f.call({op:'action',deadline:Date.now()+1000,step:{action:'scroll'}})).status,'needs_user');
  }finally{f.close();}
});
test('visible challenge pauses; a expired deadline does not click',async()=>{
  const f=fixture();try{const s=await f.call({op:'snapshot'});let clicks=0;f.w.document.querySelector('#go').onclick=()=>clicks++;
  assert.equal((await f.call({op:'action',deadline:Date.now()-1,step:{action:'click',ref:s.elements[1].ref}})).status,'not_started');assert.equal(clicks,0);
  f.w.document.querySelector('h1').innerText='Verify you are human';assert.equal((await f.call({op:'snapshot'})).reason,'challenge');
  }finally{f.close();}
});
test('custom pointer controls and menu items are discoverable and clickable',async()=>{
  const f=fixture();try{
    const custom=f.w.document.createElement('div');custom.style.cursor='pointer';custom.innerText='New document';f.w.document.body.prepend(custom);
    let clicked=0;custom.onclick=()=>clicked++;
    const snap=await f.call({op:'snapshot'});const target=snap.elements.find(e=>e.name==='New document');assert.ok(target);
    assert.equal((await f.call({op:'action',deadline:Date.now()+1000,step:{action:'click',ref:target.ref}})).status,'completed');assert.equal(clicked,1);
  }finally{f.close();}
});

test('match finds a late menu item beyond the control cap and click emits its mouse sequence',async()=>{
  const f=fixture();try{
    for(let i=0;i<130;i++){const b=f.w.document.createElement('button');b.innerText='Other';f.w.document.body.append(b);}
    const item=f.w.document.createElement('li');item.setAttribute('role','menuitem');item.innerText='Document';f.w.document.body.append(item);
    assert.ok(!(await f.call({op:'snapshot'})).elements.some(e=>e.name==='Document'));
    const filtered=await f.call({op:'snapshot',match:'Document'});assert.equal(filtered.elements.length,1);
    const events=[];for(const type of ['mouseover','mouseenter','mousedown','mouseup','click'])item.addEventListener(type,()=>events.push(type));
    await f.call({op:'action',deadline:Date.now()+1000,step:{action:'click',ref:filtered.elements[0].ref}});
    assert.deepEqual(events,['mouseover','mouseenter','mousedown','mouseup','click']);
  }finally{f.close();}
});
