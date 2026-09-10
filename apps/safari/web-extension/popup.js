const $=id=>document.getElementById(id);
async function send(data){const r=await browser.runtime.sendMessage(data);if(r?.error)throw new Error(r.error);return r;}
async function act(fn){$('error').textContent='';try{await fn();await render();}catch(e){$('error').textContent=e.message;}}
async function render(){
  const r=await send({type:'status'});
  $('status').textContent=r.connected?'Connected to local agent':r.lastError||'Waiting for local agent';
  $('pairing').hidden=r.connected;$('tabs').replaceChildren();
  for(const [handle,tab]of Object.entries(r.state.tabs)){
    const row=document.createElement('div');row.className='tab';const p=document.createElement('p');p.textContent=`${tab.origin} — ${tab.paused?'Paused: '+tab.reason:'Ready in background'}`;row.append(p);
    for(const [type,label]of [['show','View'],[tab.paused?'resume':'pause',tab.paused?'Resume':'Pause'],['release','Release']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>act(()=>send({type,handle}));row.append(b);}
    $('tabs').append(row);
  }
}
$('pair').onclick=()=>act(()=>send({type:'pair',code:$('code').value}));
$('code').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();$('pair').click();}};
$('assign').onclick=()=>act(async()=>{
  const [tab]=await browser.tabs.query({active:true,currentWindow:true});
  const url=new URL(tab.url);if(!['http:','https:'].includes(url.protocol))throw new Error('Open a normal HTTP(S) webpage first.');
  const granted=await browser.permissions.request({origins:[permissionPattern(url.origin)]});
  if(!granted)throw new Error('Safari site access was not granted.');
  await send({type:'assign',tabId:tab.id});
});
void act(render);
