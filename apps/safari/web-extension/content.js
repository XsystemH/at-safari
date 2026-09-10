(() => {
  if(globalThis.__atSafariInstalled)return;globalThis.__atSafariInstalled=true;
  let refs=new Map(),sequence=0,activeSnapshot='',human=false;
  const visible=e=>!!(e.getClientRects().length)&&getComputedStyle(e).visibility!=='hidden';
  const text=e=>(e.getAttribute('aria-label')||e.getAttribute('title')||e.labels?.[0]?.innerText||e.innerText||e.getAttribute('placeholder')||e.getAttribute('alt')||'').trim().slice(0,200);
  const controls='a[href],button,input,textarea,select,[role=button],[role=menuitem],[role=tab],[role=option],[contenteditable=true],[tabindex],[onclick]';
  const actionable=e=>e.matches(controls)||(getComputedStyle(e).cursor==='pointer'&&text(e)&&![...e.children].some(child=>text(child)===text(e)));
  const secretField=e=>e.matches('input[type=password],input[autocomplete*=password],input[autocomplete=one-time-code],input[autocomplete^=cc-]');
  function challenge() {
    const frames=[...document.querySelectorAll('iframe')].filter(visible);
    const frame=frames.some(e=>/challenge|captcha|human verification/i.test(e.title||'')&&!/invisible/i.test(e.title||''));
    const heading=[...document.querySelectorAll('h1,h2,[role=heading]')].filter(visible).map(e=>e.innerText).join(' ');
    return frame||/verify (that )?you are human|verification required|checking your browser|请完成.{0,8}验证|人机验证/i.test(heading);
  }
  function snapshot(match='') {
    if(challenge())return{status:'needs_user',reason:'challenge',message:'Complete verification manually in this Safari tab.'};
    refs=new Map();activeSnapshot=crypto.randomUUID();let count=0;
    const elements=[];
    for(const e of document.querySelectorAll('body *')) {
      if(!visible(e)||!actionable(e)||secretField(e)||e.matches('input[type=hidden]'))continue;
      if(match&&!text(e).includes(match))continue;
      if(count++>=120)break;
      const ref=`${activeSnapshot}:${++sequence}`;refs.set(ref,e);
      elements.push({ref,tag:e.tagName.toLowerCase(),role:e.getAttribute('role')||({A:'link',BUTTON:'button',INPUT:'textbox',TEXTAREA:'textbox',SELECT:'combobox'}[e.tagName]||'textbox'),name:text(e),disabled:!!e.disabled,options:e.tagName==='SELECT'?[...e.options].slice(0,50).map(o=>({label:o.label,value:o.value})):undefined});
    }
    return{status:'completed',url:location.href,title:document.title,snapshotId:activeSnapshot,text:(document.body?.innerText||'').slice(0,16000),elements,limitations:['Top frame only','Input values omitted','DOM events are not native trusted input']};
  }
  for(const type of ['pointerdown','keydown','input'])document.addEventListener(type,e=>{if(e.isTrusted){human=true;void browser.runtime.sendMessage({type:'human_activity'}).catch(()=>{});}},{capture:true,passive:true});
  browser.runtime.onMessage.addListener(async(message,sender)=>{
    if(message?.channel!=='at-safari'||sender.id!==browser.runtime.id)return;
    if(message.op==='snapshot')return snapshot(message.match);
    if(message.op==='resume'){human=false;return{status:'completed'};}
    if(message.op!=='action')return;
    if(human||document.visibilityState==='visible')return{status:'needs_user',reason:'user_takeover'};
    if(challenge())return{status:'needs_user',reason:'challenge'};
    if(Date.now()>message.deadline)return{status:'not_started',reason:'expired'};
    const s=message.step;
    const e=refs.get(s.ref);
    if(s.action!=='scroll'&&(!e||!e.isConnected||secretField(e)))return{status:'not_started',reason:'stale_or_invalid_ref'};
    if(s.action!=='wait'&&e&&(!visible(e)||e.disabled))return{status:'not_started',reason:'element_unavailable'};
    try {
      if(s.action==='click'){
        for(const type of ['mouseover','mouseenter','mousedown','mouseup'])e.dispatchEvent(new MouseEvent(type,{bubbles:type!=='mouseenter',cancelable:true,view:window,button:0}));
        e.click();
      }
      else if(s.action==='fill') {
        if(e.isContentEditable)e.textContent=String(s.value||'');
        else if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement){const proto=e instanceof HTMLInputElement?HTMLInputElement.prototype:HTMLTextAreaElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,String(s.value||''));}
        else return{status:'not_started',reason:'not_editable'};
        e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:String(s.value||'')}));e.dispatchEvent(new Event('change',{bubbles:true}));
      }else if(s.action==='select') {
        if(!(e instanceof HTMLSelectElement)||![...e.options].some(o=>o.value===s.value))return{status:'not_started',reason:'invalid_option'};
        e.value=s.value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
      }else if(s.action==='scroll')window.scrollBy({top:Math.max(-3000,Math.min(3000,s.y||500)),behavior:'instant'});
      else if(s.action==='wait') {
        const end=Math.min(message.deadline,Date.now()+Math.min(s.timeoutMs||1000,5000));
        while(!visible(e)&&Date.now()<end){await new Promise(r=>setTimeout(r,100));if(human||document.visibilityState==='visible')return{status:'needs_user',reason:'user_takeover'};}
        if(!visible(e))return{status:'not_started',reason:'wait_timeout'};
      }else return{status:'not_started',reason:'unsupported_action'};
      return{status:'completed'};
    }catch(e){return{status:'unknown',reason:e.message};}
  });
})();
