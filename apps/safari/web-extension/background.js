/* macOS-only persistent background page; the native handler is the only network client. */
const api = browser;
let state={clientId:'',tabs:{},paired:false}, connected=false, busy=false, lastError='Not paired', loaded;
loaded=(async()=>{
  const saved=await api.storage.local.get('state');
  state=saved.state||state;state.clientId ||= crypto.randomUUID();
  for(const tab of Object.values(state.tabs)){tab.paused=true;tab.reason='reconnected';}
  await save();
})();
const save=()=>api.storage.local.set({state});
async function native(operation,payload={}) {
  const result=await api.runtime.sendNativeMessage('io.github.xsystemh.at-safari',{operation,clientId:state.clientId,protocol:'0.1',...payload});
  if(result.error)throw new Error(result.error);return result;
}
async function pause(tab,reason) {tab.paused=true;tab.reason=reason;await save();}
async function valid(tab,writing=false) {
  const current=await api.tabs.get(tab.tabId);
  if(!current.url||new URL(current.url).origin!==tab.origin) {await pause(tab,'origin_changed');throw new Error('Origin changed; release and assign this tab again.');}
  if(!await api.permissions.contains({origins:[permissionPattern(tab.origin)]})){await pause(tab,'permission_required');throw new Error('Site access is required in Safari settings.');}
  if(writing&&(tab.paused||current.active)){await pause(tab,tab.reason||'user_takeover');throw new Error('needs_user');}
  return current;
}
async function page(tab,message) {
  await api.tabs.executeScript(tab.tabId,{file:'content.js',allFrames:false});
  return api.tabs.sendMessage(tab.tabId,{channel:'at-safari',...message});
}
async function run(task) {
  const tab=state.tabs[task.handle];
  if(!tab)return {status:'not_started',reason:'tab_released'};
  const steps=[];
  try {
    if(Date.now()>task.deadline)return {status:'not_started',reason:'expired'};
    await valid(tab,task.op!=='snapshot');
    if(task.op==='snapshot')return await page(tab,{op:'snapshot'});
    if(task.op==='navigate') {
      if(new URL(task.args.url).origin!==tab.origin)throw new Error('Origin not authorized');
      await api.tabs.update(tab.tabId,{url:task.args.url});
      return {status:'completed',message:'Navigation requested; obtain a fresh snapshot before another action.'};
    }
    for(let i=0;i<task.args.steps.length;i++) {
      if(Date.now()>task.deadline){steps.push({index:i,status:'not_started'});return{status:'not_started',reason:'expired',steps};}
      await valid(tab,true);
      const result=await page(tab,{op:'action',step:task.args.steps[i],deadline:task.deadline});
      steps.push({index:i,...result});
      if(result.status!=='completed') {
        if(result.status==='needs_user')await pause(tab,result.reason);
        return {status:result.status,reason:result.reason,steps,remaining:task.args.steps.length-i-1};
      }
    }
    return {status:'completed',steps};
  }catch(e){return{status:e.message==='needs_user'?'needs_user':'unknown',reason:tab.reason||e.message,steps,message:'Inspect the page before repeating any side effect.'};}
}
async function poll() {
  await loaded;if(busy||!state.paired)return;busy=true;
  try {
    const tabs=[];
    for(const [handle,tab]of Object.entries(state.tabs)) {
      try {const current=await api.tabs.get(tab.tabId);tabs.push({handle,title:current.title||tab.origin,origin:tab.origin,paused:tab.paused,reason:tab.reason});}
      catch{delete state.tabs[handle];await save();}
    }
    const answer=await native('poll',{tabs});connected=true;lastError='';
    if(answer.task){const result=await run(answer.task);await native('result',{requestId:answer.task.requestId,result});}
  }catch(e){connected=false;lastError=e.message;}finally{busy=false;}
}
api.tabs.onActivated.addListener(async info=>{await loaded;for(const tab of Object.values(state.tabs))if(tab.tabId===info.tabId)await pause(tab,'user_takeover');});
api.tabs.onUpdated.addListener(async(id,change)=>{await loaded;for(const tab of Object.values(state.tabs))if(tab.tabId===id&&change.url&&new URL(change.url).origin!==tab.origin)await pause(tab,'origin_changed');});
api.tabs.onRemoved.addListener(async id=>{await loaded;for(const[h,t]of Object.entries(state.tabs))if(t.tabId===id)delete state.tabs[h];await save();});
api.runtime.onMessage.addListener(async(message,sender)=>{
  await loaded;
  if(sender.id!==api.runtime.id)return;
  if(sender.tab) {
    if(message?.type==='human_activity')for(const tab of Object.values(state.tabs))if(tab.tabId===sender.tab.id)await pause(tab,'user_takeover');
    return;
  }
  // Control messages are accepted only from our own extension popup, never from webpage scripts.
  if(sender.url!==api.runtime.getURL('popup.html'))return;
  try {
    if(message.type==='status')return{connected,lastError,state};
    if(message.type==='pair'){await native('pair',{code:String(message.code).trim().toUpperCase()});state.paired=true;await save();void poll();return{ok:true};}
    if(message.type==='assign') {
      const current=await api.tabs.get(message.tabId),url=new URL(current.url);
      if(!['https:','http:'].includes(url.protocol))throw new Error('Only HTTP(S) pages can be assigned');
      if(!current.active||url.origin!==message.expectedOrigin)throw new Error('The tab changed. Reopen this popup and allow it again.');
      for(const [h,t]of Object.entries(state.tabs))if(t.tabId===current.id)delete state.tabs[h];
      const handle=crypto.randomUUID();state.tabs[handle]={tabId:current.id,origin:url.origin,paused:false,reason:null};await save();void poll();return{ok:true};
    }
    const tab=state.tabs[message.handle];if(!tab)throw new Error('Tab is no longer assigned');
    if(message.type==='pause')await pause(tab,'user_takeover');
    if(message.type==='release'){delete state.tabs[message.handle];await save();}
    if(message.type==='show'){await pause(tab,'user_takeover');await api.tabs.update(tab.tabId,{active:true});}
    if(message.type==='resume') {
      await valid(tab,false);const snapshot=await page(tab,{op:'snapshot'});
      if(snapshot.status==='needs_user')throw new Error('Verification is still visible. Complete it before resuming.');
      if(snapshot.status!=='completed')throw new Error('Could not verify the page');
      tab.paused=false;tab.reason=null;await page(tab,{op:'resume'});await save();
    }
    void poll();return{ok:true};
  }catch(e){return{error:e.message};}
});
setInterval(poll,1000);void poll();
