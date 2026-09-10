import http from 'node:http';
import {randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {DEMO_HTML} from './demo.mjs';

export const VERSION = '0.1.0-alpha.1';
export const PROTOCOL = '0.1';
export const DEFAULT_PORT = 19848;
export const runtimeHome = () => process.env.AT_SAFARI_HOME || join(homedir(), 'Library/Application Support/at-safari');
export const equal = (a,b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const secret = () => randomBytes(32).toString('hex');
const fail = (message, status = 400) => Object.assign(new Error(message), {status});

export async function credentials(home = runtimeHome()) {
  await mkdir(home, {recursive:true, mode:0o700});
  const file = join(home, 'broker.json');
  try { await writeFile(file, JSON.stringify({token:secret(), port:DEFAULT_PORT}), {flag:'wx',mode:0o600}); }
  catch(e) { if(e.code !== 'EEXIST') throw e; }
  return JSON.parse(await readFile(file,'utf8'));
}

export class Broker {
  constructor({token, port = DEFAULT_PORT, home, timeoutMs = 20000}) {
    this.token=token; this.port=port; this.home=home; this.timeoutMs=timeoutMs;
    this.clients=new Map(); this.tabs=new Map(); this.jobs=new Map(); this.pairing=null;
    this.server=http.createServer((req,res)=>this.handle(req,res));
  }
  async start() {
    if(this.home) {
      try { for(const c of JSON.parse(await readFile(join(this.home,'clients.json'),'utf8'))) this.clients.set(c.id,c); }
      catch(e) { if(e.code !== 'ENOENT') throw e; }
    }
    await new Promise((resolve,reject)=>{ this.server.once('error',reject); this.server.listen(this.port,'127.0.0.1',resolve); });
    this.port=this.server.address().port;
    return this;
  }
  async close() { for(const j of this.jobs.values()) this.finish(j,{status:'unknown',reason:'bridge_stopped'}); await new Promise(r=>this.server.close(r)); }
  async saveClients() { if(this.home) await writeFile(join(this.home,'clients.json'),JSON.stringify([...this.clients.values()]),{mode:0o600}); }
  finish(job,result) { if(job.result) return; job.result=result; job.finished=Date.now(); clearTimeout(job.timer); job.resolve?.(result); }
  expireJobs() { for(const [id,j] of this.jobs) if(j.finished && Date.now()-j.finished>600000) this.jobs.delete(id); }
  status() { return {version:VERSION,protocol:PROTOCOL,connected:[...this.clients.values()].filter(c=>Date.now()-(c.lastSeen||0)<10000).length,tabs:[...this.tabs.values()].map(t=>({...t,online:Date.now()-t.lastSeen<10000})),capabilities:['assigned-tabs','dom-snapshot','dom-actions','bounded-batch','manual-handoff'],limitations:['No trusted native input','No background screenshots','Writes require an inactive assigned tab','Top frame only']}; }
  async command(input) {
    const {requestId,tabHandle,op,args={}}=input;
    if(typeof requestId!=='string'||requestId.length>100) throw fail('requestId required');
    const fingerprint=JSON.stringify({tabHandle,op,args});
    if(this.jobs.has(requestId)) {
      const job=this.jobs.get(requestId);
      if(job.fingerprint!==fingerprint) throw fail('requestId already used with different arguments',409);
      return job.result || job.promise;
    }
    const tab=this.tabs.get(tabHandle);
    if(!tab || Date.now()-tab.lastSeen>10000) throw fail('Assigned tab is unavailable. Open the extension panel to reconnect.',409);
    if(!['snapshot','execute','navigate'].includes(op)) throw fail('Unsupported operation');
    if(op!=='snapshot' && tab.paused) return {status:'needs_user',reason:tab.reason||'user_takeover',tabHandle};
    if(op==='execute') {
      if(!Array.isArray(args.steps)||args.steps.length<1||args.steps.length>10) throw fail('Use 1–10 steps');
      for(const step of args.steps) if(!step||!['click','fill','select','scroll','wait'].includes(step.action)) throw fail('Invalid step');
    }
    if(op==='navigate') { let u;try{u=new URL(args.url);}catch{throw fail('Invalid URL');} if(u.origin!==tab.origin) throw fail('Navigation requires the assigned origin'); }
    this.expireJobs(); if(this.jobs.size>1000) throw fail('Too many recent requests',429);
    if([...this.jobs.values()].some(j=>j.tabHandle===tabHandle&&!j.result)) throw fail('This tab already has an outstanding request',409);
    const job={requestId,tabHandle,op,args,clientId:tab.clientId,fingerprint,dispatched:false,deadline:Date.now()+this.timeoutMs};
    job.promise=new Promise(r=>job.resolve=r); this.jobs.set(requestId,job);
    job.timer=setTimeout(()=>this.finish(job,{status:job.dispatched?'unknown':'not_started',reason:'timeout',requestId}),this.timeoutMs);
    return job.promise;
  }
  async handle(req,res) {
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      if(req.headers.origin!==undefined) throw fail('Web origins cannot access this native bridge',403);
      if(req.headers.host!==`127.0.0.1:${this.port}`) throw fail('Invalid host',403);
      if(req.method==='GET'&&req.url==='/demo'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'"});res.end(DEMO_HTML);return;}
      if(req.method!=='POST') throw fail('POST required',405);
      let body='',size=0;
      for await(const chunk of req) {size+=chunk.length;if(size>512000)throw fail('Payload too large',413);body+=chunk;}
      let data;try{data=JSON.parse(body||'{}');}catch{throw fail('Invalid JSON');}
      const path=req.url, bearer=req.headers.authorization?.replace(/^Bearer /,'');
      if(path==='/extension/pair') {
        const p=this.pairing;
        if(!p||Date.now()>p.expires||p.attempts>=5) throw fail('Request a new pairing code from the agent',403);
        p.attempts++;
        if(!equal(String(data.code||''),p.code)) throw fail('Invalid pairing code',403);
        if(typeof data.clientId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(data.clientId))throw fail('Invalid extension instance');
        const token=secret();this.clients.set(data.clientId,{id:data.clientId,token,lastSeen:Date.now()});this.pairing=null;await this.saveClients();
        return send(200,{ok:true,token,protocol:PROTOCOL});
      }
      if(path.startsWith('/extension/')) {
        const client=this.clients.get(data.clientId);
        if(!client||!equal(client.token,bearer))throw fail('Not paired',401);
        if(data.protocol!==PROTOCOL)throw fail('Protocol mismatch; update both components',409);
        client.lastSeen=Date.now();
        if(path==='/extension/poll') {
          const handles=new Set();
          for(const item of Array.isArray(data.tabs)?data.tabs.slice(0,50):[]) {
            if(!item||typeof item.handle!=='string'||typeof item.origin!=='string'||typeof item.title!=='string')continue;
            let u;try{u=new URL(item.origin);}catch{continue;}if(!['https:','http:'].includes(u.protocol))continue;
            const handle=`${client.id}:${item.handle}`;handles.add(handle);
            this.tabs.set(handle,{handle,clientId:client.id,localHandle:item.handle,origin:u.origin,title:item.title.slice(0,200),paused:!!item.paused,reason:item.reason||null,lastSeen:Date.now()});
          }
          for(const [h,t] of this.tabs)if(t.clientId===client.id&&!handles.has(h))this.tabs.delete(h);
          let task=null;
          for(const job of this.jobs.values()) {
            if(job.clientId!==client.id||job.result||job.dispatched)continue;
            const tab=this.tabs.get(job.tabHandle);
            if(!tab){this.finish(job,{status:'not_started',reason:'tab_released'});continue;}
            if(job.op!=='snapshot'&&tab.paused){this.finish(job,{status:'needs_user',reason:tab.reason||'user_takeover'});continue;}
            job.dispatched=true;
            task={requestId:job.requestId,handle:tab.localHandle,op:job.op,args:job.args,deadline:job.deadline};break;
          }
          return send(200,{ok:true,task});
        }
        if(path==='/extension/result') {
          const job=this.jobs.get(data.requestId);
          if(!job||job.clientId!==client.id||!job.dispatched)throw fail('Unknown request',404);
          if(!data.result||typeof data.result.status!=='string')throw fail('Invalid result');
          // A late result may aid reconciliation, but never silently erase a reported unknown outcome.
          if(job.result)job.lateResult=data.result;else this.finish(job,data.result);
          return send(200,{ok:true});
        }
        throw fail('Unknown extension endpoint',404);
      }
      if(!equal(this.token,bearer))throw fail('Unauthorized client',401);
      if(path==='/status')return send(200,this.status());
      if(path==='/pairing') {this.pairing={code:randomBytes(6).toString('hex').toUpperCase(),expires:Date.now()+300000,attempts:0};return send(200,{code:this.pairing.code,expiresAt:new Date(this.pairing.expires).toISOString(),instructions:'Open the at-safari Safari extension panel and enter this pairing code. Do not enter it into a webpage.'});}
      if(path==='/command')return send(200,await this.command(data));
      if(path==='/result') {const job=this.jobs.get(data.requestId);if(!job)throw fail('Unknown request',404);return send(200,{result:job.result||{status:'running'},lateResult:job.lateResult});}
      if(path==='/revoke') {this.clients.delete(data.clientId);for(const [h,t]of this.tabs)if(t.clientId===data.clientId)this.tabs.delete(h);for(const j of this.jobs.values())if(j.clientId===data.clientId&&!j.result)this.finish(j,{status:j.dispatched?'unknown':'not_started',reason:'revoked'});await this.saveClients();return send(200,{ok:true});}
      throw fail('Unknown endpoint',404);
    } catch(e) {send(e.status||500,{error:e.message});}
  }
}
