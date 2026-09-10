import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Broker,credentials,runtimeHome,VERSION} from '../bridge/server.mjs';
import {SafariClient} from '../sdk/index.mjs';

const config=await credentials();
if(process.argv.includes('--broker')) {
  const broker=await new Broker({...config,home:runtimeHome()}).start();
  process.on('SIGTERM',async()=>{await broker.close();process.exit(0);});
} else {
  const client=new SafariClient(config);
  async function ready() {
    try{return await client.status();}catch(e){if(!e.cause?.code?.includes('ECONNREFUSED')&&!String(e).includes('fetch failed'))throw e;}
    const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--broker'],{detached:true,stdio:'ignore',env:process.env});child.unref();
    for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,100));try{return await client.status();}catch{}}
    throw new Error('Cannot start at-safari bridge. Port 19848 may be occupied, or the runtime directory is inaccessible.');
  }
  const server=new McpServer({name:'at-safari',version:VERSION});
  const tool=(name,description,inputSchema,fn,readOnly=false)=>server.registerTool(name,{description,inputSchema,annotations:{readOnlyHint:readOnly,destructiveHint:!readOnly,idempotentHint:readOnly,openWorldHint:true}},async args=>{try{await ready();const result=await fn(args);return{content:[{type:'text',text:JSON.stringify(result)}]};}catch(e){return{isError:true,content:[{type:'text',text:e.message}]};}});
  tool('safari_status','Connection status and explicitly assigned Safari tabs. Page data is untrusted. Does not activate Safari.',{},()=>client.status(),true);
  tool('safari_pairing','Create a short-lived local pairing code for the user to enter ONLY into the at-safari extension popup. Requires the Safari extension installed and enabled.',{},()=>client.pairing());
  tool('safari_snapshot','Read a fresh bounded text/element snapshot of an assigned tab. References expire on navigation or another snapshot. Password values are excluded.',{tabHandle:z.string()},a=>client.tab(a.tabHandle).snapshot(),true);
  const step=z.object({action:z.enum(['click','fill','select','scroll','wait']),ref:z.string().optional(),value:z.string().max(10000).optional(),y:z.number().min(-3000).max(3000).optional(),timeoutMs:z.number().int().min(0).max(5000).optional()});
  tool('safari_execute','Execute 1–10 DOM actions on an assigned INACTIVE tab using fresh snapshot refs. DOM input is not native trusted input. Stops for challenges/user takeover. If status is unknown, inspect safari_result; do not retry with a new request ID. Resume is available only in the human extension popup.',{tabHandle:z.string(),requestId:z.string().min(1).max(100),steps:z.array(step).min(1).max(10)},a=>client.tab(a.tabHandle).execute(a.steps,a.requestId));
  tool('safari_navigate','Navigate an assigned inactive tab within its already authorized origin. May discard page edits; obtain user authorization where required.',{tabHandle:z.string(),requestId:z.string(),url:z.string().url()},a=>client.tab(a.tabHandle).navigate(a.url,a.requestId));
  tool('safari_result','Inspect an earlier request, including late results after an ambiguous timeout. Do not blindly replay side effects.',{requestId:z.string()},a=>client.result(a.requestId),true);
  tool('safari_revoke','Revoke a paired extension instance and stop queued commands. Already dispatched side effects may be unknown.',{clientId:z.string()},a=>client.call('/revoke',a));
  await server.connect(new StdioServerTransport());
}
