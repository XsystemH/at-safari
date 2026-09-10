import {randomUUID} from 'node:crypto';
export class SafariClient {
  constructor({port=19848,token}) {this.port=port;this.token=token;}
  async call(path,data={}) {
    const res=await fetch(`http://127.0.0.1:${this.port}${path}`,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(25000)});
    const value=await res.json();if(!res.ok)throw new Error(value.error||`HTTP ${res.status}`);return value;
  }
  status(){return this.call('/status');}
  pairing(){return this.call('/pairing');}
  findTabs(domain){return this.call('/command',{requestId:randomUUID(),op:'tabs',args:{domain}});}
  open(url,requestId){return this.call('/command',{requestId,op:'open',args:{url}});}
  result(requestId){return this.call('/result',{requestId});}
  tab(handle){const run=(op,args,requestId=randomUUID())=>this.call('/command',{requestId,tabHandle:handle,op,args});return {snapshot:(match)=>run('snapshot',{match}),execute:(steps,requestId)=>run('execute',{steps},requestId),navigate:(url,requestId)=>run('navigate',{url},requestId)};}
}
