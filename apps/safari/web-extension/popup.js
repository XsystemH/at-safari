const $=id=>document.getElementById(id);
let assignmentTarget=null;
async function prepareAssignment(){
  const [tab]=await browser.tabs.query({active:true,currentWindow:true});
  if(!tab?.url)throw new Error('Open a normal HTTP(S) webpage first.');
  const url=new URL(tab.url);
  assignmentTarget={tabId:tab.id,origin:url.origin,pattern:permissionPattern(url.origin)};
  assignmentTarget.granted=await browser.permissions.contains({origins:[assignmentTarget.pattern]});
  $('assign').disabled=false;
  $('assign').title=`Allow ${url.origin}`;
}
async function send(data){const r=await browser.runtime.sendMessage(data);if(r?.error)throw new Error(r.error);return r;}
async function act(fn){$('error').textContent='';try{await fn();await render();}catch(e){$('error').textContent=e.message;}}
async function render(){
  const r=await send({type:'status'});
  $('status').textContent=r.connected?'Connected to local agent':r.lastError||'Waiting for local agent';
  $('pairing').hidden=r.connected;$('tabs').replaceChildren();
  if(r.connected&&document.activeElement===document.body)$('assign').focus();
  for(const [handle,tab]of Object.entries(r.state.tabs)){
    const row=document.createElement('div');row.className='tab';const p=document.createElement('p');p.textContent=`${tab.origin} — ${tab.paused?'Paused: '+tab.reason:'Ready in background'}`;row.append(p);
    for(const [type,label]of [['show','View'],[tab.paused?'resume':'pause',tab.paused?'Resume':'Pause'],['release','Release']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>act(()=>send({type,handle}));row.append(b);}
    $('tabs').append(row);
  }
}
$('pair').onclick=()=>act(()=>send({type:'pair',code:$('code').value}));
$('code').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();$('pair').click();}};
$('assign').onclick=()=>{
  const target=assignmentTarget;
  if(!target)return;
  // Safari requires this call in the original click stack, before any await.
  let permission;
  try{permission=target.granted?Promise.resolve(true):browser.permissions.request({origins:[target.pattern]});}
  catch(error){$('error').textContent=error.message;return;}
  return act(async()=>{
    if(!await permission)throw new Error('Safari site access was not granted.');
    await send({type:'assign',tabId:target.tabId,expectedOrigin:target.origin});
  });
};
void act(prepareAssignment);
